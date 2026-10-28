import { SuperSonic } from "supersonic-scsynth";
import { sonic } from "../engine/boot";
import { ar, def, kr } from "../engine/def";
import { tone, watchTone } from "../synth/tone";

const name = "note";

const defaults = {
  freq: 220,
  cutoff: 1400,
  resonance: 0.2,
  attack: 0.08,
  decay: 0.4,
  detune: 0.12,
};

const hz = Array.from({ length: 24 }, (_, i) => 440 * 2 ** ((48 + i - 69) / 12));

type Ring = { id: number; at: number; attack: number; decay: number };

let chain: Promise<void> = Promise.resolve();
let group = 0;
let loaded = false;
const live: Ring[] = [];

function queue(job: () => Promise<void>) {
  const run = chain.then(job);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function ends(item: Ring) {
  return item.at + item.attack + item.decay + 0.08;
}

function drop(now: number) {
  for (let i = live.length - 1; i >= 0; i--) {
    if (ends(live[i]) < now) live.splice(i, 1);
  }
}

watchTone((key, value) => {
  const engine = sonic();
  const clock = engine?.clock;
  const audio = engine?.audioContext;
  if (!engine?.initialized || !audio || !clock) return;
  const now = audio.currentTime;
  for (const item of live) {
    if (key === "attack") item.attack = value;
    if (key === "decay") item.decay = value;
    if (item.at <= now) {
      engine.send("/n_set", item.id, key, value);
      continue;
    }
    engine.sendOSC(SuperSonic.osc.encodeBundle(clock.nowAt(item.at + 0.002), [[
      "/n_set", item.id, key, value,
    ]]));
  }
  drop(now);
});

function build() {
  return def(name, defaults, ({ k, ctl, add }) => {
    const freq = ctl(0);
    const res = add("Lag", kr, 0, [ctl(2), k(0.015)], [kr]);
    const attack = add("Clip", kr, 0, [ctl(3), k(0.001), k(2)], [kr]);
    const decay = add("Clip", kr, 0, [ctl(4), k(0.01), k(3)], [kr]);
    const det = add("Lag", kr, 0, [ctl(5), k(0.015)], [kr]);
    const dipped = add("BinaryOpUGen", kr, 2, [res, k(0.95)], [kr]);
    const rq = add("Clip", kr, 0, [add("BinaryOpUGen", kr, 1, [k(1), dipped], [kr]), k(0.05), k(1)], [kr]);
    const cut = add("Clip", ar, 0, [add("Lag", ar, 0, [ctl(1), k(0.015)], [ar]), k(60), k(14000)], [ar]);
    const wide = add("BinaryOpUGen", kr, 2, [det, det], [kr]);
    const ratio = add("BinaryOpUGen", kr, 0, [k(1), wide], [kr]);
    const freq2 = add("BinaryOpUGen", kr, 2, [freq, ratio], [kr]);
    const saw1 = add("Saw", ar, 0, [freq], [ar]);
    const saw2 = add("Saw", ar, 0, [freq2], [ar]);
    const saws = add("BinaryOpUGen", ar, 0, [saw1, saw2], [ar]);
    const sawMix = add("BinaryOpUGen", ar, 2, [saws, k(0.18)], [ar]);
    const sub = add("SinOsc", ar, 0, [add("BinaryOpUGen", kr, 2, [freq, k(0.5)], [kr]), k(0)], [ar]);
    const subMix = add("BinaryOpUGen", ar, 2, [sub, k(0.1)], [ar]);
    const mix = add("BinaryOpUGen", ar, 0, [sawMix, subMix], [ar]);
    const filtered = add("RLPF", ar, 0, [mix, cut, rq], [ar]);
    const amp = add("EnvGen", kr, 0, [
      k(1), k(1), k(0), k(1), k(2),
      k(0), k(2), k(-99), k(-99),
      k(1), attack, k(1), k(0),
      k(0), decay, k(1), k(0),
    ], [kr]);
    const trim = add("BinaryOpUGen", kr, 1, [k(1), add("BinaryOpUGen", kr, 2, [res, k(0.4)], [kr])], [kr]);
    const voiced = add("BinaryOpUGen", ar, 2, [filtered, amp], [ar]);
    const shaped = add("BinaryOpUGen", ar, 2, [voiced, trim], [ar]);
    const sig = add("BinaryOpUGen", ar, 2, [shaped, k(0.5)], [ar]);
    add("Out", ar, 0, [k(0), sig, sig], []);
  });
}

export function arm() {
  return queue(async () => {
    const engine = sonic();
    if (!engine?.initialized) throw new Error("off");
    if (!loaded) {
      await engine.loadSynthDef(build());
      await engine.sync();
      loaded = true;
    }
    if (!group) {
      group = engine.nextNodeId();
      engine.send("/g_new", group, 0, 0);
      await engine.sync();
    }
  });
}

export function cut() {
  live.length = 0;
  return queue(async () => {
    const engine = sonic();
    if (!engine?.initialized || !group) return;
    await engine.purge();
    engine.send("/g_freeAll", group);
  });
}

function blip(freq: number, at: number, hold?: number) {
  const engine = sonic();
  const clock = engine?.clock;
  if (!engine?.initialized || !clock || !group || !Number.isFinite(freq)) return;
  const id = engine.nextNodeId();
  const toneHz = Math.max(20, Math.min(12000, freq));
  const attack = tone.attack;
  const decay = hold ?? tone.decay;
  drop(engine.audioContext?.currentTime ?? at);
  live.push({ id, at, attack, decay });
  engine.sendOSC(SuperSonic.osc.encodeBundle(clock.nowAt(at), [[
    "/s_new", name, id, 0, group,
    "freq", toneHz,
    "cutoff", tone.cutoff,
    "resonance", tone.resonance,
    "attack", attack,
    "decay", decay,
    "detune", tone.detune,
  ]]));
}

export function hit(pitch: number, at: number, hold?: number) {
  const freq = hz[Math.max(0, Math.min(23, pitch))] ?? hz[0];
  blip(freq, at, hold);
}

export function toneNote(freq: number, at: number, hold?: number) {
  blip(freq, at, hold);
}
