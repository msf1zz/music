import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "./home";
import "./look.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing root");

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
