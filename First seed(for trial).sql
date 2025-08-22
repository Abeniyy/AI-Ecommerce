INSERT INTO public.products (name, description, sku, price, category, stock)
VALUES 
 ('Ethiopian Coffee Beans','Single-origin, medium roast','ETH-COF-250',14.99,'coffee',100),
 ('Berbere Spice Blend','Fragrant Ethiopian spice mix','ETH-SPC-001',8.50,'spice',200),
 ('Traditional Scarf (Netela)','Handwoven cotton scarf','ETH-TXT-NE01',24.00,'attire',50)
ON CONFLICT DO NOTHING;
