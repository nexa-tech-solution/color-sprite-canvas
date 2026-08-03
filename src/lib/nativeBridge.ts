/**
 * Bridge to the React Native shell that embeds this app in a WebView.
 *
 * In a plain browser every function here is a no-op passthrough: the browser owns
 * permission prompts and there is no device Settings page to open.
 *
 * The shell pushes the current camera/photo-library state onto `window.__nativeMedia`
 * (on load, after a permission answer, and every time the app returns to the
 * foreground) and dispatches `NATIVE_MEDIA_EVENT`.
 */

export type NativeMediaState = {
  /** At least one of camera / photo library is usable, so the picker is worth opening. */
  ok: boolean;
  /** The user refused and iOS/Android will not prompt again — only Settings can fix it. */
  blocked: boolean;
};

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __nativeMedia?: NativeMediaState;
  }
}

export const NATIVE_MEDIA_EVENT = "nativemediachange";

export function isNativeShell(): boolean {
  return typeof window !== "undefined" && typeof window.ReactNativeWebView !== "undefined";
}

export function getNativeMediaState(): NativeMediaState | undefined {
  return typeof window === "undefined" ? undefined : window.__nativeMedia;
}

/**
 * Ask the shell to re-prompt, or to send the user to the device Settings page.
 * Fire-and-forget — the shell owns the resulting UI and pushes new state when done.
 */
export function requestNativeMediaAccess(): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "REQUEST_MEDIA_ACCESS" }));
}

/**
 * Open a hidden <input type="file">, unless the shell says media access is unusable.
 *
 * Deliberately synchronous. WKWebView only honours `input.click()` while the user
 * gesture is still on the stack, so this must not await anything before clicking —
 * hence the pushed-state design instead of a request/response round trip.
 */
export function openImagePicker(input: HTMLInputElement | null): void {
  if (isNativeShell() && getNativeMediaState()?.ok === false) {
    requestNativeMediaAccess();
    return;
  }
  input?.click();
}

export function subscribeToNativeMedia(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NATIVE_MEDIA_EVENT, listener);
  return () => window.removeEventListener(NATIVE_MEDIA_EVENT, listener);
}
