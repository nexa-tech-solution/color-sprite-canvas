import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { initPlayer } from "./player";
import { isNativeShell } from "./nativeBridge";

type PushState = { token: string | null; enabled: boolean; platform: "ios" | "android" };
declare global {
  interface Window {
    __nativePush?: PushState;
  }
}

/** Persist native FCM state using this WebView's auth session. No admin key in the app. */
export function usePushRegistration() {
  useEffect(() => {
    if (!isNativeShell()) return;
    let stopped = false;
    let running = false;
    let pending = false;
    let lastSaved = "";
    let lastSavedAt = 0;
    const sync = async () => {
      pending = true;
      if (running) return;
      running = true;
      try {
        while (pending && !stopped) {
          pending = false;
          const state = window.__nativePush;
          if (
            !state ||
            !["ios", "android"].includes(state.platform) ||
            typeof state.enabled !== "boolean"
          )
            continue;
          if (
            state.enabled &&
            (typeof state.token !== "string" ||
              state.token.length < 20 ||
              state.token.length > 4096)
          )
            continue;
          const fingerprint = JSON.stringify(state);
          if (fingerprint === lastSaved && Date.now() - lastSavedAt < 6 * 60 * 60 * 1000) continue;
          await initPlayer();
          if (stopped) return;
          const db = getSupabase();
          if (!db) return;
          const {
            data: { session },
          } = await db.auth.getSession();
          if (!session) return;
          const { error } = await db.rpc("register_push_token", {
            p_token: state.enabled ? state.token : null,
            p_platform: state.platform,
            p_enabled: state.enabled,
          });
          if (error) {
            // Retry without disrupting coloring; deliberately never log the token.
            if (import.meta.env.DEV) console.warn("[push] token sync failed", error.code);
          } else {
            lastSaved = fingerprint;
            lastSavedAt = Date.now();
          }
        }
      } catch {
        /* Offline: retry on the next event/timer. */
      } finally {
        running = false;
      }
    };
    const onChange = () => {
      void sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };
    window.addEventListener("nativepushchange", onChange);
    window.addEventListener("online", onChange);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onChange, 30_000);
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "REQUEST_PUSH_STATE" }));
    onChange();
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("nativepushchange", onChange);
      window.removeEventListener("online", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
