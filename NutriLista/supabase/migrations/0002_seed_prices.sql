-- Precios de referencia iniciales (MXN, aproximados — actualízalos por temporada).
-- La app empareja por el campo `normalized` (minúsculas, sin acentos).

insert into public.reference_prices (store, item, normalized, unit, price) values
-- Frutas y verduras
('Walmart','Papaya (pieza)','papaya','pieza',38),   ('Soriana','Papaya (pieza)','papaya','pieza',42),   ('Chedraui','Papaya (pieza)','papaya','pieza',40),
('Walmart','Jícama (pieza)','jicama','pieza',22),   ('Soriana','Jícama (pieza)','jicama','pieza',24),   ('Chedraui','Jícama (pieza)','jicama','pieza',23),
('Walmart','Nopales (kg)','nopal','kg',36),         ('Soriana','Nopales (kg)','nopal','kg',38),         ('Chedraui','Nopales (kg)','nopal','kg',35),
('Walmart','Limón (kg)','limon','kg',34),           ('Soriana','Limón (kg)','limon','kg',38),           ('Chedraui','Limón (kg)','limon','kg',36),
('Walmart','Plátano (kg)','platano','kg',24),       ('Soriana','Plátano (kg)','platano','kg',26),       ('Chedraui','Plátano (kg)','platano','kg',25),
('Walmart','Manzana (kg)','manzana','kg',49),       ('Soriana','Manzana (kg)','manzana','kg',54),       ('Chedraui','Manzana (kg)','manzana','kg',52),
('Walmart','Jitomate (kg)','jitomate','kg',32),     ('Soriana','Jitomate (kg)','jitomate','kg',35),     ('Chedraui','Jitomate (kg)','jitomate','kg',33),
('Walmart','Cebolla (kg)','cebolla','kg',28),       ('Soriana','Cebolla (kg)','cebolla','kg',31),       ('Chedraui','Cebolla (kg)','cebolla','kg',29),
('Walmart','Aguacate (kg)','aguacate','kg',75),     ('Soriana','Aguacate (kg)','aguacate','kg',82),     ('Chedraui','Aguacate (kg)','aguacate','kg',79),
('Walmart','Zanahoria (kg)','zanahoria','kg',18),   ('Soriana','Zanahoria (kg)','zanahoria','kg',20),   ('Chedraui','Zanahoria (kg)','zanahoria','kg',19),
('Walmart','Calabaza (kg)','calabaza','kg',26),     ('Soriana','Calabaza (kg)','calabaza','kg',29),     ('Chedraui','Calabaza (kg)','calabaza','kg',27),
('Walmart','Espinaca (manojo)','espinaca','manojo',18), ('Soriana','Espinaca (manojo)','espinaca','manojo',20), ('Chedraui','Espinaca (manojo)','espinaca','manojo',19),
('Walmart','Brócoli (pieza)','brocoli','pieza',32), ('Soriana','Brócoli (pieza)','brocoli','pieza',35), ('Chedraui','Brócoli (pieza)','brocoli','pieza',33),
('Walmart','Pepino (kg)','pepino','kg',22),         ('Soriana','Pepino (kg)','pepino','kg',24),         ('Chedraui','Pepino (kg)','pepino','kg',23),
-- Proteínas
('Walmart','Pechuga de pollo (kg)','pechuga de pollo','kg',115), ('Soriana','Pechuga de pollo (kg)','pechuga de pollo','kg',122), ('Chedraui','Pechuga de pollo (kg)','pechuga de pollo','kg',118),
('Walmart','Atún en agua (lata)','atun','lata',19), ('Soriana','Atún en agua (lata)','atun','lata',21), ('Chedraui','Atún en agua (lata)','atun','lata',20),
('Walmart','Huevo (docena)','huevo','docena',42),   ('Soriana','Huevo (docena)','huevo','docena',45),   ('Chedraui','Huevo (docena)','huevo','docena',43),
('Walmart','Carne molida de res (kg)','carne molida','kg',165), ('Soriana','Carne molida de res (kg)','carne molida','kg',175), ('Chedraui','Carne molida de res (kg)','carne molida','kg',169),
('Walmart','Filete de pescado (kg)','pescado','kg',145), ('Soriana','Filete de pescado (kg)','pescado','kg',155), ('Chedraui','Filete de pescado (kg)','pescado','kg',149),
('Walmart','Salmón (kg)','salmon','kg',320),        ('Soriana','Salmón (kg)','salmon','kg',345),        ('Chedraui','Salmón (kg)','salmon','kg',335),
-- Lácteos
('Walmart','Leche descremada (1 L)','leche','litro',26), ('Soriana','Leche descremada (1 L)','leche','litro',27), ('Chedraui','Leche descremada (1 L)','leche','litro',26),
('Walmart','Yogurt natural (1 L)','yogurt','litro',48),  ('Soriana','Yogurt natural (1 L)','yogurt','litro',52),  ('Chedraui','Yogurt natural (1 L)','yogurt','litro',50),
('Walmart','Queso panela (400 g)','queso panela','paquete',68), ('Soriana','Queso panela (400 g)','queso panela','paquete',74), ('Chedraui','Queso panela (400 g)','queso panela','paquete',71),
-- Abarrotes
('Walmart','Avena (800 g)','avena','paquete',36),   ('Soriana','Avena (800 g)','avena','paquete',39),   ('Chedraui','Avena (800 g)','avena','paquete',37),
('Walmart','Tortilla de maíz (kg)','tortilla','kg',22), ('Soriana','Tortilla de maíz (kg)','tortilla','kg',23), ('Chedraui','Tortilla de maíz (kg)','tortilla','kg',22),
('Walmart','Arroz (900 g)','arroz','paquete',28),   ('Soriana','Arroz (900 g)','arroz','paquete',31),   ('Chedraui','Arroz (900 g)','arroz','paquete',29),
('Walmart','Frijol negro (900 g)','frijol','paquete',38), ('Soriana','Frijol negro (900 g)','frijol','paquete',41), ('Chedraui','Frijol negro (900 g)','frijol','paquete',39),
('Walmart','Lenteja (500 g)','lenteja','paquete',26), ('Soriana','Lenteja (500 g)','lenteja','paquete',28), ('Chedraui','Lenteja (500 g)','lenteja','paquete',27),
('Walmart','Pan integral (paquete)','pan integral','paquete',46), ('Soriana','Pan integral (paquete)','pan integral','paquete',49), ('Chedraui','Pan integral (paquete)','pan integral','paquete',47),
('Walmart','Aceite de oliva (500 ml)','aceite de oliva','botella',95), ('Soriana','Aceite de oliva (500 ml)','aceite de oliva','botella',102), ('Chedraui','Aceite de oliva (500 ml)','aceite de oliva','botella',98),
('Walmart','Galletas saladas (paquete)','galletas saladas','paquete',24), ('Soriana','Galletas saladas (paquete)','galletas saladas','paquete',26), ('Chedraui','Galletas saladas (paquete)','galletas saladas','paquete',25);
