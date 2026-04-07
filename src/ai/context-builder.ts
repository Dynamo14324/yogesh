export type Vec3 = { x: number; y: number; z: number };

export type SceneNode = {
  id: string;
  label?: string;
  regionId?: string;
  metadata?: Record<string, unknown>;
};

export type SceneEdge = {
  id: string;
  source: string;
  target: string;
  weight?: number;
};

export type SceneState = {
  nowMs: number;
  activeNodeId?: string;
  regionId?: string;
  cameraPosition?: Vec3;
  nodes: SceneNode[];
  edges: SceneEdge[];
  uiMode?: string;
};

export type TrajectorySample = {
  tsMs: number;
  nodeId?: string;
  regionId?: string;
  position?: Vec3;
  speed?: number;
};

export type UserProfile = {
  userId: string;
  preferences?: string[];
  knownTopics?: string[];
  riskTolerance?: "low" | "medium" | "high";
  accessibilityNeeds?: string[];
};

export type Inference<T = unknown> = {
  kind: string;
  value: T;
  confidence: number;
  rationale?: string;
};

export type LiveContext = {
  scene: SceneState;
  trajectory: {
    samples: TrajectorySample[];
    dominantRegionId?: string;
    dwellMsByRegion: Record<string, number>;
    trend: Inference<string>;
  };
  profile: UserProfile;
  inferredIntent: Inference<string>;
  uncertaintyFlags: string[];
};

export type ContextBuilderOptions = {
  maxSamples?: number;
  lowConfidenceThreshold?: number;
};

const DEFAULT_OPTIONS: Required<ContextBuilderOptions> = {
  maxSamples: 120,
  lowConfidenceThreshold: 0.55,
};

export class ContextBuilder {
  private readonly opts: Required<ContextBuilderOptions>;

  constructor(options: ContextBuilderOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
  }

  build(scene: SceneState, trajectory: TrajectorySample[], profile: UserProfile): LiveContext {
    const trimmedTrajectory = trajectory.slice(-this.opts.maxSamples);
    const dwellMsByRegion = this.computeRegionDwell(trimmedTrajectory);
    const dominantRegionId = this.pickDominantRegion(dwellMsByRegion);
    const trend = this.inferTrend(trimmedTrajectory);
    const inferredIntent = this.inferIntent(scene, trend, profile);

    const uncertaintyFlags: string[] = [];
    if (inferredIntent.confidence < this.opts.lowConfidenceThreshold) {
      uncertaintyFlags.push("intent_low_confidence");
    }
    if (!scene.activeNodeId) {
      uncertaintyFlags.push("missing_active_node");
    }
    if (!dominantRegionId) {
      uncertaintyFlags.push("insufficient_trajectory_region_data");
    }

    return {
      scene,
      trajectory: {
        samples: trimmedTrajectory,
        dominantRegionId,
        dwellMsByRegion,
        trend,
      },
      profile,
      inferredIntent,
      uncertaintyFlags,
    };
  }

  private computeRegionDwell(samples: TrajectorySample[]): Record<string, number> {
    const dwell: Record<string, number> = {};
    for (let i = 1; i < samples.length; i += 1) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const regionId = curr.regionId ?? prev.regionId;
      if (!regionId) continue;
      const delta = Math.max(0, curr.tsMs - prev.tsMs);
      dwell[regionId] = (dwell[regionId] ?? 0) + delta;
    }
    return dwell;
  }

  private pickDominantRegion(dwellMsByRegion: Record<string, number>): string | undefined {
    return Object.entries(dwellMsByRegion)
      .sort((a, b) => b[1] - a[1])
      .at(0)?.[0];
  }

  private inferTrend(samples: TrajectorySample[]): Inference<string> {
    if (samples.length < 3) {
      return {
        kind: "movement_trend",
        value: "insufficient_data",
        confidence: 0.3,
        rationale: "Need at least three samples to estimate trend.",
      };
    }

    const recent = samples.slice(-8);
    const meanSpeed =
      recent.reduce((acc, sample) => acc + (sample.speed ?? 0), 0) / Math.max(1, recent.length);

    const value = meanSpeed > 1.5 ? "exploring_quickly" : meanSpeed > 0.4 ? "steady_scan" : "focused_dwell";
    const confidence = Math.min(0.92, 0.45 + recent.length * 0.05);

    return {
      kind: "movement_trend",
      value,
      confidence,
      rationale: `Estimated from ${recent.length} recent samples and mean speed ${meanSpeed.toFixed(2)}.`,
    };
  }

  private inferIntent(scene: SceneState, trend: Inference<string>, profile: UserProfile): Inference<string> {
    const preferred = profile.preferences ?? [];
    const knownTopics = profile.knownTopics ?? [];

    let value = "orientation";
    let confidence = 0.52;

    if (scene.uiMode === "inspect" || trend.value === "focused_dwell") {
      value = "deep_inspection";
      confidence += 0.2;
    }

    if (preferred.includes("story") || knownTopics.length > 4) {
      value = value === "deep_inspection" ? "deep_inspection_with_context" : "contextual_discovery";
      confidence += 0.1;
    }

    return {
      kind: "intent",
      value,
      confidence: Math.min(confidence, 0.95),
      rationale: "Derived from ui mode, movement trend, and profile priors.",
    };
  }
}
