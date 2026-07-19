export interface ColoringPage {
  id: string;
  name: string;
  category: "Cute" | "Fantasy" | "Play" | "Imported";
  width?: number;
  height?: number;
  src?: string;
  svg?: string;
}

const importedColoringPageModules = import.meta.glob<string>(
  "../assets/coloring-pages/**/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

const pageShell =
  'fill="none" stroke="#111827" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"';
const pageThin =
  'fill="none" stroke="#111827" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';

const FALLBACK_COLORING_PAGES: ColoringPage[] = [
  {
    id: "garden-friend",
    name: "Garden Friend",
    category: "Cute",
    width: 520,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 640"><rect width="520" height="640" fill="transparent"/><path ${pageShell} d="M162 338c-42 26-70 76-69 133 2 78 70 127 167 127s165-49 167-127c1-57-27-107-69-133"/><path ${pageShell} d="M137 247c0-82 55-151 124-151s124 69 124 151c0 91-54 142-124 142s-124-51-124-142z"/><path ${pageThin} d="M147 235c30-71 81-99 141-108M186 133c48 70 112 54 159 124M171 191c-22 28-36 65-36 99M359 188c22 28 36 64 36 99"/><path ${pageShell} d="M203 258c9-13 31-13 40 0M278 258c9-13 31-13 40 0M237 311c12 12 34 12 48 0"/><path ${pageThin} d="M195 355c-24 56-15 116 12 161M326 355c24 56 15 116-12 161M180 429h160M164 490h192"/><path ${pageShell} d="M122 425c-52 12-75 41-67 75 31-8 58-26 76-57M398 425c52 12 75 41 67 75-31-8-58-26-76-57"/><path ${pageThin} d="M74 139c17-31 45-31 62 0-17 30-45 30-62 0zM397 116c29-10 49 8 45 38-31 11-51-8-45-38zM67 575c20-22 43-21 62 3M416 558c25-12 45-5 61 17M72 300c-20-13-25-33-15-54 26 1 42 16 48 42M440 306c22-10 30-29 23-52-26-2-44 11-53 36"/></svg>`,
  },
  {
    id: "cake-princess",
    name: "Cake Princess",
    category: "Cute",
    width: 520,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 640"><rect width="520" height="640" fill="transparent"/><path ${pageShell} d="M150 312c-22 8-38 30-38 57 0 64 63 106 148 106s148-42 148-106c0-27-16-49-38-57"/><path ${pageShell} d="M167 267c-27-44-9-101 42-114 17-46 81-57 113-16 55 2 87 57 60 110 17 31 6 71-27 89-58 31-141 31-199 0-34-18-44-57-27-89z"/><path ${pageThin} d="M172 249c29-8 57-24 75-51M239 181c13 39 44 63 93 69M342 184c4 29 21 54 46 71"/><path ${pageShell} d="M216 280c8-12 27-12 35 0M287 280c8-12 27-12 35 0M245 326c10 10 29 10 41 0"/><path ${pageThin} d="M199 396c41 25 82 25 123 0M173 435c58 32 116 32 174 0"/><path ${pageShell} d="M101 476h318l-31 104H132zM130 579h260"/><path ${pageThin} d="M145 502c31 26 64 26 95 0 31 26 64 26 95 0 22 18 43 23 64 14M171 525v37M224 524v38M277 524v38M330 524v38"/><path ${pageThin} d="M63 171c18 0 33 15 33 33M96 171c0 18-15 33-33 33M424 126c18 0 33 15 33 33M457 126c0 18-15 33-33 33M95 92c22 12 48 12 70 0M350 74c35 18 67 18 96 0"/></svg>`,
  },
  {
    id: "kimono-day",
    name: "Kimono Day",
    category: "Cute",
    width: 520,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 640"><rect width="520" height="640" fill="transparent"/><path ${pageShell} d="M155 273c-18-83 29-163 105-163s123 80 105 163c-9 42-47 72-105 72s-96-30-105-72z"/><path ${pageThin} d="M161 246c45-75 101-100 168-72M192 138c39 49 92 75 160 79M163 214c-32 29-50 69-52 121M357 214c32 29 50 69 52 121"/><path ${pageShell} d="M204 261c8-12 27-12 35 0M281 261c8-12 27-12 35 0M241 311c10 9 28 9 39 0"/><path ${pageShell} d="M176 352c-50 31-74 87-72 173 54 38 106 57 156 57s102-19 156-57c2-86-22-142-72-173"/><path ${pageThin} d="M177 363c23 54 50 93 83 119 33-26 60-65 83-119M141 434c70 22 168 22 238 0M132 510c82 30 174 30 256 0M235 397h50M215 464h90"/><path ${pageShell} d="M104 160c-30 8-48 30-50 66 39-3 64-24 75-61M416 160c30 8 48 30 50 66-39-3-64-24-75-61"/><path ${pageThin} d="M68 85c26 0 48 22 48 48M116 85c0 26-22 48-48 48M425 84c-19 13-43 13-62 0M63 584c27-22 55-22 84 0M373 584c29-22 57-22 84 0"/></svg>`,
  },
  {
    id: "unicorn-cloud",
    name: "Unicorn Cloud",
    category: "Fantasy",
    width: 560,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 640"><rect width="560" height="640" fill="transparent"/><path ${pageShell} d="M164 398c-55 0-99 34-99 76 0 39 38 72 87 76h268c49-4 87-37 87-76 0-42-44-76-99-76-16-45-63-78-119-78-57 0-104 33-125 78z"/><path ${pageShell} d="M200 327c-35-51-17-112 41-132 15-63 86-92 144-62 70 36 94 132 47 196-33 45-92 60-146 37"/><path ${pageThin} d="M247 207c39 40 91 54 156 43M309 133c-7 53-32 89-75 108M397 201c38 14 64 42 79 84"/><path ${pageShell} d="M257 279c9-12 29-12 38 0M341 279c9-12 29-12 38 0M302 326c13 11 32 11 47 0"/><path ${pageShell} d="M353 123 374 50l37 67"/><path ${pageThin} d="M363 101h35M369 81h19M225 376c-27 28-42 64-43 108M372 372c29 30 44 66 45 109M154 483c80 32 175 32 270 0"/><path ${pageThin} d="M77 172c38 0 70 31 70 69M147 172c0 38-32 69-70 69M430 82c25 14 55 14 80 0M59 332c22-20 47-20 70 0M473 323c23-16 45-13 66 9"/></svg>`,
  },
  {
    id: "space-kitty",
    name: "Space Kitty",
    category: "Fantasy",
    width: 560,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 640"><rect width="560" height="640" fill="transparent"/><path ${pageShell} d="M173 286c-42-12-73-54-73-104 0-60 45-109 100-109 26 0 49 11 67 29 18-18 41-29 67-29 55 0 100 49 100 109 0 50-31 92-73 104"/><path ${pageShell} d="M150 257c-35-61-43-103-24-137l55 51M410 257c35-61 43-103 24-137l-55 51"/><path ${pageShell} d="M156 301c0-77 50-133 124-133s124 56 124 133c0 83-49 130-124 130s-124-47-124-130z"/><path ${pageShell} d="M221 300c8-12 27-12 35 0M305 300c8-12 27-12 35 0M261 346c12 11 28 11 40 0"/><path ${pageThin} d="M201 372c-42 34-70 81-84 143 38 40 92 60 163 60s125-20 163-60c-14-62-42-109-84-143M197 462c53 24 113 24 166 0M202 518c49 22 107 22 156 0"/><path ${pageShell} d="M402 158c30-18 64-14 94 12-24 34-57 46-99 33"/><path ${pageThin} d="M424 180h61M67 94l18 37 41 6-30 29 7 40-36-19-36 19 7-40-30-29 41-6zM440 404c28 0 51 23 51 51M491 404c0 28-23 51-51 51M62 451c28-23 58-23 90 0"/></svg>`,
  },
  {
    id: "balloon-ride",
    name: "Balloon Ride",
    category: "Play",
    width: 520,
    height: 640,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 640"><rect width="520" height="640" fill="transparent"/><path ${pageShell} d="M260 61c75 0 134 59 134 132 0 82-74 172-134 224-60-52-134-142-134-224 0-73 59-132 134-132z"/><path ${pageThin} d="M260 62c-32 77-32 202 0 354M171 129c52 32 126 32 178 0M145 220c71 35 159 35 230 0M178 319c49 27 115 27 164 0"/><path ${pageShell} d="M187 431h146l-22 121H209zM213 552h94"/><path ${pageThin} d="M210 451v79M260 451v79M310 451v79M184 411l31 42M336 411l-31 42"/><path ${pageShell} d="M216 485c9-12 27-12 36 0M268 485c9-12 27-12 36 0M243 520c12 8 26 8 38 0"/><path ${pageThin} d="M62 138c30 0 55 24 55 55M117 138c0 30-25 55-55 55M408 96c25 14 52 14 77 0M65 526c30-24 61-24 94 0M374 576c29-22 58-22 87 0"/></svg>`,
  },
];

function titleFromPath(path: string) {
  const filename =
    path
      .split("/")
      .at(-1)
      ?.replace(/\.[^.]+$/, "") ?? "Coloring Page";

  return filename
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function categoryFromPath(path: string): ColoringPage["category"] {
  const folder = path.split("/").at(-2)?.toLowerCase();

  if (folder === "cute") return "Cute";
  if (folder === "fantasy") return "Fantasy";
  if (folder === "play") return "Play";

  return "Imported";
}

const importedColoringPages = Object.entries(importedColoringPageModules).map(
  ([path, src]): ColoringPage => ({
    id: path.replace(/^\.\.\/assets\/coloring-pages\//, "").replace(/\.[^.]+$/, ""),
    name: titleFromPath(path),
    category: categoryFromPath(path),
    src,
  }),
);

export const COLORING_PAGES: ColoringPage[] =
  importedColoringPages.length > 0 ? importedColoringPages : FALLBACK_COLORING_PAGES;

export function coloringPageToSrc(page: ColoringPage) {
  if (page.src) return page.src;
  if (!page.svg) return "";

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(page.svg)}`;
}
