/** A one-shot confetti burst on a temporary full-screen canvas. No dependencies. */
const COLORS = ["#f472b6", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#fb7185", "#facc15"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  round: boolean;
}

export function fireConfetti({ count = 160, duration = 2800 } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Two cannons from the bottom corners, aimed up and inward.
  const pieces: Piece[] = Array.from({ length: count }, (_, index) => {
    const fromLeft = index % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
    const speed = 9 + Math.random() * 9;
    return {
      x: fromLeft ? 0 : width,
      y: height * 0.85,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      color: COLORS[index % COLORS.length],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      round: Math.random() < 0.3,
    };
  });

  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - duration * 0.6) / (duration * 0.4));
    for (const piece of pieces) {
      piece.vy += 0.28; // gravity
      piece.vx *= 0.985; // air drag
      piece.vy *= 0.985;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      if (piece.round) {
        ctx.beginPath();
        ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      }
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
