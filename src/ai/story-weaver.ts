import type { LiveContext } from "./context-builder";
import type { AgentMutationEvent, MutationHook } from "./guide-agent";

export type NarrativeOverlay = {
  regionId?: string;
  title: string;
  body: string;
  mood: "neutral" | "curious" | "urgent";
  confidence: number;
  fallbackUsed: boolean;
  safetyNotes: string[];
};

export type StoryWeaverOptions = {
  minNarrativeConfidence?: number;
};

const DEFAULT_OPTIONS: Required<StoryWeaverOptions> = {
  minNarrativeConfidence: 0.58,
};

export class StoryWeaver {
  private readonly opts: Required<StoryWeaverOptions>;
  private mutationHook?: MutationHook;

  constructor(options: StoryWeaverOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  onMutation(hook: MutationHook): void {
    this.mutationHook = hook;
  }

  weave(context: LiveContext): NarrativeOverlay {
    const confidence = (context.inferredIntent.confidence + context.trajectory.trend.confidence) / 2;
    const regionId = context.scene.regionId ?? context.trajectory.dominantRegionId;

    if (confidence < this.opts.minNarrativeConfidence || context.uncertaintyFlags.length > 0) {
      return this.fallbackOverlay(regionId, confidence, context.uncertaintyFlags);
    }

    const title = this.titleForRegion(regionId);
    const body = this.bodyForRegion(regionId, context.inferredIntent.value, context.trajectory.trend.value);

    this.emitNonBlocking({
      type: "set-ui-mode",
      payload: { mode: "narrative-overlay", source: "story-weaver" },
      priority: "normal",
    });

    return {
      regionId,
      title,
      body,
      mood: context.trajectory.trend.value === "exploring_quickly" ? "urgent" : "curious",
      confidence,
      fallbackUsed: false,
      safetyNotes: [],
    };
  }

  private fallbackOverlay(regionId: string | undefined, confidence: number, uncertaintyFlags: string[]): NarrativeOverlay {
    const safetyNotes = ["Narrative fallback used due to uncertainty.", ...uncertaintyFlags];

    this.emitNonBlocking({
      type: "enqueue-toast",
      payload: { message: "Showing a neutral story overlay while signals stabilize." },
      priority: "low",
    });

    return {
      regionId,
      title: "Scene in progress",
      body: "You're traversing connected ideas. Hold on a node or region to unlock a richer, personalized narrative.",
      mood: "neutral",
      confidence,
      fallbackUsed: true,
      safetyNotes,
    };
  }

  private titleForRegion(regionId?: string): string {
    if (!regionId) return "Emergent thread";
    return `Thread: ${regionId}`;
  }

  private bodyForRegion(regionId: string | undefined, intent: string, trend: string): string {
    const regionLabel = regionId ?? "this graph segment";
    return `In ${regionLabel}, your ${intent.replaceAll("_", " ")} intent meets a ${trend.replaceAll(
      "_",
      " ",
    )} path. The nearby links suggest a coherent branch worth following.`;
  }

  private emitNonBlocking(event: AgentMutationEvent): void {
    if (!this.mutationHook) return;
    setTimeout(() => {
      this.mutationHook?.(event);
    }, 0);
  }
}
