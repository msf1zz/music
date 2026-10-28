import { useEffect, useRef, useState } from "react";
import { Edit } from "../code/edit";
import { evalNow, setCode, step } from "../code/run";
import { boot, sonic, volume } from "../engine/boot";
import { openFx } from "../fx/chain";
import { Panel } from "../fx/panel";
import { Grid } from "../steps/grid";
import { Board } from "../synth/board";
import { hush, play } from "../synth/play";
import { Welcome } from "./welcome";
import { Wiki } from "./wiki";

function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    target.isContentEditable ||
    !!target.closest(".cm-editor, button")
  );
}

export function Home() {
  const [going, setGoing] = useState(false);
  const [tab, setTab] = useState<"welcome" | "wiki" | "options">("welcome");
  const level = useRef(0.8);
  const volText = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const inEditor =
        event.target instanceof HTMLElement && !!event.target.closest(".cm-editor");

      if (event.code === "Space" && !typing(event.target)) {
        event.preventDefault();
        void (async () => {
          if (!sonic()?.audioContext) {
            try {
              await boot(level.current);
              await openFx();
              await play();
              evalNow();
              setGoing(true);
              return;
            } catch {
              return;
            }
          }
          setGoing((value) => !value);
        })();
      }

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !inEditor) {
        event.preventDefault();
        evalNow();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === ".") {
        event.preventDefault();
        hush();
        setGoing(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell">
      <div className="split">
        <Edit />

        <div className="side">
          <div className="tabs-nav" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "welcome"}
              className={`tab-btn ${tab === "welcome" ? "active" : ""}`}
              onClick={() => setTab("welcome")}
            >
              welcome
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "wiki"}
              className={`tab-btn ${tab === "wiki" ? "active" : ""}`}
              onClick={() => setTab("wiki")}
            >
              wiki
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "options"}
              className={`tab-btn ${tab === "options" ? "active" : ""}`}
              onClick={() => setTab("options")}
            >
              options
            </button>
          </div>

          <div className="side-content">
            <div className={`tab-panel ${tab === "welcome" ? "is-active" : "is-hidden"}`}>
              <Welcome onLoad={(code) => setCode(code, true)} />
            </div>

            <div className={`tab-panel ${tab === "wiki" ? "is-active" : "is-hidden"}`}>
              <Wiki onLoad={(code) => setCode(code, true)} />
            </div>

            <div className={`tab-panel ${tab === "options" ? "is-active" : "is-hidden"}`}>
              <section>
                <h2>volume</h2>
                <label>
                  <span>
                    master
                    <span ref={volText}>0.80</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    defaultValue={0.8}
                    onInput={(event) => {
                      const next = Number(event.currentTarget.value);
                      level.current = next;
                      if (volText.current) volText.current.textContent = next.toFixed(2);
                      volume(next);
                    }}
                  />
                </label>
              </section>

              <Panel live={true} />
              <Board live={true} />
              <Grid live={true} going={going} onGoing={setGoing} onTick={step} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
