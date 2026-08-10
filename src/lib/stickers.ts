export interface Sticker {
  id: string;
  name: string;
  subject: StickerSubject;
  src: string;
}

export const STICKER_SUBJECTS = [
  "Happy",
  "Love",
  "Animals",
  "Food & Drink",
  "Nature",
  "Activities",
  "Things",
] as const;

export type StickerSubject = (typeof STICKER_SUBJECTS)[number];

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
  "teddy-bear": "Teddy Bear",
  "kitty-face": "Kitty",
  lollipop: "Lollipop",
  flower: "Flower",
  butterfly: "Butterfly",
  sun: "Sun",
  "cloud-rain": "Cloud",
  fish: "Fish",
  mushroom: "Mushroom",
  leaf: "Leaf",
  ladybug: "Ladybug",
  balloon: "Balloon",
  rocket: "Rocket",
  diamond: "Diamond",
  cupcake: "Cupcake",
  "soccer-ball": "Soccer Ball",
  "gift-box": "Gift Box",
  kite: "Kite",
};

const stickerOrder = [
  "smile-face",
  "angel_smile",
  "angry_steam",
  "big_grin",
  "blowing_a_kiss",
  "blushing_smile",
  "clown_face",
  "heart",
  "bunny",
  "panda-face",
  "teddy-bear",
  "kitty-face",
  "fish",
  "bee",
  "ladybug",
  "butterfly",
  "lollipop",
  "strawberry",
  "cupcake",
  "mushroom",
  "acorn",
  "crescent-moon",
  "rainbow-cloud",
  "happy-star",
  "flower",
  "tulip",
  "leaf",
  "sun",
  "cloud-rain",
  "balloon",
  "kite",
  "soccer-ball",
  "drum",
  "magic-wand",
  "gift-box",
  "diamond",
  "rocket",
  "toy-train",
];

const stickerSubjects: Record<string, StickerSubject> = {
  "smile-face": "Happy",
  angel_smile: "Happy",
  angry_steam: "Happy",
  big_grin: "Happy",
  blowing_a_kiss: "Happy",
  blushing_smile: "Happy",
  clown_face: "Happy",
  "happy-star": "Nature",
  "rainbow-cloud": "Nature",
  "crescent-moon": "Nature",
  heart: "Love",
  bunny: "Animals",
  "panda-face": "Animals",
  "kitty-face": "Animals",
  "teddy-bear": "Animals",
  fish: "Animals",
  bee: "Animals",
  ladybug: "Animals",
  butterfly: "Animals",
  lollipop: "Food & Drink",
  strawberry: "Food & Drink",
  cupcake: "Food & Drink",
  mushroom: "Food & Drink",
  acorn: "Nature",
  flower: "Nature",
  tulip: "Nature",
  leaf: "Nature",
  sun: "Nature",
  "cloud-rain": "Nature",
  balloon: "Activities",
  kite: "Activities",
  "soccer-ball": "Activities",
  drum: "Activities",
  "magic-wand": "Activities",
  "gift-box": "Things",
  diamond: "Things",
  rocket: "Things",
  "toy-train": "Things",
};

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
      subject: stickerSubjects[id] ?? "Things",
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
