# Grasolimpiadas — Handoff para Claude Code

Reto fitness entre amigos con ranking público. Webapp mobile-first. Este documento contiene todo el contexto para continuar el desarrollo. Las Fases 1, 2, 3 y 4 están completas y compilan; la fase 5 (pulido, opcional) está pendiente.

---

## 1. Qué es

Reto de hábitos ("wellness") entre ~11 amigos. Cada quien registra a diario lo que cumplió/falló según un sistema de puntos, y hay un ranking público donde el último queda expuesto (es parte del concepto, con tono de "olimpiadas de la grasa"). Honor system: no hay validación de evidencia.

El tono del producto es competitivo y burlón (ver copy original más abajo), pero la app en sí es simple y directa.

---

## 2. Stack

- **Frontend:** React 18 + Vite, JavaScript (no TypeScript), mobile-first responsive
- **Backend/DB:** Supabase (Postgres + Storage). **No se usa Supabase Auth** — el login es selección de perfil sin contraseña.
- **Sin jobs automáticos ni pg_cron.** Se evaluó para las penalidades por umbral y se descartó (ver §3.8) — todo el reglamento es honor system marcado a mano.
- **Deploy:** Vercel o Netlify (pendiente)

Sin librerías de estado ni de routing por ahora — el switch de vistas es un `useState` simple en `App.jsx`. Si crece, considerar react-router.

---

## 3. Decisiones de producto (ya cerradas — no reabrir sin preguntar)

1. **Participantes flexibles:** CRUD con soft-delete (`activo = false`), nunca borrado duro, para preservar historial. Sin límite fijo.
2. **Login:** selección de perfil, sin contraseña (honor system). Se persiste en localStorage.
3. **Evidencia:** foto **opcional**. No bloquea el registro, no requiere aprobación. Todo entra como válido.
4. **Sin rachas.** Los bonus de racha (+3 a 3 días, +7 a 7 días) del reglamento original fueron **eliminados**. Los bonus de día (levantarse antes de 7am, día sin azúcar) **sí se mantienen**.
5. **Cap de +15 puntos/día**, aplicado **solo a los positivos**. Las restas **sí pueden llevar el día a negativo, sin piso**.
6. **Comida libre:** 1 por semana, no penaliza.
7. **Comodín:** máx 2 por persona. Deja el día en 0. **Usable retroactivamente** sobre cualquier día pasado, y al aplicarlo **recalcula el ranking histórico**.
8. **Penalidades: manuales, no automáticas (revisado en Fase 4).** El plan original calculaba "día perdido", "fin de semana destructivo" y "no registrar" por umbral vía job/pg_cron. Se descartó — Supabase no tenía la extensión `pg_cron` disponible sin fricción, y el dueño decidió no complicar la infra por esto. Las tres pasaron a ser checkboxes manuales más, agrupadas en la categoría **"Penalidades"** (junto a Actividad, Disciplina, Hábitos, etc.): "Día perdido" (-6), "Fin de semana destructivo" (-8), "No registré el día" (-3). El usuario las marca por honor system, igual que el resto del checklist — no hay detección automática de umbral ni de días sin abrir la app.
9. **"Trampa/mentir" (-10) del reglamento original quedó FUERA** del catálogo automático (incompatible con honor system sin validación). Si se quiere, se aplica manual — decisión pendiente del dueño.
10. **Ranking: total del reto, no semanal.** Suma acumulada de `puntos_netos` desde el inicio, sin resetear por semana (decisión del dueño, Fase 3).

### Decisiones abiertas menores (confirmar al implementar)
- Al aplicar comodín retroactivo: se asume recálculo automático del ranking. Confirmar el alcance (¿solo ese día, o cascada sobre bonuses dependientes? No hay bonuses dependientes hoy, así que es directo.)
- ~~Precedencia exacta cuando coinciden "no registrar" y "fin de semana destructivo"~~ — quedó sin efecto: ambas son checkboxes manuales independientes (§3.8), se suman como cualquier otro par de items marcados, sin lógica especial de acumulación.

---

## 4. Sistema de puntos (reglamento)

Vive en la tabla `rules` (catálogo configurable). NO hardcodear en el frontend — leer siempre del catálogo. El seed está en `supabase/02_seed_rules.sql`.

