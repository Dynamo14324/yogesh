import type { Inference, LiveContext } from "./context-builder";

export type GuidanceOutput = {
  dialogue: string;
  guidance: string[];
  confidence: number;
  fallbackUsed: boolean;
  safetyNotes: string[];
};

export type AgentMutationEvent = {
  type: "highlight-node" | "focus-region" | "set-ui-mode" | "enqueue-toast";
  payload: Record<string, unknown>;
  priority: "low" | "normal" | "high";
};

export type MutationHook = (event: AgentMutationEvent) => void;

export type GuideAgentOptions = {
  minConfidenceForAssertiveOutput?: number;
  maxGuidanceItems?: number;
};

const DEFAULT_OPTIONS: Required<GuideAgentOptions> = {
  minConfidenceForAssertiveOutput: 0.6,
  maxGuidanceItems: 3,
};

export class GuideAgent {
  private readonly opts: Required<GuideAgentOptions>;
  private mutationHook?: MutationHook;

  constructor(options: GuideAgentOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  onMutation(hook: MutationHook): void {
    this.mutationHook = hook;
  }

  respond(context: LiveContext): GuidanceOutput {
    const safetyNotes: string[] = [];
    const confidence = Math.min(context.inferredIntent.confidence, context.trajectory.trend.confidence);

    if (context.uncertaintyFlags.length > 0) {
      safetyNotes.push(`Uncertainty flags: ${context.uncertaintyFlags.join(", ")}`);
    }

    if (confidence < this.opts.minConfidenceForAssertiveOutput) {
      return this.safeFallback(context, confidence, safetyNotes);
    }

    const dialogue = this.composeDialogue(context.inferredIntent, context.trajectory.trend);
    const guidance = this.predictiveGuidance(context).slice(0, this.opts.maxGuidanceItems);

    this.emitNonBlocking({
      type: "focus-region",
      payload: { regionId: context.trajectory.dominantRegionId ?? context.scene.regionId },
      priority: "normal",
    });

    if (context.scene.activeNodeId) {
      this.emitNonBlocking({
        type: "highlight-node",
        payload: { nodeId: context.scene.activeNodeId },
        priority: "low",
      });
    }

    return {
      dialogue,
      guidance,
      confidence,
      fallbackUsed: false,
      safetyNotes,
    };
  }

  private safeFallback(context: LiveContext, confidence: number, safetyNotes: string[]): GuidanceOutput {
    safetyNotes.push("Using cautious fallback due to low-confidence inference.");

    this.emitNonBlocking({
      type: "enqueue-toast",
      payload: { message: "Need a bit more movement/context to personalize guidance." },
      priority: "low",
    });

    return {
      dialogue: "I can give better guidance once I observe a bit more of your path. For now, let's orient together.",
      guidance: [
        "Pan slightly to reveal nearby connected nodes.",
        "Pause on an interesting node for a moment so I can infer intent more reliably.",
      ],
      confidence,
      fallbackUsed: true,
      safetyNotes,
    };
  }

  private composeDialogue(intent: Inference<string>, trend: Inference<string>): string {
    return `You're currently in ${intent.value.replaceAll("_", " ")} mode; movement suggests ${trend.value.replaceAll(
      "_",
      " ",
    )}.`;
  }

  private predictiveGuidance(context: LiveContext): string[] {
    const region = context.trajectory.dominantRegionId ?? context.scene.regionId ?? "this area";
    const topNeighbor = context.scene.edges.find((edge) => edge.source === context.scene.activeNodeId)?.target;

    return [
      `Continue through ${region}; it's where your dwell-time signal is strongest.`,
      topNeighbor ? `Inspect linked node ${topNeighbor} next for likely continuity.` : "Inspect a directly connected node next.",
      "If your goal changed, switch to inspect mode to tighten future guidance.",
    ];
  }

  private emitNonBlocking(event: AgentMutationEvent): void {
    if (!this.mutationHook) return;
    queueMicrotask(() => {
      this.mutationHook?.(event);
    });
  }
}
