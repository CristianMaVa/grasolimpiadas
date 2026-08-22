-- ============================================================
-- GRASOLIMPIADAS · Seed del catálogo de reglas
-- Sistema de puntos completo. Editable desde aquí o desde la DB.
-- ============================================================

insert into rules (regla_key, categoria, descripcion, puntos, tipo, automatica, orden, limite_categoria_dia, grupo_exclusivo) values

-- ---------------- SUMA ----------------
-- Nutrición
('nutri_saludable_dia',   'Nutrición',   'Comer saludable todo el día',              3, 'suma', false, 10, null, null),
('nutri_deficit_superavit','Nutrición',  'Cumplir déficit o superávit calórico',     1, 'suma', false, 11, null, null),
('nutri_evitar_ultra',    'Nutrición',   'Evitar ultraprocesados',                   1, 'suma', false, 12, null, null),

-- Ejercicio
('ejer_entreno_completo', 'Ejercicio',   'Entrenamiento completo',                   4, 'suma', false, 20, null, null),
('ejer_actividad_ligera', 'Ejercicio',   'Actividad ligera (8k pasos)',              2, 'suma', false, 21, null, null),
('ejer_extra_cardio',     'Ejercicio',   'Extra (cardio/clase) mínimo una hora',     2, 'suma', false, 22, null, null),

-- Hidratación (máx 1 por día entre estas y "Menos de 1L" de Hábitos —
-- son buckets de la misma medida, no se pueden sumar)
('hidra_2l',              'Hidratación', '+2L de agua',                              2, 'suma', false, 30, null, 'agua'),
('hidra_1a2l',            'Hidratación', '1–2L de agua',                             1, 'suma', false, 31, null, 'agua'),

-- Sueño (máx 1 por día entre estas y "Dormir <5h" — buckets de horas
-- dormidas, no se pueden sumar)
('sueno_7a8',             'Sueño',       'Dormir 7–8h',                              2, 'suma', false, 40, null, 'sueno_horas'),
('sueno_6',               'Sueño',       'Dormir 6h',                                1, 'suma', false, 41, null, 'sueno_horas'),

-- Bienestar (máx 1 por día ENTRE las dos — no se pueden sumar ambas)
('bien_mente',            'Bienestar',   'Meditación / journaling / misa / leer',    2, 'suma', false, 50, 1, null),
('bien_sin_pantallas',    'Bienestar',   '1h sin pantallas',                         1, 'suma', false, 51, 1, null),

-- Bonus (nota: sin rachas; se mantienen los bonus de día)
('bonus_antes_7am',       'Bonus',       'Levantarse antes de 7am',                  1, 'suma', false, 60, null, null),
('bonus_sin_azucar',      'Bonus',       'Día sin azúcar',                           1, 'suma', false, 61, null, null),

-- ---------------- RESTA ----------------
-- Alimentación
('rest_chatarra',         'Alimentación','Comida chatarra',                         -3, 'resta', false, 100, null, null),
('rest_postres',          'Alimentación','Postres / dulces grandes',                -2, 'resta', false, 101, null, null),
('rest_bebidas_azuc',     'Alimentación','Bebidas azucaradas',                      -2, 'resta', false, 102, null, null),
('rest_picoteo',          'Alimentación','Picoteo innecesario',                     -1, 'resta', false, 103, null, null),
('rest_atracon',          'Alimentación','Atracón / descontrol',                    -4, 'resta', false, 104, null, null),

-- Alcohol (máx 1 por día entre estas dos — buckets de tragos, no se
-- pueden sumar; "Guayabo" queda fuera, puede pasar con cualquiera)
('rest_alcohol_1a2',      'Alcohol',     '1–2 tragos',                              -2, 'resta', false, 110, null, 'tragos'),
('rest_alcohol_3mas',     'Alcohol',     'Más de 3 tragos',                         -4, 'resta', false, 111, null, 'tragos'),
('rest_guayabo',          'Alcohol',     'Guayabo',                                 -3, 'resta', false, 112, null, null),

-- Actividad
('rest_no_entrenar',      'Actividad',   'No entrenar (día planificado)',           -3, 'resta', false, 120, null, null),
('rest_sedentarismo',     'Actividad',   'Sedentarismo (<3k pasos)',                -2, 'resta', false, 121, null, null),

-- Sueño
('rest_dormir_menos5',    'Sueño',       'Dormir <5h',                              -2, 'resta', false, 130, null, 'sueno_horas'),
('rest_trasnochar',       'Sueño',       'Trasnochar sin motivo',                   -1, 'resta', false, 131, null, null),

-- Disciplina
('rest_redes_4h',         'Disciplina',  '+4h redes sociales',                      -2, 'resta', false, 140, null, null),

-- Hábitos
('rest_agua_menos1l',     'Hábitos',     'Menos de 1L de agua',                     -2, 'resta', false, 150, null, 'agua'),

-- Penalidades (honor system, igual que el resto del checklist —
-- el usuario las marca si siente que aplicaron ese día)
('esp_dia_perdido',       'Penalidades', 'Día perdido',                             -6, 'resta', false, 160, null, null),
('esp_finde_destructivo', 'Penalidades', 'Fin de semana destructivo',               -8, 'resta', false, 161, null, null),
('esp_no_registrar',      'Penalidades', 'No registré el día',                      -3, 'resta', false, 162, null, null);

-- Nota sobre reglas NO incluidas como marcables:
--  · Rachas (+3 / +7): eliminadas por decisión de producto.
--  · "Trampa/mentir" (-10): incompatible con honor system + sin validación;
--    se deja fuera del catálogo automático. Si se quiere, se aplica manual.
