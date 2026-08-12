-- Insert categories and products for local Supabase database
-- Adds the products corresponding to the images in src/assets/products

INSERT INTO public.categories (id, name, slug, description, icon_name, image_url)
VALUES
  ('46f1a8a6-9f18-4f1e-b513-2db3cdee4c41', 'Matériaux de construction', 'materiaux-construction', 'Ciment, fer, briques, sable et plus', 'building2', NULL),
  ('e7c057c1-4f73-4d3c-99fe-22041aa30c39', 'Électricité', 'electricite', 'Câbles, interrupteurs, tableaux électriques', 'zap', NULL),
  ('3ba9a6b7-f424-45f6-b2d9-1abed5cbabc2', 'Plomberie', 'plomberie', 'Tuyaux, robinets, sanitaires', 'droplets', NULL),
  ('92f4ae83-3b0b-4c05-8f22-9e9c31ccf7cc', 'Pièces détachées', 'pieces-detachees', 'Pièces auto, moto et machines', 'wrench', NULL),
  ('8350f9f2-6fca-4ab0-8c9f-5b75dd7f1d30', 'Agriculture', 'agriculture', 'Semences, engrais, outillage agricole', 'wheat', NULL),
  ('c7a96b0d-8dc7-4e03-94e1-01fc970206c3', 'Agro-alimentaire', 'agro-alimentaire', 'Produits alimentaires en gros et détail', 'utensils-crossed', NULL),
  ('5f061e00-31d3-4fab-8af4-6b4c48c4a8f1', 'Vêtements', 'vetements', 'Mode homme, femme et enfant', 'shirt', NULL),
  ('78a6d8b0-3c85-4ccb-bd02-91f37a8d8beb', 'Beauté', 'beaute', 'Cosmétiques, soins, parfums', 'sparkles', NULL),
  ('38211bbf-0649-4b54-ad68-9e1f0e2ae36a', 'Électroménager', 'electromenager', 'Appareils et accessoires pour la maison', 'tv', NULL)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  image_url = COALESCE(EXCLUDED.image_url, public.categories.image_url);