### Suma
| regla_key | categoría | descripción | pts |
|---|---|---|---|
| nutri_saludable_dia | Nutrición | Comer saludable todo el día | +3 |
| nutri_deficit_superavit | Nutrición | Cumplir déficit o superávit calórico | +1 |
| nutri_evitar_ultra | Nutrición | Evitar ultraprocesados | +1 |
| ejer_entreno_completo | Ejercicio | Entrenamiento completo | +4 |
| ejer_actividad_ligera | Ejercicio | Actividad ligera (8k pasos) | +2 |
| ejer_extra_cardio | Ejercicio | Extra (cardio/clase) mín 1h | +2 |
| hidra_2l | Hidratación | +2L de agua | +2 |
| hidra_1a2l | Hidratación | 1–2L de agua | +1 |
| sueno_7a8 | Sueño | Dormir 7–8h | +2 |
| sueno_6 | Sueño | Dormir 6h | +1 |
| bien_mente | Bienestar | Meditación/journaling/misa/leer | +2 |
| bien_sin_pantallas | Bienestar | 1h sin pantallas | +1 |
| bonus_antes_7am | Bonus | Levantarse antes de 7am | +1 |
| bonus_sin_azucar | Bonus | Día sin azúcar | +1 |

### Resta
| regla_key | categoría | descripción | pts |
|---|---|---|---|
| rest_chatarra | Alimentación | Comida chatarra | -3 |
| rest_postres | Alimentación | Postres/dulces grandes | -2 |
| rest_bebidas_azuc | Alimentación | Bebidas azucaradas | -2 |
| rest_picoteo | Alimentación | Picoteo innecesario | -1 |
| rest_atracon | Alimentación | Atracón/descontrol | -4 |
| rest_alcohol_1a2 | Alcohol | 1–2 tragos | -2 |
| rest_alcohol_3mas | Alcohol | Más de 3 tragos | -4 |
| rest_guayabo | Alcohol | Guayabo | -3 |
| rest_no_entrenar | Actividad | No entrenar (día planificado) | -3 |
| rest_sedentarismo | Actividad | Sedentarismo (<3k pasos) | -2 |
| rest_dormir_menos5 | Sueño | Dormir <5h | -2 |
| rest_trasnochar | Sueño | Trasnochar sin motivo | -1 |
| rest_redes_4h | Disciplina | +4h redes sociales | -2 |
| rest_agua_menos1l | Hábitos | Menos de 1L de agua | -2 |

### Penalidades (manuales, honor system — antes eran automáticas por umbral, ver §3.8)
| regla_key | categoría | descripción | pts |
|---|---|---|---|
| esp_dia_perdido | Penalidades | Día perdido | -6 |
| esp_finde_destructivo | Penalidades | Fin de semana destructivo | -8 |
| esp_no_registrar | Penalidades | No registré el día | -3 |

No hay reglas con `automatica = true` en el catálogo actual — todo el reglamento se marca a mano.

---

## 5. Modelo de datos

SQL completo en `supabase/01_schema.sql`. Resumen:

- **users**: `id` (uuid), `nombre`, `avatar_url`, `comodines_restantes` (default 2), `activo` (bool, soft-delete), `created_at`
- **rules**: `regla_key` (PK text), `categoria`, `descripcion`, `puntos` (smallint), `tipo` (`suma`|`resta`|`especial`), `automatica` (bool), `orden`
- **daily_entries**: `id`, `user_id` (FK), `fecha` (date), `puntos_netos` (smallint), `comida_libre_usada` (bool), `comodin_usado` (bool), `created_at`, `updated_at`. Único por `(user_id, fecha)`.
- **entry_items**: `id`, `entry_id` (FK), `regla_key` (FK), `categoria`, `puntos` (copiado de la regla al marcar), `created_at`
- **evidence**: `id`, `entry_id` (FK), `regla_key` (FK, nullable), `foto_url`, `created_at`

