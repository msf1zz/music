import { javascript } from "@codemirror/lang-javascript";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import { evalNow, keep, read, watchCode } from "./run";
import "./look.css";

const paint = HighlightStyle.define([
  { tag: [tags.content, tags.name, tags.punctuation], color: "#e0e0e0" },
  { tag: tags.comment, color: "#666666", fontStyle: "italic" },
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: "#c792ea" },
  { tag: [tags.operator, tags.bracket], color: "#f07178" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "#f78c6c" },
  { tag: [tags.string, tags.regexp], color: "#ffcb6b" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: [tags.className, tags.typeName], color: "#80cbc4" },
  { tag: [tags.variableName, tags.propertyName], color: "#e0e0e0" },
]);

const theme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#161616",
      color: "#e0e0e0",
      fontSize: "15px",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#ffffff",
      padding: "10px 0 28px",
      fontFamily: '"Source Code Pro", Consolas, Menlo, monospace',
    },
    ".cm-line": { padding: "0 6px" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ffffff" },
    ".cm-gutters": {
      backgroundColor: "#121212",
      color: "#555555",
      border: "none",
      borderRight: "1px solid #282828",
    },
    ".cm-gutterElement": {
      padding: "0 8px 0 10px",
    },
    ".cm-activeLine": { backgroundColor: "#202020" },
    ".cm-activeLineGutter": { backgroundColor: "#202020", color: "#888888" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#2a2a2a",
    },
  },
  { dark: true },
);

export function Edit() {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    return watchCode((next) => {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      if (current === next) return;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
      });
    });
  }, []);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const view = new EditorView({
      parent,
      doc: read(),
      extensions: [
        Prec.high(keymap.of([{ key: "Mod-Enter", run: () => (evalNow(), true) }])),
        basicSetup,
        javascript(),
        Prec.high(syntaxHighlighting(paint)),
        EditorView.lineWrapping,
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) keep(update.state.doc.toString());
        }),
      ],
    });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  return (
    <div className="edit">
      <div className="pad" ref={host} aria-label="code" />
    </div>
  );
}
