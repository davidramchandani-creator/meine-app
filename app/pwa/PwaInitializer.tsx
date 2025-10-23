"use client";

import { useEffect } from "react";

const registerServiceWorker = async () => {
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener("statechange", () => {
        const { state } = installingWorker;
        if (state === "installed" && navigator.serviceWorker.controller) {
          document.dispatchEvent(
            new CustomEvent("pwa:updateavailable", {
              detail: { registration },
            }),
          );
        }
      });
    });

    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
};

export function PwaInitializer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    const onLoad = () => {
      registerServiceWorker();
    };

    window.addEventListener("load", onLoad, { once: true });

    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
