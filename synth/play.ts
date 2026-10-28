import { sonic } from "../engine/boot";
import { build, defaults, name } from "./build";
import { setTone, tone, type KnobName } from "./tone";

export type { KnobName };
let node = 0;
let loaded = false;
let arming: Promise<void> | null = null;
let playing: Promise<void> | null = null;

async function prep() {
  const engine = sonic();
  if (!engine?.initialized || loaded) return;
  if (!arming) {
    arming = (async () => {
      try {
        await engine.loadSynthDef(build());
        await engine.sync();
        loaded = true;
      } catch (error) {
        arming = null;
        throw error;
      }
    })();
  }
  await arming;
}

export function play() {
  if (playing) return playing;
  playing = run().finally(() => {
    playing = null;
  });
  return playing;
}

async function run() {
  const engine = sonic();
  if (!engine?.initialized) return;
  await prep();
  if (node) {
    engine.send("/n_set", node, "gate", 1);
    return;
  }
  node = engine.nextNodeId();
  const controls: (string | number)[] = [];
  for (const key of Object.keys(defaults) as KnobName[]) {
    controls.push(key, tone[key]);
  }
  controls.push("gate", 1);
  engine.send("/s_new", name, node, 0, 0, ...controls);
}

export function tweak(key: KnobName, value: number) {
  setTone(key, value);
  const engine = sonic();
  if (!engine?.initialized || !node) return;
  engine.send("/n_set", node, key, value);
}

export function voiceId() {
  return node;
}

export function hush() {
  const engine = sonic();
  if (!engine?.initialized || !node) return;
  engine.send("/n_set", node, "gate", 0);
}
