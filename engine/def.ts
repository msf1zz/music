export const kr = 1;
export const ar = 2;

export type Wire = { u: number; o: number };

type Ugen = {
  name: string;
  rate: number;
  special: number;
  inputs: Wire[];
  outputs: number[];
};

export type Graph = {
  k: (n: number) => Wire;
  ctl: (i: number) => Wire;
  add: (name: string, rate: number, special: number, inputs: Wire[], outputs: number[]) => Wire;
};

export function def(title: string, controls: Record<string, number>, graph: (g: Graph) => void) {
  const constants: number[] = [];
  const seen = new Map<number, number>();
  const ugens: Ugen[] = [];
  const bytes: number[] = [];

  const push = (...ns: number[]) => {
    for (const n of ns) bytes.push(n & 255);
  };
  const i16 = (n: number) => {
    const v = n & 65535;
    push(v >> 8, v);
  };
  const i32 = (n: number) => {
    const v = n | 0;
    push(v >>> 24, v >>> 16, v >>> 8, v);
  };
  const f32 = (n: number) => {
    const raw = new Uint8Array(4);
    new DataView(raw.buffer).setFloat32(0, n, false);
    push(...raw);
  };
  const str = (text: string) => {
    push(text.length);
    for (let i = 0; i < text.length; i++) push(text.charCodeAt(i));
  };
  const k = (n: number): Wire => {
    let i = seen.get(n);
    if (i === undefined) {
      i = constants.length;
      constants.push(n);
      seen.set(n, i);
    }
    return { u: -1, o: i };
  };
  const add = (
    name: string,
    rate: number,
    special: number,
    inputs: Wire[],
    outputs: number[],
  ): Wire => {
    ugens.push({ name, rate, special, inputs, outputs });
    return { u: ugens.length - 1, o: 0 };
  };
  const ctl = (i: number): Wire => ({ u: 0, o: i });
  const labels = Object.keys(controls);
  add("Control", kr, 0, [], labels.map(() => kr));
  graph({ k, ctl, add });

  push(83, 67, 103, 102);
  i32(2);
  i16(1);
  str(title);
  i32(constants.length);
  for (const n of constants) f32(n);
  const values = Object.values(controls);
  i32(values.length);
  for (const n of values) f32(n);
  i32(labels.length);
  labels.forEach((label, index) => {
    str(label);
    i32(index);
  });
  i32(ugens.length);
  for (const ugen of ugens) {
    str(ugen.name);
    push(ugen.rate);
    i32(ugen.inputs.length);
    i32(ugen.outputs.length);
    i16(ugen.special);
    for (const input of ugen.inputs) {
      i32(input.u);
      i32(input.o);
    }
    for (const rate of ugen.outputs) push(rate);
  }
  i16(0);
  return Uint8Array.from(bytes);
}
