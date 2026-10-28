import { ar, def, kr } from "../engine/def";

export const name = "dual";

export const defaults = {
  cutoff: 1400,
  resonance: 0.2,
  attack: 0.08,
  decay: 0.4,
  detune: 0.12,
};

export function build() {
  return def(name, { ...defaults, gate: 1 }, ({ k, ctl, add }) => {
    const cut = add("Lag", ar, 0, [ctl(0), k(0.03)], [ar]);
    const res = add("Lag", kr, 0, [ctl(1), k(0.03)], [kr]);
    const dipped = add("BinaryOpUGen", kr, 2, [res, k(0.95)], [kr]);
    const rq = add("Clip", kr, 0, [add("BinaryOpUGen", kr, 1, [k(1), dipped], [kr]), k(0.05), k(1)], [kr]);
    const det = add("Lag", kr, 0, [ctl(4), k(0.03)], [kr]);
    const wide = add("BinaryOpUGen", kr, 2, [det, det], [kr]);
    const ratio = add("BinaryOpUGen", kr, 0, [k(1), wide], [kr]);
    const freq2 = add("BinaryOpUGen", kr, 2, [k(98), ratio], [kr]);
    const saw1 = add("Saw", ar, 0, [k(98)], [ar]);
    const saw2 = add("Saw", ar, 0, [freq2], [ar]);
    const saws = add("BinaryOpUGen", ar, 0, [saw1, saw2], [ar]);
    const sawMix = add("BinaryOpUGen", ar, 2, [saws, k(0.22)], [ar]);
    const sub = add("SinOsc", ar, 0, [k(49), k(0)], [ar]);
    const subMix = add("BinaryOpUGen", ar, 2, [sub, k(0.18)], [ar]);
    const mix = add("BinaryOpUGen", ar, 0, [sawMix, subMix], [ar]);
    const atkLag = add("Lag", kr, 0, [ctl(2), k(0.02)], [kr]);
    const atk = add("Clip", kr, 0, [atkLag, k(0.008), k(2)], [kr]);
    const decLag = add("Lag", kr, 0, [ctl(3), k(0.02)], [kr]);
    const dec = add("Clip", kr, 0, [decLag, k(0.02), k(3)], [kr]);
    const span = add("BinaryOpUGen", kr, 0, [atk, dec], [kr]);
    const rate = add("Clip", kr, 0, [add("Reciprocal", kr, 0, [span], [kr]), k(0.15), k(8)], [kr]);
    const tick = add("Impulse", kr, 0, [rate, k(0)], [kr]);
    const bloom = add("EnvGen", kr, 0, [
      tick, k(1), k(0), k(1), k(0),
      k(0), k(2), k(-99), k(-99),
      k(1), atk, k(1), k(0),
      k(0), dec, k(1), k(0),
    ], [kr]);
    const depth = add("BinaryOpUGen", kr, 2, [bloom, k(2.1)], [kr]);
    const amount = add("BinaryOpUGen", kr, 0, [k(0.25), depth], [kr]);
    const cfreq = add("BinaryOpUGen", ar, 2, [cut, amount], [ar]);
    const clipped = add("Clip", ar, 0, [cfreq, k(45), k(14000)], [ar]);
    const tone = add("RLPF", ar, 0, [mix, clipped, rq], [ar]);
    const amp = add("EnvGen", kr, 0, [
      ctl(5), k(1), k(0), k(1), k(0),
      k(0), k(2), k(1), k(-99),
      k(1), k(0.03), k(5), k(-4),
      k(0), k(0.45), k(5), k(-4),
    ], [kr]);
    const voiced = add("BinaryOpUGen", ar, 2, [tone, amp], [ar]);
    const sig = add("BinaryOpUGen", ar, 2, [voiced, k(0.2)], [ar]);
    add("Out", ar, 0, [k(0), sig, sig], []);
  });
}
