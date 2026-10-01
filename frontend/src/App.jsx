import { useState } from "react";

import { getBackendHealth } from "./services/healthService.js";

const layers = [
  "React frontend",
  "Spring Security and REST API",
  "Service / business layer",
  "Spring Data JPA",
  "MySQL database",
];

export default function App() {
  const [health, setHealth] = useState("Not checked");
  const [checking, setChecking] = useState(false);

  async function checkBackend() {
    setChecking(true);
    try {
      const result = await getBackendHealth();
      setHealth(`${result.status} - ${result.service}`);
    } catch (error) {
      setHealth(error.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">GROUP 5 · SWP391</p>
        <h1>Premium News & Advertising Management System</h1>
        <p className="summary">
          The React + Spring Boot + MySQL workspace is ready for feature development.
        </p>

        <div className="actions">
          <button type="button" onClick={checkBackend} disabled={checking}>
            {checking ? "Checking..." : "Check backend connection"}
          </button>
          <span className="status" aria-live="polite">{health}</span>
        </div>
      </section>

      <section className="architecture" aria-labelledby="architecture-title">
        <div>
          <p className="eyebrow">STARTER ARCHITECTURE</p>
          <h2 id="architecture-title">One clear request path</h2>
        </div>
        <ol>
          {layers.map((layer) => <li key={layer}>{layer}</li>)}
        </ol>
      </section>
    </main>
  );
}
