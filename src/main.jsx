import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new CustomEvent("pwa-update-ready"));
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
