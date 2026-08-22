-- ============================================================
-- GRASOLIMPIADAS · Quita el límite de categoría de Bienestar
-- (ajuste post-deploy, revierte 08_limite_categoria_dia.sql)
-- El dueño decidió que "Meditación/journaling/misa/leer" y "1h sin
-- pantallas" SÍ se pueden sumar el mismo día (antes máx 1 entre las
-- dos). No se toca código: `limite_categoria_dia` ya es genérico y
-- data-driven — null vuelve a significar "sin límite de categoría".
-- ============================================================

update rules
set limite_categoria_dia = null
where regla_key in ('bien_mente', 'bien_sin_pantallas');
