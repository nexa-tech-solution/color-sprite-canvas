/**
 * Turn a photo into a coloring-book page: crisp black outlines on white.
 *
 * Pipeline: downscale → grayscale → smooth (removes texture like fur/feathers)
 * → Sobel edges → keep the strongest N% (adapts to any photo's contrast)
 * → drop tiny specks → thicken lines → pure black/white PNG.
 */
export async function imageToColoringPage(
  src: string,
  opts: { lineStrength?: number; detail?: "low" | "med" | "high" } = {},
): Promise<string> {
  const { lineStrength = 0.75, detail = "med" } = opts;
  const img = await loadImage(src);

  // Working resolution: big enough for detail, small enough that texture
  // doesn't turn into noise and processing stays quick on phones.
  // Small photos are upscaled too, so line thickness stays consistent.
  const maxDim = 1000;
  const scale = maxDim / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Two box-blur passes ≈ Gaussian. More smoothing = fewer, cleaner lines.
  const radius = detail === "high" ? 1 : detail === "low" ? 3 : 2;
  const smooth = boxBlur(boxBlur(gray, w, h, radius), w, h, radius);

  const magnitude = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -smooth[i - w - 1] -
        2 * smooth[i - 1] -
        smooth[i + w - 1] +
        smooth[i - w + 1] +
        2 * smooth[i + 1] +
        smooth[i + w + 1];
      const gy =
        -smooth[i - w - 1] -
        2 * smooth[i - w] -
        smooth[i - w + 1] +
        smooth[i + w - 1] +
        2 * smooth[i + w] +
        smooth[i + w + 1];
      magnitude[i] = Math.hypot(gx, gy);
    }
  }

  // Keep the strongest edges by percentage rather than a fixed value, so dark,
  // bright, low- and high-contrast photos all produce a similar amount of line.
  const edgeFraction = 0.035 + Math.min(1, Math.max(0, lineStrength)) * 0.075;
  const threshold = percentile(magnitude, 1 - edgeFraction);
  let edges = new Uint8Array(w * h);
  for (let i = 0; i < magnitude.length; i++) {
    edges[i] = magnitude[i] > threshold && magnitude[i] > 12 ? 1 : 0;
  }

  // Remove specks — isolated bits are noise, not outlines a child can color in.
  removeSmallComponents(edges, w, h, Math.round((w * h) / 9000) + 12);
  // Bolder strokes read as "coloring book" and close tiny gaps between regions.
  edges = dilate(edges, w, h);

  const out = ctx.createImageData(w, h);
  const od = out.data;
  for (let i = 0; i < edges.length; i++) {
    const v = edges[i] ? 0 : 255;
    const p = i * 4;
    od[p] = od[p + 1] = od[p + 2] = v;
    od[p + 3] = 255;
  }

  // Draw a clean frame edge in white so border artefacts don't show.
  ctx.putImageData(out, 0, 0);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, w, h);

  return canvas.toDataURL("image/png");
}

function percentile(values: Float32Array, q: number) {
  // Histogram-based percentile: O(n), no sort of a million floats.
  let max = 0;
  for (let i = 0; i < values.length; i++) if (values[i] > max) max = values[i];
  if (max <= 0) return Infinity;

  const bins = 2048;
  const histogram = new Uint32Array(bins);
  for (let i = 0; i < values.length; i++) {
    histogram[Math.min(bins - 1, Math.floor((values[i] / max) * (bins - 1)))]++;
  }

  const target = q * values.length;
  let count = 0;
  for (let b = 0; b < bins; b++) {
    count += histogram[b];
    if (count >= target) return (b / (bins - 1)) * max;
  }
  return max;
}

function removeSmallComponents(mask: Uint8Array, w: number, h: number, minSize: number) {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const component: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;

    component.length = 0;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;

    while (top > 0) {
      const i = stack[--top];
      component.push(i);
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const n = ny * w + nx;
          if (mask[n] && !seen[n]) {
            seen[n] = 1;
            stack[top++] = n;
          }
        }
      }
    }

    if (component.length < minSize) {
      for (const i of component) mask[i] = 0;
    }
  }
}

function dilate(mask: Uint8Array, w: number, h: number) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < w) out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return src;
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) {
          sum += src[y * w + xx];
          count++;
        }
      }
      tmp[y * w + x] = sum / count;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) {
          sum += tmp[yy * w + x];
          count++;
        }
      }
      dst[y * w + x] = sum / count;
    }
  }
  return dst;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
