-- Insert delivery zones for the 14 regions of Senegal
-- Each row is a city within a region

INSERT INTO public.delivery_zones (region, city, fee)
SELECT region, city, fee
FROM (VALUES
  ('Dakar', 'Dakar', 0),
  ('Dakar', 'Pikine', 0),
  ('Dakar', 'Guédiawaye', 0),
  ('Dakar', 'Rufisque', 0),
  ('Dakar', 'Keur Massar', 0),

  ('Diourbel', 'Diourbel', 0),
  ('Diourbel', 'Mbacké', 0),
  ('Diourbel', 'Bambey', 0),

  ('Fatick', 'Fatick', 0),
  ('Fatick', 'Foundiougne', 0),
  ('Fatick', 'Sokone', 0),

  ('Kaffrine', 'Kaffrine', 0),
  ('Kaffrine', 'Birkilane', 0),
  ('Kaffrine', 'Koungheul', 0),
  ('Kaffrine', 'Malem Hodar', 0),

  ('Kaolack', 'Kaolack', 0),
  ('Kaolack', 'Nioro du Rip', 0),
  ('Kaolack', 'Guinguinéo', 0),
  ('Kaolack', 'Mboss', 0),

  ('Kédougou', 'Kédougou', 0),
  ('Kédougou', 'Salémata', 0),
  ('Kédougou', 'Saraya', 0),

  ('Kolda', 'Kolda', 0),
  ('Kolda', 'Vélingara', 0),
  ('Kolda', 'Médina Yoro Foulah', 0),

  ('Louga', 'Louga', 0),
  ('Louga', 'Kébémer', 0),
  ('Louga', 'Linguère', 0),
  ('Louga', 'Dahra', 0),

  ('Matam', 'Matam', 0),
  ('Matam', 'Kanel', 0),
  ('Matam', 'Ranérou', 0),
  ('Matam', 'Ogo', 0),

  ('Saint-Louis', 'Saint-Louis', 0),
  ('Saint-Louis', 'Podor', 0),
  ('Saint-Louis', 'Dagana', 0),

  ('Sédhiou', 'Sédhiou', 0),
  ('Sédhiou', 'Bounkiling', 0),
  ('Sédhiou', 'Goudomp', 0),

  ('Tambacounda', 'Tambacounda', 0),
  ('Tambacounda', 'Bakel', 0),
  ('Tambacounda', 'Goudiry', 0),
  ('Tambacounda', 'Koumpentoum', 0),

  ('Thiès', 'Thiès', 0),
  ('Thiès', 'Mbour', 0),
  ('Thiès', 'Tivaouane', 0),
  ('Thiès', 'Djilor', 0),

  ('Ziguinchor', 'Ziguinchor', 0),
  ('Ziguinchor', 'Bignona', 0),
  ('Ziguinchor', 'Oussouye', 0)
) AS v(region, city, fee)
WHERE NOT EXISTS (
  SELECT 1 FROM public.delivery_zones dz
  WHERE dz.region = v.region AND dz.city = v.city
);
