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
 * - Browser: Gmail compose in a new tab; the app tab stays where it is.
 * - iOS app: the WebView would load mail.google.com *inside* the app with no
 *   way back, so hand off to the Gmail app, falling back to the Mail app when
 *   Gmail isn't installed (page still visible = nothing opened).
 */
export function openFeedbackEmail(topic: FeedbackTopic, message: string) {
  if (!isNativeShell()) {
    openInNewTab(gmailWebUrl(topic, message));
    return;
  }

  window.location.href = gmailAppUrl(topic, message);
  window.setTimeout(() => {
    if (document.visibilityState === "visible") {
      window.location.href = mailtoUrl(topic, message);
    }
  }, 1200);
}