INSERT INTO public.products (id, name, slug, category_id, description, price_fcfa, price_gros, min_gros, image_url, in_stock, rating, reviews_count)
VALUES
  ('95d4a683-cee8-4e18-8372-aa7e2e493144', 'Ciment CEM II 42.5 (50kg)', 'ciment-cem-ii', (SELECT id FROM public.categories WHERE slug = 'materiaux-construction'), 'Sac de ciment haute résistance, idéal pour les constructions durables. Qualité certifiée, adapté aux conditions climatiques africaines.', 5500, 4800, 50, 'ciment.jpg', true, 4.8, 124),
  ('2803c6de-8b90-4b9d-9146-3a41f9d8a3ed', 'Fer à béton Ø12mm (barre 12m)', 'fer-beton-12mm', (SELECT id FROM public.categories WHERE slug = 'materiaux-construction'), 'Barre de fer à béton de haute qualité pour armature. Résistance optimale pour fondations et dalles.', 4200, 3600, 100, 'fer-beton.jpg', true, 4.6, 89),
  ('7b1f5d9f-ec1a-4a22-97ef-8ba9431f0720', 'Câble électrique 2.5mm² (100m)', 'cable-electrique-2-5mm', (SELECT id FROM public.categories WHERE slug = 'electricite'), 'Câble électrique rigide en cuivre, norme NF. Parfait pour installations résidentielles et commerciales.', 35000, 30000, 10, 'cable-electrique.jpg', true, 4.7, 56),
  ('4c7aed1c-5d22-4e79-9801-9272e5fa6f2d', 'Robinet mitigeur chromé', 'robinet-mitigeur', (SELECT id FROM public.categories WHERE slug = 'plomberie'), 'Robinet mitigeur en laiton chromé, finition brillante. Installation facile, garantie 2 ans.', 18000, 14500, 20, 'robinet.jpg', true, 4.5, 34),
  ('1f8d42b3-a4cb-41f4-bf12-32bceb9dca2b', 'Filtre à huile universel', 'filtre-huile', (SELECT id FROM public.categories WHERE slug = 'pieces-detachees'), 'Filtre à huile compatible avec la plupart des véhicules. Haute capacité de filtration.', 3500, 2800, 30, 'filtre-huile.jpg', true, 4.4, 67),
  ('8e0ff38f-6e8b-4b65-98f8-4c1c6dbbe228', 'Semences de maïs (5kg)', 'semences-mais', (SELECT id FROM public.categories WHERE slug = 'agriculture'), 'Semences certifiées, haut rendement. Adaptées au climat sahélien.', 12000, 9500, 20, 'semences-mais.jpg', true, 4.9, 45),
  ('2f03b931-ae2d-4f0a-9e54-d37a2294f8f0', 'Huile d''arachide (20L)', 'huile-arachide', (SELECT id FROM public.categories WHERE slug = 'agro-alimentaire'), 'Huile d''arachide pure, première pression. Qualité premium pour usage domestique et professionnel.', 25000, 21000, 10, 'huile-arachide.jpg', true, 4.7, 78),
  ('5beca7ef-bbf1-46b2-8c2c-1a12cc258f3d', 'Boubou brodé homme', 'boubou-brode', (SELECT id FROM public.categories WHERE slug = 'vetements'), 'Boubou traditionnel en bazin riche, broderie fine. Élégance et confort pour toutes les occasions.', 35000, 28000, 10, 'boubou.jpg', true, 4.8, 92),
  ('20a3a587-1c9d-42e4-9e4d-5ffb2fb5671f', 'Crème éclaircissante naturelle', 'creme-eclaircissante', (SELECT id FROM public.categories WHERE slug = 'beaute'), 'Crème à base d''ingrédients naturels. Sans hydroquinone. Résultat visible en 2 semaines.', 8500, 6500, 24, 'creme.jpg', true, 4.3, 156),
  ('a71a6d68-0a17-4f4e-bbae-09f5a8d64bc2', 'Ventilateur sur pied 18"', 'ventilateur-pied', (SELECT id FROM public.categories WHERE slug = 'electromenager'), 'Ventilateur 3 vitesses, oscillation 90°. Silencieux et puissant. Idéal pour les grandes pièces.', 22000, 18000, 10, 'ventilateur.jpg', true, 4.6, 43),
  ('47a3c6d8-2441-4f26-8858-0e0bd25c6b4f', 'Briques creuses 15x20x40', 'briques-creuses', (SELECT id FROM public.categories WHERE slug = 'materiaux-construction'), 'Briques creuses de qualité supérieure. Résistantes et légères pour murs porteurs et cloisons.', 350, 280, 500, 'briques.jpg', true, 4.5, 67),
  ('3e7b2d70-1a3c-4839-9df9-56c35a2d1234', 'Disjoncteur 20A', 'disjoncteur-20a', (SELECT id FROM public.categories WHERE slug = 'electricite'), 'Disjoncteur modulaire 20 ampères. Protection fiable pour circuits électriques résidentiels.', 8500, 7000, 20, 'disjoncteur.jpg', false, 4.7, 38),
  ('8c6b56cb-1df4-4fde-8e93-4a0cc9e93430', 'Hijab classique noir', 'hijab-classique-noir', (SELECT id FROM public.categories WHERE slug = 'vetements'), 'Hijab en tissu léger et confortable, coupe élégante et finition mate. Parfait pour un style quotidien discret.', 8500, 7200, 10, 'hijab-noir.jpg', true, 4.7, 52),
  ('5d3c8a06-f9dd-4bb7-95b7-94f1b3470e14', 'Hijab en soie multicolore', 'hijab-soie-multicolore', (SELECT id FROM public.categories WHERE slug = 'vetements'), 'Hijab en soie douce aux motifs colorés. Idéal pour les occasions spéciales et les tenues élégantes.', 12000, 9800, 8, 'hijab-soie.jpg', true, 4.8, 38),
  ('988f1d3e-676e-4dfc-8b0e-e7dd1ca4dfc6', 'Khimar long', 'khimar-long', (SELECT id FROM public.categories WHERE slug = 'vetements'), 'Khimar long couvrant, confectionné dans un tissu léger et fluide pour un confort optimal lors des prières.', 18000, 15000, 5, 'khimar-long.jpg', true, 4.6, 26),
  ('a13f0d8b-5e2f-4b41-92a6-b731d92fba2f', 'Jilbab de prière', 'jilbab-priere', (SELECT id FROM public.categories WHERE slug = 'vetements'), 'Jilbab ample pour la prière, tissu respirant et doux. Confort garanti pour un usage quotidien.', 22000, 18500, 5, 'jilbab-priere.jpg', true, 4.9, 33)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  price_fcfa = EXCLUDED.price_fcfa,
  price_gros = EXCLUDED.price_gros,
  min_gros = EXCLUDED.min_gros,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock,
  rating = EXCLUDED.rating,
  reviews_count = EXCLUDED.reviews_count;
