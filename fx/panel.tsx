import { useEffect, useRef } from "react";
import { delayDefaults, setDelay, setVerb, verbDefaults } from "./chain";

type Row = {
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
  start: number;
  move: (value: number) => void;
};

const rows: { title: string; items: Row[] }[] = [
  {
    title: "delay",
    items: [
      { label: "time", min: 0.01, max: 1.5, step: 0.01, digits: 2, start: delayDefaults.time, move: (value) => setDelay("time", value) },
      { label: "feedback", min: 0, max: 0.92, step: 0.01, digits: 2, start: delayDefaults.feedback, move: (value) => setDelay("feedback", value) },
      { label: "mix", min: 0, max: 1, step: 0.01, digits: 2, start: delayDefaults.mix, move: (value) => setDelay("mix", value) },
    ],
  },
  {
    title: "verb",
    items: [
      { label: "room", min: 0, max: 1, step: 0.01, digits: 2, start: verbDefaults.room, move: (value) => setVerb("room", value) },
      { label: "mix", min: 0, max: 1, step: 0.01, digits: 2, start: verbDefaults.mix, move: (value) => setVerb("mix", value) },
    ],
  },
];

function Slider({ row, live }: { row: Row; live: boolean }) {
  const text = useRef<HTMLSpanElement>(null);
  const wait = useRef(0);
  const next = useRef<number | null>(null);

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
      row.move(latest);
    });
  }

  return (
    <label>
      <span>
        {row.label}
        <span ref={text}>{row.start.toFixed(row.digits)}</span>
      </span>
      <input
        type="range"
        min={row.min}
        max={row.max}
        step={row.step}
        defaultValue={row.start}
        disabled={!live}
        onInput={(event) => move(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function Panel({ live }: { live: boolean }) {
  return (
    <section>
      <h2>fx</h2>
      {rows.map((group) => (
        <div className="stack" key={group.title}>
          <h3>{group.title}</h3>
          {group.items.map((row) => (
            <Slider key={`${group.title}-${row.label}`} row={row} live={live} />
          ))}
        </div>
      ))}
    </section>
  );
}
