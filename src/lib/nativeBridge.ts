/**
 * Bridge to the React Native shell that embeds this app in a WebView.
 *
 * In a plain browser every function here is a no-op passthrough: the browser owns
 * permission prompts and there is no device Settings page to open.
 *
 * The shell pushes the current camera/photo-library state onto `window.__nativeMedia`
 * (on load, after a permission answer, and every time the app returns to the
 * foreground) and dispatches `NATIVE_MEDIA_EVENT`.
 *
 * Messages the shell must handle in `onMessage`:
 *
 *   { type: "REQUEST_MEDIA_ACCESS" }
 *   { type: "SAVE_IMAGE", requestId, filename, dataUrl }
 *     Write the PNG data URL to the camera roll (or open a share sheet), then answer:
 *       webviewRef.current?.injectJavaScript(
 *         `window.__nativeSaveImageResult?.(${JSON.stringify({ requestId, ok, cancelled })}); true;`
 *       );
 *     Answering is required — silence is read as "this shell is too old" after 30s
 *     and the web app falls back to browser APIs (which do nothing on Android).
 */

export type NativeMediaState = {
  /** At least one of camera / photo library is usable, so the picker is worth opening. */
  ok: boolean;
  /** The user refused and iOS/Android will not prompt again — only Settings can fix it. */
  blocked: boolean;
};

/** What the shell can do for us. Shells older than the save-image bridge send nothing. */
export type NativeCapabilities = {
  saveImage?: boolean;
};

export type NativeSaveImageResult = {
  requestId: string;
  /** The image reached the camera roll / share sheet. */
  ok: boolean;
  /** The user backed out of the share sheet or the save dialog — not a failure. */
  cancelled?: boolean;
};

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __nativeMedia?: NativeMediaState;
    __nativeCapabilities?: NativeCapabilities;
    /** Called by the shell (via injectJavaScript) to answer a SAVE_IMAGE request. */
    __nativeSaveImageResult?: (result: NativeSaveImageResult) => void;
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

export type NativeSaveOutcome = "saved" | "cancelled" | "unsupported";

/** How long to wait for the shell before deciding it does not speak SAVE_IMAGE. */
const SAVE_IMAGE_TIMEOUT_MS = 30_000;

const pendingSaves = new Map<string, (outcome: NativeSaveOutcome) => void>();

function installSaveImageListener() {
  if (window.__nativeSaveImageResult) return;

  window.__nativeSaveImageResult = (result) => {
    const settle = pendingSaves.get(result?.requestId ?? "");
    if (!settle) return;
    pendingSaves.delete(result.requestId);
    settle(result.ok ? "saved" : result.cancelled ? "cancelled" : "unsupported");
  };
}

/**
 * Ask the shell to write a PNG to the device.
 *
 * Android's WebView implements neither `navigator.share` nor `<a download>` for
 * `blob:`/`data:` URLs, so the shell is the only way to get a file out of the app
 * there. Resolves `"unsupported"` when there is no shell, when the shell predates
 * this message, or when it reports a failure — callers then fall back to the
 * browser export path.
 */
export function saveImageNative(request: {
  filename: string;
  dataUrl: string;
}): Promise<NativeSaveOutcome> {
  if (!isNativeShell()) return Promise.resolve("unsupported");
  if (window.__nativeCapabilities && !window.__nativeCapabilities.saveImage) {
    return Promise.resolve("unsupported");
  }

  installSaveImageListener();

  const requestId = crypto.randomUUID();

  return new Promise((resolve) => {
    const settle = (outcome: NativeSaveOutcome) => {
      window.clearTimeout(timer);
      pendingSaves.delete(requestId);
      resolve(outcome);
    };

    const timer = window.setTimeout(() => settle("unsupported"), SAVE_IMAGE_TIMEOUT_MS);

    pendingSaves.set(requestId, settle);

    try {
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: "SAVE_IMAGE",
          requestId,
          filename: request.filename,
          dataUrl: request.dataUrl,
        }),
      );
    } catch {
      settle("unsupported");
    }
  });
}

export function subscribeToNativeMedia(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NATIVE_MEDIA_EVENT, listener);
  return () => window.removeEventListener(NATIVE_MEDIA_EVENT, listener);
}