Notas:
- `entry_items.puntos` se **copia** de la regla al momento de marcar (congela el valor, por si el catálogo cambia después).
- `daily_entries.puntos_netos` es el resultado del motor de puntos (ver §7). Se recalcula cuando cambian los items o se aplica comodín.
- Hay trigger `touch_updated_at()` en `daily_entries`.
- **Falta configurar Row Level Security.** Como no hay auth real, definir políticas acordes (probablemente acceso abierto con la anon key, dado el honor system y que es un grupo cerrado — pero evaluar el riesgo de exponer la anon key públicamente; ver §9 Seguridad).

---

## 6. Estado actual del código (Fases 1, 2, 3 y 4 — COMPLETAS)

Estructura:

```
grasolimpiadas/
├── HANDOFF.md                    ← este archivo
├── index.html
├── package.json
├── vite.config.js
├── .env.example                  ← copiar a .env.local con tus llaves
├── supabase/
│   ├── 01_schema.sql             ← correr primero en Supabase SQL Editor
│   ├── 02_seed_rules.sql         ← correr segundo (ya incluye Penalidades como manuales)
│   ├── 03_storage.sql            ← correr tercero (bucket "evidence" + policies)
│   ├── 04_ranking_view.sql       ← correr cuarto (vista v_ranking)
│   └── 05_penalidades_manual.sql ← correr quinto (migración: pasa Día perdido / Finde destructivo / No registrar a manuales — solo si tu DB ya tenía el seed viejo)
└── src/
    ├── main.jsx
    ├── App.jsx                   ← orquesta vistas (select ↔ manage) + tabs (Hoy ↔ Ranking ↔ Historial)
    ├── styles.css                ← base mobile-first, tema oscuro
    ├── lib/
    │   └── supabase.js           ← cliente Supabase
    └── features/
        ├── users/
        │   ├── usersApi.js       ← CRUD (listActiveUsers, listAllUsers, createUser, updateUser, deactivateUser, reactivateUser)
        │   ├── useProfile.js     ← sesión de perfil en localStorage (+ updateProfile para refrescar comodines)
        │   ├── avatar.js         ← iniciales + color estable por nombre
        │   ├── ProfileSelect.jsx ← pantalla de selección de perfil
        │   └── ManageUsers.jsx   ← gestión de participantes (CRUD + reactivar)
        ├── entries/
        │   ├── pointsEngine.js   ← calcularNeto() — función pura, cap +15, comodín, comida libre
        │   ├── rulesApi.js       ← listCheckableRules() (excluye automatica=true)
        │   ├── entriesApi.js     ← getEntryForDate, saveDailyEntry, countComidaLibreEnSemana, ajustarComodines
        │   ├── historyApi.js     ← getHistoryForUser (historial personal)
        │   ├── DailyEntry.jsx    ← checklist por categoría + comodín + comida libre + foto opcional
        │   └── History.jsx      ← historial personal: días registrados + total acumulado
        └── ranking/
            ├── rankingApi.js     ← getRanking() (lee de la vista v_ranking)
            └── Ranking.jsx       ← leaderboard público, resalta el último lugar
```

**Nota de la Fase 2:** al empezar, los archivos de la Fase 1 estaban sueltos en la raíz del proyecto (sin `src/`, sin `index.html`, sin `vite.config.js`), aunque sus imports ya asumían la estructura anidada de arriba. Es decir, `npm run build` no podía estar pasando limpio como decía este documento. Se reorganizaron los archivos a esa estructura y se agregaron los archivos de configuración faltantes; ahora sí compila.

**Nota de la Fase 4:** el plan original (ver versión vieja de este documento) era un job pg_cron para las tres penalidades por umbral. Al intentar habilitarlo, Supabase devolvió `ERROR: schema "cron" does not exist` — la extensión no estaba disponible sin más pasos — y el dueño decidió no complicar la infra por esto. Las tres penalidades (día perdido, finde destructivo, no registrar) se movieron al catálogo manual (§3.8, §4). No quedó ningún job ni cron en el proyecto.

