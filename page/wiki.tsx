import { useState } from "react";

export function Wiki({
  onLoad,
}: {
  onLoad: (code: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function loadSnippet(id: string, code: string) {
    onLoad(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1200);
  }

  return (
    <div className="tab-pane">
      <div>
        <h2>functions</h2>
        <div className="wiki-entry">
          <div className="example-header">
            <code>play(step =&gt; &#123; ... &#125;)</code>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                loadSnippet(
                  "play",
                  `play(step => {\n  if (step % 2 === 0) note(0)\n  if (step % 4 === 2) note(7)\n})`,
                )
              }
            >
              {copiedId === "play" ? "loaded" : "load"}
            </button>
          </div>
          <p className="note">called on each step. step is 0, 1, 2...</p>
          <pre className="code-block">
            <code>{`play(step => {
  if (step % 2 === 0) note(0)
  if (step % 4 === 2) note(7)
})`}</code>
          </pre>
        </div>

        <div className="wiki-entry">
          <code>note(pitch, hold)</code>
          <p className="note">
            0 to 23 chromatic (0 is c3, 12 is c4, 23 is b4). Above 23 maps to MIDI note numbers (60 is c4, 69 is a440). hold is duration in seconds.
          </p>
        </div>

        <div className="wiki-entry">
          <code>hz(freq, hold)</code>
          <p className="note">triggers note directly at frequency in hertz (e.g. hz(440)).</p>
        </div>

        <div className="wiki-entry">
          <code>send(param, value)</code>
          <p className="note">sends realtime synth parameter values. e.g. send("cutoff", 1800).</p>
        </div>
      </div>

      <div>
        <h2>synth parameters</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>param</th>
              <th>range</th>
              <th>default</th>
              <th>description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>cutoff</td>
              <td>80 - 12000</td>
              <td>1200</td>
              <td>filter frequency in hz</td>
            </tr>
            <tr>
              <td>resonance</td>
              <td>0 - 1</td>
              <td>0.25</td>
              <td>filter resonance</td>
            </tr>
            <tr>
              <td>attack</td>
              <td>0.01 - 2</td>
              <td>0.02</td>
              <td>attack in seconds</td>
            </tr>
            <tr>
              <td>decay</td>
              <td>0.02 - 3</td>
              <td>0.40</td>
              <td>decay in seconds</td>
            </tr>
            <tr>
              <td>detune</td>
              <td>0 - 1</td>
              <td>0.08</td>
              <td>oscillator spread</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2>pattern arrays</h2>
        <p className="note">return an array directly from code to loop through steps.</p>
        <div className="example-header" style={{ marginTop: "6px" }}>
          <span className="note">numbers are pitches, null are rests:</span>
          <button
            type="button"
            className="link-btn"
            onClick={() => loadSnippet("arr", "[0, null, 3, 7, null, 10, 12, null]")}
          >
            {copiedId === "arr" ? "loaded" : "load"}
          </button>
        </div>
        <pre className="code-block">
          <code>[0, null, 3, 7, null, 10, 12, null]</code>
        </pre>

        <p className="note" style={{ marginTop: "8px" }}>nested arrays play chords:</p>
        <pre className="code-block">
          <code>{`[[0, 7], null, [3, 10], null]`}</code>
        </pre>
      </div>

      <div>
        <h2>scales</h2>
        <p className="note">minor pentatonic: <code>[0, 3, 5, 7, 10, 12]</code></p>
        <p className="note">major pentatonic: <code>[0, 2, 4, 7, 9, 12]</code></p>
        <p className="note">dorian: <code>[0, 2, 3, 5, 7, 9, 10, 12]</code></p>
        <p className="note">natural minor: <code>[0, 2, 3, 5, 7, 8, 10, 12]</code></p>
      </div>
    </div>
  );
}
