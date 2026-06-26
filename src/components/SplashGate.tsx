"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";

interface SplashGateProps {
  /** Tiempo mínimo visible (ms) aunque la página cargue antes. */
  minDuration?: number;
}

/**
 * Muestra el LoadingScreen como overlay a pantalla completa al cargar/recargar
 * la página y, cuando la web está lista (window load) + un mínimo de tiempo,
 * se desvanece y desmonta revelando la app.
 */
export function SplashGate({ minDuration = 1400 }: SplashGateProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = () => {
      const wait = Math.max(0, minDuration - (Date.now() - start));
      timers.push(
        setTimeout(() => {
          setExiting(true); // arranca el fade-out
          timers.push(setTimeout(() => setVisible(false), 500)); // desmonta tras la transición
        }, wait),
      );
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      window.removeEventListener("load", finish);
      timers.forEach(clearTimeout);
    };
  }, [minDuration]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] transition-opacity duration-500 ease-out"
      style={{
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? "none" : "auto",
      }}
      aria-hidden={exiting}
    >
      <LoadingScreen />
    </div>
  );
}