Lo que ya funciona:
- Selección de perfil sin contraseña, persistida en localStorage.
- CRUD de participantes con soft-delete y reincorporación.
- Registro diario: checklist agrupado por categoría (lee de `rules`, incluyendo ahora la categoría "Penalidades"), editable para el día actual y días pasados vía selector de fecha.
- Motor de puntos (`calcularNeto`): cap +15 solo a positivos, negativos sin piso.
- Comodín: máx 2 por persona (contador en `users.comodines_restantes`), aplicable a cualquier día (retroactivo), deja el neto del día en 0. El ranking histórico queda consistente automáticamente porque `puntos_netos` se guarda en 0 al momento de activarlo — no requiere un recálculo aparte (Fase 3 solo suma esa columna).
- Comida libre: máx 1 por semana (lunes a domingo), decisión de UX tomada aquí: exime del cómputo las restas de categoría "Alimentación" marcadas ese día (quedan registradas para el historial, pero no penalizan el neto).
- Foto de evidencia opcional, sube a Storage (`evidence`) y guarda su URL en `evidence.foto_url`. Requiere correr `03_storage.sql`.
- Ranking público (`v_ranking`): total acumulado del reto por usuario activo, resalta a quien(es) están en último lugar (empates incluidos). Requiere correr `04_ranking_view.sql`.
- Historial personal: lista de días registrados del usuario actual (más reciente primero), con el neto de cada uno, etiquetas de comodín/comida libre usados, y el total acumulado.
- Penalidades manuales (día perdido, finde destructivo, no registré el día): checkboxes normales del checklist, ya no automáticas. Requiere correr `05_penalidades_manual.sql` si la DB ya tenía el catálogo viejo.
- Navegación por tabs (Hoy / Ranking / Historial) dentro de `App.jsx`, sin librería de routing.
- `npm run build` pasa limpio. Fases 1–4 probadas end-to-end en navegador contra Supabase real (checklist, cap de puntos, comodín con recálculo de contador y persistencia, comida libre, ranking con resaltado de último, historial, categoría "Penalidades" con sus 3 items marcables y neto negativo persistido correctamente).

Convenciones observadas en el código actual (mantenerlas):
- JS plano, sin TypeScript.
- Estilos con clases utilitarias en `styles.css` (`.btn`, `.card`, `.input`, `.muted`) + estilos inline puntuales.
- Tema oscuro, acento coral/rojo (`--accent: #d8442c`).
- Cada feature en su carpeta bajo `src/features/`.
- API de datos separada de los componentes (`*Api.js`), motor de puntos aparte y puro (`pointsEngine.js`).
- Agregaciones (ranking) viven en una vista SQL, no en JS — mismo principio que el catálogo de `rules`: no hardcodear lógica de datos en el frontend.
- Mensajes de error en español, tono directo, sin "por favor".

Setup local (proyecto Supabase nuevo):
1. Correr `01_schema.sql`, `02_seed_rules.sql`, `03_storage.sql` y `04_ranking_view.sql` en orden. No corras `05_penalidades_manual.sql` — es solo para DBs que ya tenían el catálogo viejo; `02_seed_rules.sql` ya siembra las Penalidades como manuales.
2. `cp .env.example .env.local` y llenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev`.

---

## 7. Motor de puntos (implementar en Fase 2 — spec)

Función pura que dada la lista de items marcados de un día devuelve el neto. Pseudocódigo:

```
function calcularNeto(items, { comodinUsado }):
    if comodinUsado: return 0

    positivos = suma de items con puntos > 0
    negativos = suma de items con puntos < 0

    positivosCap = min(positivos, 15)   // cap solo a positivos
    neto = positivosCap + negativos     // negativos es ≤ 0, sin piso

    return neto
