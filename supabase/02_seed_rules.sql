-- ============================================================
-- GRASOLIMPIADAS · Seed del catálogo de reglas
-- Sistema de puntos completo. Editable desde aquí o desde la DB.
-- ============================================================

insert into rules (regla_key, categoria, descripcion, puntos, tipo, automatica, orden) values

-- ---------------- SUMA ----------------
-- Nutrición
('nutri_saludable_dia',   'Nutrición',   'Comer saludable todo el día',              3, 'suma', false, 10),
('nutri_deficit_superavit','Nutrición',  'Cumplir déficit o superávit calórico',     1, 'suma', false, 11),
('nutri_evitar_ultra',    'Nutrición',   'Evitar ultraprocesados',                   1, 'suma', false, 12),

-- Ejercicio
('ejer_entreno_completo', 'Ejercicio',   'Entrenamiento completo',                   4, 'suma', false, 20),
('ejer_actividad_ligera', 'Ejercicio',   'Actividad ligera (8k pasos)',              2, 'suma', false, 21),
('ejer_extra_cardio',     'Ejercicio',   'Extra (cardio/clase) mínimo una hora',     2, 'suma', false, 22),

-- Hidratación
('hidra_2l',              'Hidratación', '+2L de agua',                              2, 'suma', false, 30),
('hidra_1a2l',            'Hidratación', '1–2L de agua',                             1, 'suma', false, 31),

-- Sueño
('sueno_7a8',             'Sueño',       'Dormir 7–8h',                              2, 'suma', false, 40),
('sueno_6',               'Sueño',       'Dormir 6h',                                1, 'suma', false, 41),

-- Bienestar
('bien_mente',            'Bienestar',   'Meditación / journaling / misa / leer',    2, 'suma', false, 50),
('bien_sin_pantallas',    'Bienestar',   '1h sin pantallas',                         1, 'suma', false, 51),

-- Bonus (nota: sin rachas; se mantienen los bonus de día)
('bonus_antes_7am',       'Bonus',       'Levantarse antes de 7am',                  1, 'suma', false, 60),
('bonus_sin_azucar',      'Bonus',       'Día sin azúcar',                           1, 'suma', false, 61),

-- ---------------- RESTA ----------------
-- Alimentación
('rest_chatarra',         'Alimentación','Comida chatarra',                         -3, 'resta', false, 100),
('rest_postres',          'Alimentación','Postres / dulces grandes',                -2, 'resta', false, 101),
('rest_bebidas_azuc',     'Alimentación','Bebidas azucaradas',                      -2, 'resta', false, 102),
('rest_picoteo',          'Alimentación','Picoteo innecesario',                     -1, 'resta', false, 103),
('rest_atracon',          'Alimentación','Atracón / descontrol',                    -4, 'resta', false, 104),

-- Alcohol
('rest_alcohol_1a2',      'Alcohol',     '1–2 tragos',                              -2, 'resta', false, 110),
('rest_alcohol_3mas',     'Alcohol',     'Más de 3 tragos',                         -4, 'resta', false, 111),
('rest_guayabo',          'Alcohol',     'Guayabo',                                 -3, 'resta', false, 112),

-- Actividad
('rest_no_entrenar',      'Actividad',   'No entrenar (día planificado)',           -3, 'resta', false, 120),
('rest_sedentarismo',     'Actividad',   'Sedentarismo (<3k pasos)',                -2, 'resta', false, 121),

-- Sueño
('rest_dormir_menos5',    'Sueño',       'Dormir <5h',                              -2, 'resta', false, 130),
('rest_trasnochar',       'Sueño',       'Trasnochar sin motivo',                   -1, 'resta', false, 131),

-- Disciplina
('rest_redes_4h',         'Disciplina',  '+4h redes sociales',                      -2, 'resta', false, 140),

-- Hábitos
('rest_agua_menos1l',     'Hábitos',     'Menos de 1L de agua',                     -2, 'resta', false, 150),

-- Penalidades (honor system, igual que el resto del checklist —
-- el usuario las marca si siente que aplicaron ese día)
('esp_dia_perdido',       'Penalidades', 'Día perdido',                             -6, 'resta', false, 160),
('esp_finde_destructivo', 'Penalidades', 'Fin de semana destructivo',               -8, 'resta', false, 161),
('esp_no_registrar',      'Penalidades', 'No registré el día',                      -3, 'resta', false, 162);

-- Nota sobre reglas NO incluidas como marcables:
--  · Rachas (+3 / +7): eliminadas por decisión de producto.
--  · "Trampa/mentir" (-10): incompatible con honor system + sin validación;
--    se deja fuera del catálogo automático. Si se quiere, se aplica manual.
