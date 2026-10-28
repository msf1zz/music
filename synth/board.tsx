import { useEffect, useRef } from "react";
import { defaults } from "./build";
import { tweak, type KnobName } from "./play";

type Row = {
  name: KnobName;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
};

const rows: Row[] = [
  { name: "cutoff", label: "cutoff", min: 80, max: 12000, step: 1, digits: 0 },
  { name: "resonance", label: "resonance", min: 0, max: 1, step: 0.001, digits: 2 },
  { name: "attack", label: "attack", min: 0.01, max: 2, step: 0.001, digits: 2 },
  { name: "decay", label: "decay", min: 0.02, max: 3, step: 0.001, digits: 2 },
  { name: "detune", label: "detune", min: 0, max: 1, step: 0.001, digits: 2 },
];

function Knob({ row, live }: { row: Row; live: boolean }) {
  const text = useRef<HTMLSpanElement>(null);
  const wait = useRef(0);
  const next = useRef<number | null>(null);
  const start = defaults[row.name];

  useEffect(() => () => cancelAnimationFrame(wait.current), []);

  function move(value: number) {
    if (text.current) text.current.textContent = value.toFixed(row.digits);
    if (!live) return;
    next.current = value;
    if (wait.current) return;
    wait.current = requestAnimationFrame(() => {
      wait.current = 0;
      const latest = next.current;
      next.current = null;
      if (latest === null) return;
      tweak(row.name, latest);
    });
  }

  return (
    <label>
      <span>
        {row.label}
        <span ref={text}>{start.toFixed(row.digits)}</span>
      </span>
      <input
        type="range"
        min={row.min}
        max={row.max}
        step={row.step}
        defaultValue={start}
        disabled={!live}
        onInput={(event) => move(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function Board({ live }: { live: boolean }) {
  return (
    <section>
      <h2>tone</h2>
      {rows.map((row) => (
        <Knob key={row.name} row={row} live={live} />
      ))}
    </section>
  );
}
