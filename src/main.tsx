import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Calculator } from "@/components/calculator";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Calculator />
  </StrictMode>,
);
