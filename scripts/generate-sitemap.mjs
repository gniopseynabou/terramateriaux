// Génère public/sitemap.xml à partir des catégories et produits Supabase.
// Ne fait jamais échouer le build : en cas de problème, le sitemap existant est conservé.
import { writeFile } from "node:fs/promises";

// En local, charge le fichier .env (Node 20.12+). Sur Netlify, les variables sont déjà là.
try {
  process.loadEnvFile(".env");
} catch {
  /* pas de .env : on utilise les variables d'environnement du système */
}

const SITE_URL = "https://terra-materriaux.com";
const OUTPUT = "public/sitemap.xml";
const STATIC_PATHS = ["/", "/catalogue", "/a-propos", "/contact", "/livraison"];

const env = process.env;
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY;

const escapeXml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function fetchRows(table, select) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=slug.asc&limit=1000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table} : HTTP ${res.status}`);
  return res.json();
}

const entry = (path, lastmod) =>
  `  <url>\n    <loc>${escapeXml(SITE_URL + path)}</loc>\n` +
  (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
  `  </url>`;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] URL ou clé Supabase absente : sitemap existant conservé.");
    return;
  }

  const [categories, products] = await Promise.all([
    fetchRows("categories", "slug"),
    fetchRows("products", "slug,updated_at"),
  ]);

  if (categories.length === 0 && products.length === 0) {
    console.warn("[sitemap] aucune donnée reçue : sitemap existant conservé.");
    return;
  }

  const entries = [
    ...STATIC_PATHS.map((p) => entry(p)),
    ...categories
      .filter((c) => c.slug)
      .map((c) => entry(`/catalogue/${encodeURIComponent(c.slug)}`)),
    ...products
      .filter((p) => p.slug)
      .map((p) => entry(`/produit/${encodeURIComponent(p.slug)}`, p.updated_at?.slice(0, 10))),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries.join("\n")}\n</urlset>\n`;

  await writeFile(OUTPUT, xml, "utf8");
  console.log(`[sitemap] ${entries.length} URL écrites dans ${OUTPUT}`);
}

main().catch((err) => {
  console.warn("[sitemap] échec, sitemap existant conservé :", err.message);
});