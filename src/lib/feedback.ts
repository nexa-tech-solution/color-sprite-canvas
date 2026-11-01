import { isNativeShell } from "./nativeBridge";

const FEEDBACK_EMAIL = "cs.nexatech@gmail.com";

export type FeedbackTopic = "bug" | "idea" | "pages" | "other";

export const FEEDBACK_TOPIC_SUBJECTS: Record<FeedbackTopic, string> = {
  bug: "Bug report",
  idea: "Feature idea",
  pages: "Coloring page request",
  other: "Feedback",
};

function subject(topic: FeedbackTopic) {
  return `[Coloring] ${FEEDBACK_TOPIC_SUBJECTS[topic]}`;
}

function body(topic: FeedbackTopic, message: string) {
  return [
    message.trim(),
    "",
    "— — — (please keep the info below, it helps us) — — —",
    `Topic: ${FEEDBACK_TOPIC_SUBJECTS[topic]}`,
    `Page: ${window.location.pathname}`,
    `Screen: ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    `App: ${isNativeShell() ? "iOS app" : "Browser"}`,
    `Device: ${navigator.userAgent}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
}

function gmailWebUrl(topic: FeedbackTopic, message: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: FEEDBACK_EMAIL,
    su: subject(topic),
    body: body(topic, message),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function gmailAppUrl(topic: FeedbackTopic, message: string) {
  return `googlegmail://co?to=${encodeURIComponent(FEEDBACK_EMAIL)}&subject=${encodeURIComponent(subject(topic))}&body=${encodeURIComponent(body(topic, message))}`;
}

function mailtoUrl(topic: FeedbackTopic, message: string) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject(topic))}&body=${encodeURIComponent(body(topic, message))}`;
}

/** Open exactly one new tab and leave the current page alone. */
function openInNewTab(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Open a pre-filled email to the support inbox. Must be called inside a tap.
 *
 * - Browser (incl. Android): Gmail compose in a new tab; Android hands it to the Gmail app.
 * - iOS app with a new shell: the shell picks Gmail app → Gmail web in Safari → Mail.
 * - iOS app with an old shell: try the Gmail app; only fall back to Mail if the app
 *   clearly never left (no blur / pagehide / hidden). WKWebView doesn't always report
 *   "hidden" when another app opens, which used to fire the Mail fallback on top of Gmail.
 */
export function openFeedbackEmail(topic: FeedbackTopic, message: string) {
  if (!isNativeShell()) {
    openInNewTab(gmailWebUrl(topic, message));
    return;
  }

  if (window.__nativeCapabilities?.openEmail) {
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "OPEN_EMAIL",
        gmailUrl: gmailAppUrl(topic, message),
        webUrl: gmailWebUrl(topic, message),
        mailtoUrl: mailtoUrl(topic, message),
      }),
    );
    return;
  }

  let left = false;
  const markLeft = () => {
    left = true;
  };
  const onVisibility = () => document.visibilityState === "hidden" && markLeft();
  window.addEventListener("blur", markLeft);
  window.addEventListener("pagehide", markLeft);
  document.addEventListener("visibilitychange", onVisibility);

  window.location.href = gmailAppUrl(topic, message);
  window.setTimeout(() => {
    window.removeEventListener("blur", markLeft);
    window.removeEventListener("pagehide", markLeft);
    document.removeEventListener("visibilitychange", onVisibility);
    if (!left && document.visibilityState === "visible" && document.hasFocus()) {
      window.location.href = mailtoUrl(topic, message);
    }
  }, 2000);
}
