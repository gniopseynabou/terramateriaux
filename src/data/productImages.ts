/**
 * Images produits optimisées au build (vite-imagetools) :
 * conversion WebP + compression + 3 tailles (200 / 400 / 800 px)
 * servies via srcset pour n'envoyer que le poids nécessaire au device.
 */

// srcset responsive WebP
const srcSetModules = import.meta.glob("../assets/products/*.jpg", {
  query: "?w=200;400;800&format=webp&as=srcset",
  import: "default",
  eager: true,
}) as Record<string, string>;

// URL de repli (1 seule taille) pour les navigateurs sans support srcset
const srcModules = import.meta.glob("../assets/products/*.jpg", {
  query: "?w=400&format=webp",
  import: "default",
  eager: true,
}) as Record<string, string>;

const fileKey = (name: string) => `../assets/products/${name}.jpg`;

const bySlugFile: Record<string, string> = {
  "ciment-cem-ii": "ciment",
  "fer-beton-12mm": "fer-beton",
  "cable-electrique-2-5mm": "cable-electrique",
  "robinet-mitigeur": "robinet",
  "filtre-huile": "filtre-huile",
  "semences-mais": "semences-mais",
  "huile-arachide": "huile-arachide",
  "boubou-brode": "boubou",
  "creme-eclaircissante": "creme",
  "ventilateur-pied": "ventilateur",
  "briques-creuses": "briques",
  "disjoncteur-20a": "disjoncteur",
  "hijab-classique-noir": "hijab-noir",
  "hijab-soie-multicolore": "hijab-soie",
  "khimar-long": "khimar-long",
  "jilbab-priere": "jilbab-priere",
};

export const productImagesBySlug: Record<string, string> = Object.fromEntries(
  Object.entries(bySlugFile)
    .map(([slug, file]) => [slug, srcModules[fileKey(file)]])
    .filter(([, url]) => Boolean(url))
);

export const productSrcSetBySlug: Record<string, string> = Object.fromEntries(
  Object.entries(bySlugFile)
    .map(([slug, file]) => [slug, srcSetModules[fileKey(file)]])
    .filter(([, url]) => Boolean(url))
);

/** Résout image + srcset pour un produit (image_url distante prioritaire) */
export const resolveProductImage = (
  slug: string,
  imageUrl?: string | null
): { src: string; srcSet?: string } => {
  // N'utilise imageUrl de la DB que si c'est une vraie URL (http) ou un chemin absolu (/)
  if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('/'))) {
    return { src: imageUrl };
  }
  
  // Sinon, retombe sur les images locales de src/assets/products
  return {
    src: productImagesBySlug[slug] || "/placeholder.svg",
    srcSet: productSrcSetBySlug[slug],
  };
};