```

Las penalidades "especiales" (día perdido, finde destructivo, no registrar) ya NO son un caso aparte: son checkboxes normales del catálogo (categoría "Penalidades"), así que esta función las trata igual que cualquier otro item marcado — no hay job ni recálculo especial (ver §3.8 sobre por qué se descartó lo automático). La comida libre marca una comida como exenta de penalización: se implementó como exención de las restas de categoría "Alimentación" marcadas ese día (ver `pointsEngine.js`).

---

## 8. Roadmap

### Fase 2 — Registro diario (COMPLETA)
- Pantalla de checklist agrupado por categoría, leyendo de `rules` (excluye `automatica = true`). ✅
- Toggle por regla; al guardar, crea/actualiza `daily_entry` + reemplaza `entry_items`. ✅
- Subida de foto opcional a Supabase Storage → guarda en `evidence`. ✅
- Motor de puntos (§7) aplicado: cap +15, comodín (deja en 0), comida libre (exime restas de Alimentación). ✅
- Editable para el día actual y días pasados (para el comodín retroactivo), selector de fecha (default hoy, sin fechas futuras). ✅
- Pendiente de pulir (no bloqueante): secciones colapsables por categoría si la lista se siente larga en mobile; por ahora es scroll simple con tap targets grandes.

### Fase 3 — Ranking + historial (COMPLETA)
- Ranking público: suma de `puntos_netos` por usuario activo, ordenado desc. Vive en la vista `v_ranking` (`supabase/04_ranking_view.sql`). ✅
- Resalta el último lugar (o empatados en último). ✅
- Ventana: total del reto, no semanal — decisión del dueño (ver §3.10). ✅
- Historial personal: días registrados, neto por día, total acumulado. ✅
- Pendiente de pulir (no bloqueante): "tendencia" del historial es solo la lista cronológica por ahora; no hay gráfico ni indicador de racha/dirección.

### Fase 4 — Penalidades manuales (COMPLETA, reemplaza el plan de jobs automáticos)
- Se intentó pg_cron para aplicar `esp_dia_perdido`, `esp_finde_destructivo` y `esp_no_registrar` por umbral/job. Supabase no tenía la extensión disponible sin fricción (`ERROR: schema "cron" does not exist`) y el dueño decidió no complicar la infra. ✅ (decisión revertida)
- Las tres pasaron al catálogo manual, categoría "Penalidades" (`supabase/02_seed_rules.sql` para instalaciones nuevas, `supabase/05_penalidades_manual.sql` para migrar una DB ya sembrada). ✅
- `pointsEngine.js` no necesitó cambios: las trata como cualquier item marcado. ✅
- Probado en navegador contra Supabase real: la categoría "Penalidades" aparece con sus 3 items, marcar "Día perdido" bajó el neto a -6 y persistió tras guardar. ✅

### Fase 5 — Pulido (opcional)
- Copy con el tono de las Grasolimpiadas, animaciones, notificación del último lugar.

---

## 9. Seguridad / cosas a resolver

- **RLS:** definir políticas en Supabase. Sin auth real, la anon key da acceso. Para un grupo cerrado puede bastar, pero **no publicar la anon key en un repo público** ni exponer la app abiertamente sin pensar en abuso (alguien podría borrar/editar entries de otros). Opciones: mantener la app privada, o meter una capa mínima de identificación.
- **Comodín retroactivo + recálculo:** asegurar que el ranking se recalcula de forma consistente y que el contador `comodines_restantes` se decrementa sin condiciones de carrera.
- **Storage:** resuelto en Fase 2 — bucket `evidence` + políticas públicas de lectura/inserción en `supabase/03_storage.sql`. Mismo trade-off que el resto del honor system (acceso abierto, grupo cerrado); revisar si la app deja de ser privada.

---

## 10. Copy original del reto (referencia de tono, para Fase 5)

El reto se llama "Las Grasolimpiadas". Tono competitivo, burlón, motivacional-agresivo: "aquí hay dos tipos de personas: los que compiten y los que estorban", "el ranking es público y el último no pasa desapercibido", "comes limpio, entrenas duro, cumples TODO, reportas TODO… o empiezas a acostumbrarte a ver tu nombre abajo". Reglas visibles al usuario: máx 15 pts/día, 2 comodines por persona (dejan el día en 0), 1 comida libre por semana sin penalización, evidencia con fotos.

---

## Resumen para arrancar rápido

Estás continuando una webapp React+Vite+Supabase de un reto fitness. Fases 1 (auth por perfil + CRUD de participantes), 2 (registro diario + motor de puntos), 3 (ranking público + historial) y 4 (penalidades manuales, sin jobs) están listas, compilan y probadas end-to-end contra Supabase real. **Lo que queda es la Fase 5: pulido** (opcional — ver §8). Lee §3 (decisiones cerradas), §4 (reglamento), §5 (modelo de datos) y §7 (motor de puntos) antes de escribir código. No reabras decisiones cerradas sin preguntar. Mantén JS plano, español en la UI, y la estructura por features.
