import { useEffect, useRef, useState } from "react";
import { boot, sonic } from "../engine/boot";
import { openFx } from "../fx/chain";
import { play } from "../synth/play";
import { arm, cut, hit } from "./voice";
import "./look.css";

type Cell = { on: boolean; pitch: number };

const tune = [0, 12, 7, 12, 3, 15, 7, 15, 0, 12, 10, 12, 5, 17, 7, 17];
const tone = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
const dark = [false, true, false, true, false, false, true, false, true, false, true, false];
const high = Array.from({ length: 24 }, (_, i) => 23 - i);

function make(): Cell[] {
  return tune.map((pitch, i) => ({ on: i % 4 < 2, pitch }));
}

function tag(pitch: number) {
  const name = tone[pitch % 12];
  if (name !== "c") return name;
  return `c${3 + Math.floor(pitch / 12)}`;
}

export function Grid({
  live,
  going,
  onGoing,
  onTick,
}: {
  live: boolean;
  going: boolean;
  onGoing: (next: boolean) => void;
  onTick: (at: number) => void;
}) {
  const [count, setCount] = useState<8 | 16>(16);
  const [rows, setRows] = useState(make);
  const [head, setHead] = useState(-1);
  const countRef = useRef(count);
  const rowsRef = useRef(rows);
  const tickRef = useRef(onTick);
  const bpmRef = useRef(120);
  const swingRef = useRef(0);
  const bpmText = useRef<HTMLSpanElement>(null);
  const swingText = useRef<HTMLSpanElement>(null);
  countRef.current = count;
  rowsRef.current = rows;
  tickRef.current = onTick;

  useEffect(() => {
    if (!going || !live) {
      setHead(-1);
      return;
    }
    const audio = sonic()?.audioContext;
    if (!audio) {
      onGoing(false);
      return;
    }
    let dead = false;
    let frame = 0;
    let index = 0;
    let next = 0;
    let shown = -1;
    const marks = new Float64Array(16).fill(-1);

    const run = () => {
      if (dead) return;
      const now = audio.currentTime;
      const beat = Math.max(0.05, 60 / bpmRef.current / 4);
      if (next < now - beat) {
        const skip = Math.floor((now - next) / beat);
        index += skip;
        next += skip * beat;
      }
      while (next < now + 0.12) {
        const countNow = countRef.current;
        const i = index % countNow;
        const nudge = i % 2 ? (swingRef.current * beat) / 3 : 0;
        const at = next + nudge;
        const cell = rowsRef.current[i];
        if (cell?.on) hit(cell.pitch, at);
        tickRef.current(at);
        marks[i] = at;
        index += 1;
        next += beat;
      }
      let latest = -1;
      const countNow = countRef.current;
      for (let i = 0; i < countNow; i++) {
        const at = marks[i];
        if (at >= 0 && at <= now && (latest < 0 || at >= marks[latest])) latest = i;
      }
      if (latest !== shown) {
        shown = latest;
        setHead(latest);
      }
      frame = requestAnimationFrame(run);
    };

    void audio.resume();
    void arm().then(
      () => {
        if (dead) return;
        next = audio.currentTime + 0.08;
        frame = requestAnimationFrame(run);
      },
      () => {
        if (!dead) onGoing(false);
      },
    );

    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      void cut();
    };
  }, [going, live]);

  function choose(step: number, pitch: number) {
    setRows((prev) =>
      prev.map((cell, i) => {
        if (i !== step) return cell;
        if (cell.on && cell.pitch === pitch) return { on: false, pitch };
        return { on: true, pitch };
      }),
    );
    void (async () => {
      if (!sonic()?.audioContext) {
        await boot(0.8);
        await openFx();
        await play();
      }
      await arm();
      const when = sonic()?.audioContext?.currentTime;
      if (when === undefined) return;
      hit(pitch, when + 0.05);
    })();
  }

  function length(nextCount: 8 | 16) {
    countRef.current = nextCount;
    setCount(nextCount);
  }

  async function toggle() {
    if (!going) {
      if (!sonic()?.audioContext) {
        try {
          await boot(0.8);
          await openFx();
          await play();
        } catch {
          return;
        }
      }
      onGoing(true);
    } else {
      onGoing(false);
    }
  }

  return (
    <section className="seq">
      <h2>steps</h2>
      <div className="bar">
        <button
          type="button"
          onClick={() => void toggle()}
        >
          {going ? "halt" : "run"}
        </button>
        <button type="button" className={count === 8 ? "alt pick" : "alt"} aria-pressed={count === 8} onClick={() => length(8)}>
          8
        </button>
        <button type="button" className={count === 16 ? "alt pick" : "alt"} aria-pressed={count === 16} onClick={() => length(16)}>
          16
        </button>
      </div>
      <label>
        <span>
          bpm
          <span ref={bpmText}>120</span>
        </span>
        <input
          type="range"
          min={60}
          max={200}
          step={1}
          defaultValue={120}
          onInput={(event) => {
            const value = Number(event.currentTarget.value);
            bpmRef.current = value;
            if (bpmText.current) bpmText.current.textContent = String(value);
          }}
        />
      </label>
      <label>
        <span>
          swing
          <span ref={swingText}>0</span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          defaultValue={0}
          onInput={(event) => {
            const value = Number(event.currentTarget.value);
            swingRef.current = value;
            if (swingText.current) swingText.current.textContent = String(Math.round(value * 100));
          }}
        />
      </label>
      <div className="roll">
        <div className="names">
          {high.map((pitch) => (
            <span key={pitch}>{tag(pitch)}</span>
          ))}
        </div>
        <div className="cols">
          {rows.slice(0, count).map((cell, i) => (
            <div key={i} className={i === head ? "col hot" : "col"}>
              {high.map((pitch) => {
                const on = cell.on && cell.pitch === pitch;
                return (
                  <button
                    key={pitch}
                    type="button"
                    className={`cell${dark[pitch % 12] ? " dark" : ""}${on ? " pick" : ""}`}
                    aria-label={`${tag(pitch)} step ${i + 1}`}
                    aria-pressed={on}
                    onClick={() => choose(i, pitch)}
                  />
                );
              })}
              <span className="num">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
