/** A soft two-note "ding-dong" for new chat messages, made with Web Audio (no sound file). */
let audio: AudioContext | null = null;

export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    // Browsers keep audio muted until the person has tapped the page once; then this works.
    if (audio.state === "suspended") void audio.resume();
    const start = audio.currentTime + 0.02;
    [880, 1318.5].forEach((frequency, index) => {
      const at = start + index * 0.16;
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
      osc.connect(gain).connect(audio!.destination);
      osc.start(at);
      osc.stop(at + 0.5);
    });
  } catch {
    // No sound is fine.
  }
}
