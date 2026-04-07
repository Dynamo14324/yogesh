import { useEffect, useRef } from 'react';
import { RealityEngine } from '@engine/reality-engine';

export function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new RealityEngine(containerRef.current);
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  return (
    <main className="app-shell">
      <header>
        <h1>Reality Engine</h1>
        <p>Adaptive real-time rendering scaffold with strict TypeScript architecture.</p>
      </header>
      <section ref={containerRef} className="viewport" />
    </main>
  );
}
