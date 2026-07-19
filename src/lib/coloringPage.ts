// Convert an image to a clean coloring-page outline using Sobel edge detection.
// Returns a data URL PNG.
export async function imageToColoringPage(
  src: string,
  opts: { lineStrength?: number; detail?: "low" | "med" | "high" } = {},
): Promise<string> {
  const { lineStrength = 0.75, detail = "med" } = opts;
  const img = await loadImage(src);
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const src2 = ctx.getImageData(0, 0, w, h);
  const data = src2.data;

  // grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // simple 3x3 box blur (denoise)
  const blurred = boxBlur(gray, w, h, detail === "high" ? 1 : detail === "low" ? 3 : 2);

  // sobel
  const mag = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -blurred[i - w - 1] -
        2 * blurred[i - 1] -
        blurred[i + w - 1] +
        blurred[i - w + 1] +
        2 * blurred[i + 1] +
        blurred[i + w + 1];
      const gy =
        -blurred[i - w - 1] -
        2 * blurred[i - w] -
        blurred[i - w + 1] +
        blurred[i + w - 1] +
        2 * blurred[i + w] +
        blurred[i + w + 1];
      const m = Math.hypot(gx, gy);
      mag[i] = m;
      if (m > maxMag) maxMag = m;
    }
  }

  // threshold + invert to black-on-white
  const out = ctx.createImageData(w, h);
  const od = out.data;
  const threshold = maxMag * (1 - lineStrength) * 0.5 + maxMag * 0.05;
  for (let i = 0; i < mag.length; i++) {
    const v = mag[i] > threshold ? 0 : 255;
    // soft: interpolate near threshold
    const soft =
      mag[i] > threshold
        ? Math.max(0, 255 - ((mag[i] - threshold) / (maxMag - threshold + 1e-6)) * 255 * 4)
        : 255;
    const p = i * 4;
    od[p] = od[p + 1] = od[p + 2] = Math.min(255, Math.max(0, Math.round(soft)));
    od[p + 3] = 255;
    void v;
  }
  ctx.putImageData(out, 0, 0);
  return c.toDataURL("image/png");
}

function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius <= 0) return src;
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  // horizontal
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0,
        count = 0;
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
  // vertical
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0,
        count = 0;
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
