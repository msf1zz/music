import { SuperSonic } from "supersonic-scsynth";

export type EngineState = "idle" | "loading" | "ready" | "error";

let engine: SuperSonic | null = null;
let level: GainNode | null = null;
let pending: Promise<void> | null = null;

export function sonic() {
  return engine;
}

export function volume(amount: number) {
  if (!level) return;
  const next = Math.min(1, Math.max(0, amount));
  level.gain.setTargetAtTime(next, level.context.currentTime, 0.03);
}

export function boot(amount: number) {
  if (engine?.initialized) return Promise.resolve();
  if (pending) return pending;
  pending = run(amount).finally(() => {
    pending = null;
  });
  return pending;
}

async function run(amount: number) {
  const audio = new AudioContext({ latencyHint: "interactive" });
  void audio.resume();
  const next = new SuperSonic({
    audioContext: audio,
    autoConnect: false,
    workerBaseURL: "/engine/workers/",
    coreBaseURL: "/engine/core/",
    wasmBaseURL: "/engine/core/wasm/",
  });
  try {
    await next.init();
    const output = audio.createGain();
    output.gain.value = Math.min(1, Math.max(0, amount));
    const node = next.node;
    if (!node) throw new Error("no node");
    (node.connect as unknown as (dest: AudioNode) => void)(output);
    output.connect(audio.destination);
    engine = next;
    level = output;
  } catch (error) {
    await audio.close().catch(() => undefined);
    throw error;
  }
}
