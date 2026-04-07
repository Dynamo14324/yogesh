import { createRenderingContext, type RenderingContext } from '@engine/rendering/renderer';

type EngineState = 'idle' | 'running' | 'degraded' | 'stopped';

interface InputStreamSnapshot {
  pointerX: number;
  pointerY: number;
  lastUpdatedAt: number;
}

export class RealityEngine {
  private readonly host: HTMLElement;
  private rendering: RenderingContext | null = null;
  private rafId: number | null = null;
  private state: EngineState = 'idle';
  private input: InputStreamSnapshot = {
    pointerX: 0,
    pointerY: 0,
    lastUpdatedAt: Date.now(),
  };

  constructor(host: HTMLElement) {
    this.host = host;
  }

  start() {
    if (this.state === 'running') return;

    this.rendering = createRenderingContext(this.host);
    this.attachInputStreams();
    this.attachResizeStream();
    this.transitionTo('running');
    this.loop();
  }

  stop() {
    if (!this.rendering) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.detachInputStreams();
    this.rendering.dispose();
    this.rendering = null;
    this.transitionTo('stopped');
  }

  private loop = () => {
    if (!this.rendering || this.state === 'stopped') return;

    const deltaSeconds = 1 / 60;
    this.adaptState();
    this.rendering.tick(deltaSeconds);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private adaptState() {
    const staleInput = Date.now() - this.input.lastUpdatedAt > 5000;
    this.transitionTo(staleInput ? 'degraded' : 'running');
  }

  private onPointerMove = (event: PointerEvent) => {
    this.input = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      lastUpdatedAt: Date.now(),
    };
  };

  private onResize = () => {
    if (!this.rendering) return;
    this.rendering.resize(this.host.clientWidth, this.host.clientHeight);
  };

  private attachInputStreams() {
    this.host.addEventListener('pointermove', this.onPointerMove);
  }

  private detachInputStreams() {
    this.host.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('resize', this.onResize);
  }

  private attachResizeStream() {
    window.addEventListener('resize', this.onResize);
  }

  private transitionTo(next: EngineState) {
    this.state = next;
  }
}
