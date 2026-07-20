export interface Sticker {
  id: string;
  name: string;
  category: "Cute" | "Nature" | "Play";
  src: string;
}

const importedStickerModules = import.meta.glob<string>(
  "../assets/stickers/**/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const stickerNames: Record<string, string> = {
  "rainbow-cloud": "Rainbow",
  "happy-star": "Star",
  "smile-face": "Smile",
  bunny: "Bunny",
  heart: "Heart",
  flower: "Flower",
  butterfly: "Butterfly",
  sun: "Sun",
  "cloud-rain": "Cloud",
  fish: "Fish",
  balloon: "Balloon",
  rocket: "Rocket",
  diamond: "Diamond",
  cupcake: "Cupcake",
};

const stickerOrder = [
  "rainbow-cloud",
  "happy-star",
  "smile-face",
  "bunny",
  "heart",
  "flower",
  "butterfly",
  "sun",
  "cloud-rain",
  "fish",
  "balloon",
  "rocket",
  "diamond",
  "cupcake",
];

function categoryFromPath(path: string): Sticker["category"] {
  const folder = path.split("/").at(-2)?.toLowerCase();
  if (folder === "nature") return "Nature";
  if (folder === "play") return "Play";
  return "Cute";
}

function idFromPath(path: string) {
  return (
    path
      .split("/")
      .at(-1)
      ?.replace(/\.[^.]+$/, "") ?? "sticker"
  );
}

export const STICKERS: Sticker[] = Object.entries(importedStickerModules)
  .map(([path, src]) => {
    const id = idFromPath(path);
    return {
      id,
      name: stickerNames[id] ?? id.replace(/[-_]+/g, " "),
      category: categoryFromPath(path),
      src,
    };
  })
  .sort((first, second) => stickerOrder.indexOf(first.id) - stickerOrder.indexOf(second.id));

export function stickerToSrc(sticker: Sticker) {
  return sticker.src;
}

export function getStickerDimensions(sticker: Sticker) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 160, height: 160 });
    image.src = sticker.src;
  });
}
