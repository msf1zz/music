import { sonic } from "../engine/boot";
import { ar, def, kr, type Wire } from "../engine/def";

const delayName = "delay";
const verbName = "verb";

export const delayDefaults = {
  time: 0.28,
  feedback: 0.35,
  mix: 0.22,
};

export const verbDefaults = {
  room: 0.62,
  mix: 0.28,
};

const delayNow = { ...delayDefaults };
const verbNow = { ...verbDefaults };

let delayId = 0;
let verbId = 0;
let opening: Promise<void> | null = null;

function ear(w: Wire, o: number): Wire {
  return { u: w.u, o };
}

function delayDef() {
  return def(delayName, delayDefaults, ({ k, ctl, add }) => {
    const input = add("In", ar, 0, [k(0)], [ar, ar]);
    const back = add("LocalIn", ar, 0, [k(0), k(0)], [ar, ar]);
    const time = add("Clip", kr, 0, [add("Lag", kr, 0, [ctl(0), k(0.05)], [kr]), k(0.01), k(1.5)], [kr]);
    const feedback = add("Clip", kr, 0, [add("Lag", kr, 0, [ctl(1), k(0.05)], [kr]), k(0), k(0.92)], [kr]);
    const mix = add("Clip", kr, 0, [add("Lag", kr, 0, [ctl(2), k(0.03)], [kr]), k(0), k(1)], [kr]);
    const dry = add("BinaryOpUGen", kr, 1, [k(1), mix], [kr]);
    const leftIn = ear(input, 0);
    const rightIn = ear(input, 1);
    const leftFb = add("BinaryOpUGen", ar, 2, [ear(back, 0), feedback], [ar]);
    const rightFb = add("BinaryOpUGen", ar, 2, [ear(back, 1), feedback], [ar]);
    const leftDel = add("DelayC", ar, 0, [add("BinaryOpUGen", ar, 0, [leftIn, leftFb], [ar]), k(2), time], [ar]);
    const rightDel = add("DelayC", ar, 0, [add("BinaryOpUGen", ar, 0, [rightIn, rightFb], [ar]), k(2), time], [ar]);
    add("LocalOut", ar, 0, [leftDel, rightDel], []);
    const left = add("BinaryOpUGen", ar, 0, [
      add("BinaryOpUGen", ar, 2, [leftIn, dry], [ar]),
      add("BinaryOpUGen", ar, 2, [leftDel, mix], [ar]),
    ], [ar]);
    const right = add("BinaryOpUGen", ar, 0, [
      add("BinaryOpUGen", ar, 2, [rightIn, dry], [ar]),
      add("BinaryOpUGen", ar, 2, [rightDel, mix], [ar]),
    ], [ar]);
    add("ReplaceOut", ar, 0, [k(0), left, right], []);
  });
}

function verbDef() {
  return def(verbName, verbDefaults, ({ k, ctl, add }) => {
    const input = add("In", ar, 0, [k(0)], [ar, ar]);
    const room = add("Clip", kr, 0, [add("Lag", kr, 0, [ctl(0), k(0.05)], [kr]), k(0.01), k(0.98)], [kr]);
    const mix = add("Clip", kr, 0, [add("Lag", kr, 0, [ctl(1), k(0.03)], [kr]), k(0), k(1)], [kr]);
    const wet = add("FreeVerb2", ar, 0, [ear(input, 0), ear(input, 1), k(1), room, k(0.4)], [ar, ar]);
    const dry = add("BinaryOpUGen", kr, 1, [k(1), mix], [kr]);
    const leftWet = add("BinaryOpUGen", ar, 2, [ear(wet, 0), k(0.7)], [ar]);
    const rightWet = add("BinaryOpUGen", ar, 2, [ear(wet, 1), k(0.7)], [ar]);
    const left = add("BinaryOpUGen", ar, 0, [
      add("BinaryOpUGen", ar, 2, [ear(input, 0), dry], [ar]),
      add("BinaryOpUGen", ar, 2, [leftWet, mix], [ar]),
    ], [ar]);
    const right = add("BinaryOpUGen", ar, 0, [
      add("BinaryOpUGen", ar, 2, [ear(input, 1), dry], [ar]),
      add("BinaryOpUGen", ar, 2, [rightWet, mix], [ar]),
    ], [ar]);
    add("ReplaceOut", ar, 0, [k(0), left, right], []);
  });
}

export function openFx() {
  if (delayId && verbId) return Promise.resolve();
  if (opening) return opening;
  opening = start().finally(() => {
    opening = null;
  });
  return opening;
}

async function start() {
  const engine = sonic();
  if (!engine?.initialized) throw new Error("off");
  await engine.loadSynthDef(delayDef());
  await engine.loadSynthDef(verbDef());
  await engine.sync();
  const group = engine.nextNodeId();
  const delay = engine.nextNodeId();
  const verb = engine.nextNodeId();
  engine.send("/g_new", group, 1, 0);
  engine.send("/s_new", delayName, delay, 1, group, "time", delayNow.time, "feedback", delayNow.feedback, "mix", delayNow.mix);
  engine.send("/s_new", verbName, verb, 1, group, "room", verbNow.room, "mix", verbNow.mix);
  await engine.sync();
  delayId = delay;
  verbId = verb;
}

export function setDelay(key: keyof typeof delayDefaults, value: number) {
  delayNow[key] = value;
  const engine = sonic();
  if (!engine?.initialized || !delayId) return;
  engine.send("/n_set", delayId, key, value);
}

export function setVerb(key: keyof typeof verbDefaults, value: number) {
  verbNow[key] = value;
  const engine = sonic();
  if (!engine?.initialized || !verbId) return;
  engine.send("/n_set", verbId, key, value);
}
