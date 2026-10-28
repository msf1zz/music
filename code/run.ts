import { SuperSonic, type OscMessage } from "supersonic-scsynth";
import { boot, sonic } from "../engine/boot";
import { openFx } from "../fx/chain";
import { play as startSynth, voiceId } from "../synth/play";
import { arm, hit, toneNote } from "../steps/voice";

export const starter = `const scale = [0, 3, 7, 10, 12, 15, 19, 22]

play(step => {
  if (step % 8 === 0) send("cutoff", 700 + (step % 5) * 180)
  if (step % 2) return
  note(scale[step % scale.length])
})`;

type Step = number | null | (string | number)[];
type Tick = (step: number) => unknown;

let text = starter;
let pattern: Step[] = [];
let tick: Tick | null = null;
let cursor = 0;
let when: number | undefined;
let last = "write js";
let hear: (text: string) => void = () => {};
let stamp = 0;
let busy: Promise<void> = Promise.resolve();

type CodeWatcher = (next: string) => void;
let codeWatcher: CodeWatcher | null = null;

export function watchCode(fn: CodeWatcher) {
  codeWatcher = fn;
  return () => {
    if (codeWatcher === fn) codeWatcher = null;
  };
}

export function setCode(next: string, autoEval = false) {
  text = next;
  if (codeWatcher) {
    codeWatcher(next);
  }
  if (autoEval) {
    evalNow();
  }
}

export function keep(next: string) {
  text = next;
}

export function read() {
  return text;
}

export function listen(fn: (text: string) => void) {
  hear = fn;
  fn(last);
  return () => {
    if (hear === fn) hear = () => {};
  };
}

function say(next: string) {
  last = next;
  hear(next);
}

function oops(error: unknown) {
  const raw = error instanceof Error ? error.message : "nope";
  say(raw.split("\n")[0].slice(0, 72).toLowerCase() || "nope");
}

function soon() {
  const time = sonic()?.audioContext?.currentTime;
  return (time ?? 0) + 0.05;
}

function poke(args: (string | number)[], at?: number) {
  const engine = sonic();
  if (!engine?.initialized || args.length === 0 || typeof args[0] !== "string") return;
  let msg = args;
  if (!args[0].startsWith("/")) {
    const id = voiceId();
    if (!id) return;
    msg = ["/n_set", id, ...args];
  } else if (args[0] === "/s_new" && (args[2] === -1 || args[2] == null)) {
    msg = [...args];
    msg[2] = engine.nextNodeId();
  }
  const packet = msg as OscMessage;
  if (at != null && engine.clock) {
    engine.sendOSC(SuperSonic.osc.encodeBundle(engine.clock.nowAt(at), [packet]));
    return;
  }
  engine.send(packet[0], ...packet.slice(1));
}

function note(pitch: number, hold?: number) {
  if (typeof pitch !== "number" || !Number.isFinite(pitch)) return;
  const at = when ?? soon();
  const n = Math.round(pitch);
  if (n > 23) toneNote(440 * 2 ** ((n - 69) / 12), at, hold);
  else hit(n, at, hold);
}

function hz(freq: number, hold?: number) {
  if (typeof freq !== "number" || !Number.isFinite(freq)) return;
  toneNote(freq, when ?? soon(), hold);
}

function fire(value: unknown) {
  if (value == null || value === false) return;
  if (typeof value === "number" && Number.isFinite(value)) {
    note(value);
    return;
  }
  if (!Array.isArray(value) || value.length === 0) return;
  if (typeof value[0] === "string") {
    if (value.every((part) => typeof part === "string" || typeof part === "number")) poke(value as (string | number)[], when);
    return;
  }
  for (const item of value) fire(item);
}

function list(value: unknown[]): Step[] | null {
  const steps: Step[] = [];
  for (const item of value) {
    if (item == null || item === false) {
      steps.push(null);
      continue;
    }
    if (typeof item === "number" && Number.isFinite(item)) {
      steps.push(item);
      continue;
    }
    if (Array.isArray(item) && item.length > 0 && item.every((part) => typeof part === "string" || typeof part === "number")) {
      steps.push(item as (string | number)[]);
      continue;
    }
    return null;
  }
  return steps;
}

function runUser(code: string, send: (...args: (string | number)[]) => void, play: (fn: unknown) => void) {
  const go = new Function("send", "note", "hz", "play", "__src", `"use strict"; return eval(__src)`);
  try {
    return go(send, note, hz, play, code) as unknown;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const body = new Function("send", "note", "hz", "play", `"use strict";\n${code}`);
    return body(send, note, hz, play) as unknown;
  }
}

function use(value: unknown, hooked: Tick | null) {
  if (typeof value === "function") hooked = value as Tick;
  if (Array.isArray(value)) {
    const steps = list(value);
    if (!steps) {
      say("weird list");
      return;
    }
    tick = null;
    pattern = steps;
    cursor = 0;
    say(steps.length ? `${steps.length} steps` : "empty");
    return;
  }
  if (hooked) {
    tick = hooked;
    pattern = [];
    cursor = 0;
    say("live");
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) note(value);
  say("ok");
}

export function evalNow() {
  const mine = ++stamp;
  busy = busy.then(() => run(mine), () => run(mine));
}

async function run(mine: number) {
  if (!sonic()?.initialized) {
    try {
      await boot(0.8);
      await openFx();
      await startSynth();
    } catch {
      if (mine === stamp) say("error");
      return;
    }
  }
  try {
    await arm();
  } catch {
    if (mine === stamp) say("nope");
    return;
  }
  if (mine !== stamp) return;
  let hooked: Tick | null = null;
  const send = (...args: (string | number)[]) => {
    poke(args, when);
  };
  const play = (fn: unknown) => {
    hooked = typeof fn === "function" ? fn as Tick : null;
  };
  try {
    const value = runUser(text, send, play);
    if (mine !== stamp) return;
    use(value, hooked);
  } catch (error) {
    if (mine === stamp) oops(error);
  }
}

export function step(at: number) {
  if (!tick && !pattern.length) return;
  when = at;
  const i = cursor;
  cursor += 1;
  try {
    if (tick) {
      fire(tick(i));
      return;
    }
    fire(pattern[i % pattern.length]);
  } catch (error) {
    oops(error);
  } finally {
    when = undefined;
  }
}
