import { useState } from "react";

export type Preset = {
  id: string;
  name: string;
  desc: string;
  code: string;
};

export const presets: Preset[] = [
  {
    id: "arp",
    name: "arp and cutoff",
    desc: "scale arpeggio with modulating cutoff",
    code: `const scale = [0, 3, 7, 10, 12, 15, 19, 22]

play(step => {
  if (step % 8 === 0) send("cutoff", 700 + (step % 5) * 180)
  if (step % 2) return
  note(scale[step % scale.length])
})`,
  },
  {
    id: "acid",
    name: "acid bass",
    desc: "resonant bass with snappy decay",
    code: `const bass = [0, 0, 12, 3, 0, 15, 10, 7]

play(step => {
  const p = bass[step % bass.length]
  send("resonance", 0.75)
  send("cutoff", step % 4 === 0 ? 3400 : 700)
  send("decay", step % 2 === 0 ? 0.32 : 0.12)
  note(p, 0.16)
})`,
  },
  {
    id: "array",
    name: "array pattern",
    desc: "numbers are notes, null are rests",
    code: `[
  0, null, 7, null,
  12, 10, 7, null,
  3, null, 7, 12,
  15, null, 10, null
]`,
  },
  {
    id: "ambient",
    name: "ambient chords",
    desc: "slow evolving chords with detune",
    code: `const chords = [
  [0, 7, 12, 15],
  [3, 7, 10, 15],
  [5, 8, 12, 17],
  [2, 7, 10, 14]
]

play(step => {
  if (step % 8 === 0) {
    send("attack", 0.35)
    send("decay", 2.2)
    send("detune", 0.3)
    send("cutoff", 2200)
    const chord = chords[Math.floor(step / 8) % chords.length]
    for (const n of chord) note(n, 1.4)
  }
})`,
  },
  {
    id: "poly",
    name: "poly rhythm",
    desc: "counterpoint with modulo triggers",
    code: `const scale = [0, 2, 3, 5, 7, 8, 10, 12, 15]

play(step => {
  if (step % 4 === 0) {
    send("cutoff", 800 + (step % 6) * 350)
  }
  if (step % 3 === 0) {
    note(scale[(step * 2) % scale.length], 0.18)
  }
  if (step % 5 === 0) {
    note(scale[(step + 3) % scale.length] + 12, 0.25)
  }
})`,
  },
];

export function Welcome({
  onLoad,
}: {
  onLoad: (code: string) => void;
}) {
  const [loadedId, setLoadedId] = useState<string | null>(null);

  function handleLoad(preset: Preset) {
    onLoad(preset.code);
    setLoadedId(preset.id);
    setTimeout(() => setLoadedId((curr) => (curr === preset.id ? null : curr)), 1200);
  }

  return (
    <div className="tab-pane">
      <div>
        <h2>welcome</h2>
        <p className="note">
          browser live coding synthesizer. write javascript to sequence patterns and modulate synth parameters in real time.
        </p>
      </div>

      <div>
        <h2>quick start</h2>
        <p className="note">1. edit code in the editor</p>
        <p className="note">2. press ctrl enter to evaluate and start audio</p>
        <p className="note">3. space toggles the sequencer, ctrl . stops audio</p>
        <p className="note">4. tweak parameters live in the options tab</p>
      </div>

      <div>
        <h2>examples</h2>
        <div className="example-list">
          {presets.map((preset) => (
            <div key={preset.id} className="example">
              <div className="example-header">
                <div>
                  <h3>{preset.name}</h3>
                  <span className="note">{preset.desc}</span>
                </div>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => handleLoad(preset)}
                >
                  {loadedId === preset.id ? "loaded" : "load"}
                </button>
              </div>
              <pre className="code-block">
                <code>{preset.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
