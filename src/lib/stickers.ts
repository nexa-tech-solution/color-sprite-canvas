export interface Sticker {
  id: string;
  name: string;
  category: "Cute" | "Nature" | "Play";
  width: number;
  height: number;
  svg: string;
}

export const STICKERS: Sticker[] = [
  {
    id: "rainbow-cloud",
    name: "Rainbow",
    category: "Cute",
    width: 180,
    height: 118,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 118"><path d="M29 80a61 61 0 0 1 122 0" fill="none" stroke="#ff7aa8" stroke-width="18" stroke-linecap="round"/><path d="M47 80a43 43 0 0 1 86 0" fill="none" stroke="#ffd166" stroke-width="18" stroke-linecap="round"/><path d="M65 80a25 25 0 0 1 50 0" fill="none" stroke="#67d7a5" stroke-width="18" stroke-linecap="round"/><path d="M40 84c-14 0-25 8-25 18 0 9 9 16 21 16h109c12 0 21-7 21-16 0-10-11-18-25-18-5-11-17-18-31-18-8 0-16 3-22 8-7-9-18-14-31-14-18 0-33 10-39 24z" fill="#fff" stroke="#dbe7f2" stroke-width="4"/></svg>`,
  },
  {
    id: "happy-star",
    name: "Star",
    category: "Cute",
    width: 128,
    height: 128,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="m64 9 15 35 38 3-29 25 9 37-33-20-33 20 9-37-29-25 38-3z" fill="#ffe066" stroke="#f59f00" stroke-width="5" stroke-linejoin="round"/><path d="M50 61c2 5 6 7 14 7s12-2 14-7" fill="none" stroke="#3c4257" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="5" fill="#3c4257"/><circle cx="79" cy="52" r="5" fill="#3c4257"/></svg>`,
  },
  {
    id: "smile-face",
    name: "Smile",
    category: "Cute",
    width: 128,
    height: 128,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="50" fill="#fff8c7" stroke="#f4bf45" stroke-width="5"/><circle cx="47" cy="54" r="6" fill="#2f3546"/><circle cx="81" cy="54" r="6" fill="#2f3546"/><path d="M42 72c6 14 15 21 22 21s16-7 22-21" fill="none" stroke="#2f3546" stroke-width="5" stroke-linecap="round"/><circle cx="36" cy="68" r="8" fill="#ffb5c8" opacity=".75"/><circle cx="92" cy="68" r="8" fill="#ffb5c8" opacity=".75"/></svg>`,
  },
  {
    id: "bunny",
    name: "Bunny",
    category: "Cute",
    width: 132,
    height: 150,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 150"><path d="M43 48C27 18 30 3 41 3c12 0 19 22 22 43M79 48C94 18 91 3 80 3 68 3 62 25 61 47" fill="#fff" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/><ellipse cx="66" cy="82" rx="47" ry="43" fill="#fff" stroke="#cbd5e1" stroke-width="5"/><path d="M52 83h.1M80 83h.1" stroke="#263241" stroke-width="8" stroke-linecap="round"/><path d="M64 91h5l-3 4z" fill="#ff8fb3"/><path d="M55 104c7 5 15 5 22 0" fill="none" stroke="#263241" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="95" r="8" fill="#ffd6e4"/><circle cx="98" cy="95" r="8" fill="#ffd6e4"/></svg>`,
  },
  {
    id: "flower",
    name: "Flower",
    category: "Nature",
    width: 128,
    height: 128,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M64 72c-13-9-23-5-30 8-9-10-8-23 5-29-4-14 4-25 18-24 6-14 20-17 30-7 13-5 25 2 27 17 14 4 18 17 11 30 9 11 5 25-8 31-1 15-12 24-27 20-10 11-25 9-33-3-14 3-25-6-25-21 7-13 17-17 32-22z" fill="#ffd1dc" stroke="#e9879f" stroke-width="4" stroke-linejoin="round"/><circle cx="64" cy="70" r="17" fill="#ffe066" stroke="#f4b83d" stroke-width="4"/></svg>`,
  },
  {
    id: "butterfly",
    name: "Butterfly",
    category: "Nature",
    width: 150,
    height: 118,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 118"><path d="M72 61C45 17 13 8 9 33 5 59 34 72 70 68z" fill="#bde7ff" stroke="#5aa9d6" stroke-width="4"/><path d="M78 61c27-44 59-53 63-28 4 26-25 39-61 35z" fill="#ffd6e4" stroke="#e785a6" stroke-width="4"/><path d="M70 66C41 70 25 88 37 104c12 15 35 0 38-34z" fill="#d9f99d" stroke="#8ac75d" stroke-width="4"/><path d="M80 66c29 4 45 22 33 38-12 15-35 0-38-34z" fill="#f8c8ff" stroke="#b873cc" stroke-width="4"/><rect x="69" y="45" width="12" height="45" rx="6" fill="#5b6275"/><path d="M73 44c-6-13-15-20-25-22M77 44c6-13 15-20 25-22" fill="none" stroke="#5b6275" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "sun",
    name: "Sun",
    category: "Nature",
    width: 128,
    height: 128,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M64 6v18M64 104v18M6 64h18M104 64h18M23 23l13 13M92 92l13 13M105 23 92 36M36 92l-13 13" stroke="#f5a623" stroke-width="8" stroke-linecap="round"/><circle cx="64" cy="64" r="36" fill="#ffd166" stroke="#f5a623" stroke-width="5"/><circle cx="51" cy="58" r="5" fill="#303747"/><circle cx="77" cy="58" r="5" fill="#303747"/><path d="M50 75c8 8 20 8 28 0" fill="none" stroke="#303747" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: "cloud-rain",
    name: "Cloud",
    category: "Nature",
    width: 148,
    height: 120,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 120"><path d="M43 74c-18 0-31-11-31-25 0-15 14-26 32-25 8-14 23-22 41-20 22 2 38 18 40 38 9 4 15 12 15 22 0 14-13 25-31 25H43z" fill="#fff" stroke="#cbd5e1" stroke-width="5"/><path d="M43 96 32 112M73 96l-11 16M103 96l-11 16" stroke="#60a5fa" stroke-width="7" stroke-linecap="round"/></svg>`,
  },
  {
    id: "balloon",
    name: "Balloon",
    category: "Play",
    width: 118,
    height: 150,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 150"><ellipse cx="58" cy="46" rx="38" ry="42" fill="#ff9fba" stroke="#d95c81" stroke-width="5"/><path d="M58 89c-11 13-14 24-9 34 5 11 21 8 15 24" fill="none" stroke="#7b8794" stroke-width="4" stroke-linecap="round"/><path d="m50 84 8 13 9-13z" fill="#ff9fba" stroke="#d95c81" stroke-width="4" stroke-linejoin="round"/><path d="M46 25c-9 8-11 21-7 33" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/></svg>`,
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "Play",
    width: 128,
    height: 150,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 150"><path d="M66 7c30 29 32 66 4 94l-41 16 16-41C40 48 45 25 66 7z" fill="#fff" stroke="#64748b" stroke-width="5" stroke-linejoin="round"/><circle cx="70" cy="48" r="14" fill="#bde7ff" stroke="#60a5fa" stroke-width="5"/><path d="m45 76-21 1-13 25 31-9M70 101l-1 21-25 13 9-31" fill="#ffb86b" stroke="#d17735" stroke-width="5" stroke-linejoin="round"/><path d="M38 119c-7 4-13 11-17 22 12-3 20-9 25-17z" fill="#ffd166" stroke="#f59f00" stroke-width="4"/></svg>`,
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "Play",
    width: 128,
    height: 112,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 112"><path d="m26 12 76 1 19 29-57 63L7 42z" fill="#c7f9ff" stroke="#67b7d1" stroke-width="5" stroke-linejoin="round"/><path d="M27 13 45 43 64 14l19 29 19-30M7 42h114M45 43l19 62 19-62" fill="none" stroke="#67b7d1" stroke-width="4" stroke-linejoin="round"/></svg>`,
  },
  {
    id: "cupcake",
    name: "Cupcake",
    category: "Play",
    width: 128,
    height: 136,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 136"><path d="M35 61c-12-16-2-35 16-31 7-20 34-19 40 1 16-1 25 17 16 30z" fill="#fff0f5" stroke="#df7a9b" stroke-width="5"/><path d="M33 64h62l-9 57H42z" fill="#ffd166" stroke="#d8992c" stroke-width="5" stroke-linejoin="round"/><path d="M47 72v39M64 72v43M81 72v39" stroke="#d8992c" stroke-width="4"/><circle cx="61" cy="23" r="8" fill="#ff6b8a"/><path d="M49 50h.1M78 49h.1" stroke="#784255" stroke-width="7" stroke-linecap="round"/></svg>`,
  },
  {
    id: "heart",
    name: "Heart",
    category: "Cute",
    width: 128,
    height: 116,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 116"><path d="M64 105C36 80 13 60 15 35 16 16 31 7 47 12c8 3 14 9 17 16 3-7 9-13 17-16 16-5 31 4 32 23 2 25-21 45-49 70z" fill="#ff8fb3" stroke="#d85b84" stroke-width="5" stroke-linejoin="round"/><path d="M36 28c-6 6-8 14-6 24" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".55"/></svg>`,
  },
  {
    id: "fish",
    name: "Fish",
    category: "Nature",
    width: 150,
    height: 98,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 98"><path d="M103 48c14-17 27-23 39-22-5 12-5 30 0 43-13 1-26-6-39-21z" fill="#ffb86b" stroke="#d97a31" stroke-width="5" stroke-linejoin="round"/><ellipse cx="65" cy="49" rx="53" ry="34" fill="#8bd3ff" stroke="#3b9dcc" stroke-width="5"/><circle cx="37" cy="43" r="5" fill="#293241"/><path d="M26 57c7 5 16 5 23 0" fill="none" stroke="#293241" stroke-width="4" stroke-linecap="round"/><path d="M76 20c7 15 8 36 0 58" stroke="#3b9dcc" stroke-width="4"/></svg>`,
  },
];

export function stickerToDataUrl(sticker: Sticker) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sticker.svg)}`;
}
