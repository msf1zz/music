import { defaults } from "./build";

export type KnobName = keyof typeof defaults;

export const tone = { ...defaults };

const listeners = new Set<(key: KnobName, value: number) => void>();

export function setTone(key: KnobName, value: number) {
  tone[key] = value;
  for (const hear of listeners) hear(key, value);
}

export function watchTone(hear: (key: KnobName, value: number) => void) {
  listeners.add(hear);
  return () => {
    listeners.delete(hear);
  };
}
