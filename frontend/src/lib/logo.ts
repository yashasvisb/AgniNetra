/// <reference types="vite/client" />

// Finds the Agni Netra logo automatically, whatever the file is called.
// Looks in src/assets first, then in public/.

const assetModules = import.meta.glob(
  "../assets/*.{png,jpg,jpeg,svg,webp,PNG,JPG,JPEG,SVG,WEBP}",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const assetLogos = Object.entries(assetModules)
  .filter(([path]) => {
    const name = path.toLowerCase();
    return name.includes("logo") || name.includes("agni");
  })
  .sort(([a], [b]) => {
    const aScore = a.toLowerCase().includes("logo") ? 0 : 1;
    const bScore = b.toLowerCase().includes("logo") ? 0 : 1;
    return aScore - bScore;
  })
  .map(([, url]) => url);

const publicLogos = [
  "/agninetra-logo.jpg",
  "/agninetra-logo.jpeg",
  "/agninetra-logo.png",
  "/AgniNetra logo.jpeg",
  "/logo.jpeg",
  "/logo.jpg",
  "/logo.png",
].map((path) => encodeURI(path));

export const LOGO_SOURCES: string[] = [...assetLogos, ...publicLogos];

/** Uses the logo as the browser tab icon. */
export function applyFavicon() {
  const tryLoad = (index: number) => {
    if (index >= LOGO_SOURCES.length) {
      return;
    }

    const probe = new Image();

    probe.onload = () => {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");

      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }

      link.removeAttribute("type");
      link.href = LOGO_SOURCES[index];
    };

    probe.onerror = () => tryLoad(index + 1);
    probe.src = LOGO_SOURCES[index];
  };

  tryLoad(0);
}