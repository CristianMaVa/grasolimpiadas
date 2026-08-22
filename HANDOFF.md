# Grasolimpiadas — Handoff para Claude Code

Reto fitness entre amigos con ranking público. Webapp mobile-first. Este documento contiene todo el contexto para continuar el desarrollo. Las Fases 1, 2, 3 y 4 están completas y compilan; la fase 5 (pulido, opcional) está pendiente.

---

## 1. Qué es

Reto de hábitos ("wellness") entre ~11 amigos. Cada quien registra a diario lo que cumplió/falló según un sistema de puntos, y hay un ranking público donde el último queda expuesto (es parte del concepto, con tono de "olimpiadas de la grasa"). Honor system puro: la app NO pide evidencia fotográfica (se probó y se revirtió, ver §3.3) — el grupo reporta evidencia real por su chat de WhatsApp y lleva los puntos aparte en Excel; esta app solo emula/reemplaza ese checklist y el cálculo de puntos.

El tono del producto es competitivo y burlón (ver copy original más abajo), pero la app en sí es simple y directa.

---

## 2. Stack

- **Frontend:** React 18 + Vite, JavaScript (no TypeScript), mobile-first responsive
- **Backend/DB:** Supabase (Postgres + Storage). **No se usa Supabase Auth** — el login es selección de perfil sin contraseña.
- **Sin jobs automáticos ni pg_cron.** Se evaluó para las penalidades por umbral y se descartó (ver §3.8) — todo el reglamento es honor system marcado a mano.
- **Deploy:** Vercel, en producción en https://grasolimpiadas.vercel.app — repo en GitHub (`CristianMaVa/grasolimpiadas`), auto-deploy en cada push a `main`.

Sin librerías de estado ni de routing por ahora — el switch de vistas es un `useState` simple en `App.jsx`. Si crece, considerar react-router.

---

## 3. Decisiones de producto (ya cerradas — no reabrir sin preguntar)

1. **Participantes flexibles:** CRUD con soft-delete (`activo = false`), nunca borrado duro, para preservar historial. Sin límite fijo.
2. **Login:** selección de perfil, sin contraseña (honor system). Se persiste en localStorage.
3. **Evidencia: NINGUNA, la app no maneja fotos (revertido dos veces post-deploy).** Historia completa: primero opcional/no bloqueante → luego obligatoria (mín. 1 foto) por item de suma → **finalmente eliminada por completo**. El dueño explicó que el grupo ya reporta evidencia real por su chat de WhatsApp y lleva los puntos aparte en un Excel; quería que la app emulara ese comportamiento (solo el checklist + cálculo de puntos), sin duplicar el manejo de fotos. Se quitó toda la UI de foto de `DailyEntry.jsx`, el parámetro `fotos` de `registrarActividad`, y las queries a la tabla `evidence`/bucket `evidence` en `entriesApi.js`. La tabla y el bucket se dejaron en el esquema (sin borrado duro) pero ya no los usa ninguna pantalla — ver §5 y §9. **No reabrir esta decisión sin preguntar** — ya se intentó dos veces en direcciones opuestas.
4. **Sin rachas.** Los bonus de racha (+3 a 3 días, +7 a 7 días) del reglamento original fueron **eliminados**. Los bonus de día (levantarse antes de 7am, día sin azúcar) **sí se mantienen**.
5. **Cap de +15 puntos/día**, aplicado **solo a los positivos**. Las restas **sí pueden llevar el día a negativo, sin piso**.
6. **Comida libre:** 1 por semana, no penaliza.
7. **Comodín:** máx 2 por persona. Deja el día en 0. **Usable retroactivamente** sobre cualquier día pasado, y al aplicarlo **recalcula el ranking histórico**.
8. **Penalidades: manuales, no automáticas (revisado en Fase 4).** El plan original calculaba "día perdido", "fin de semana destructivo" y "no registrar" por umbral vía job/pg_cron. Se descartó — Supabase no tenía la extensión `pg_cron` disponible sin fricción, y el dueño decidió no complicar la infra por esto. Las tres pasaron a ser checkboxes manuales más, agrupadas en la categoría **"Penalidades"** (junto a Actividad, Disciplina, Hábitos, etc.): "Día perdido" (-6), "Fin de semana destructivo" (-8), "No registré el día" (-3). El usuario las marca por honor system, igual que el resto del checklist — no hay detección automática de umbral ni de días sin abrir la app.
9. **"Trampa/mentir" (-10) del reglamento original quedó FUERA** del catálogo automático (incompatible con honor system sin validación). Si se quiere, se aplica manual — decisión pendiente del dueño.
10. **Ranking: total del reto, no semanal.** Suma acumulada de `puntos_netos` desde el inicio, sin resetear por semana (decisión del dueño, Fase 3).
11. **Registro incremental, no por lote (revisado post-deploy).** El grupo no marca todo el día de una — van subiendo evidencia según pasan las cosas (ejercicio en la mañana, almuerzo fit al mediodía, etc.). Se reemplazó el checklist-completo-y-un-botón-de-guardar por: elegir UNA actividad de un `<select>`, adjuntar foto si aplica, y registrarla — se guarda al toque, sin botón de "Guardar día". **Cada regla se puede registrar máximo 1 vez por día** (para sumas Y restas, sin excepción — decisión explícita del dueño al preguntar si las restas debían poder repetirse). El selector muestra las ya registradas ese día como opción deshabilitada, no las oculta.
12. **Límite compartido por categoría (revisado post-deploy, y luego REVERTIDO para Bienestar — ver §3.15).** Bienestar (meditar/journaling/misa/leer y 1h sin pantallas) pasa a máx **1 registro por día entre las dos reglas** — no se pueden sumar puntos por ambas el mismo día, aunque cada una individualmente todavía no esté "ya registrada". Implementado como una columna genérica `rules.limite_categoria_dia` (no hardcodeado a "Bienestar" en el código), así que se puede aplicar a otras categorías después solo cambiando datos, sin tocar `DailyEntry.jsx`. Es un límite de solo cliente (como el máximo de comodines o de comida libre semanal) — no hay trigger de DB que lo garantice; ver §9. El mecanismo en sí (la columna y el código que la lee) sigue vigente y disponible para otras categorías — solo se le quitó el valor a Bienestar.
13. **Grupos exclusivos entre reglas de una misma medida (revisado post-deploy).** Algunas reglas son "buckets" de lo mismo y no se pueden registrar dos a la vez el mismo día: agua (+2L / 1-2L / <1L), horas de sueño (7-8h / 6h / <5h), tragos (1-2 / 3+). A diferencia de §3.12, estas reglas a veces cruzan categorías (agua está en Hidratación Y Hábitos), así que se implementó una etiqueta libre `rules.grupo_exclusivo` (no ligada a `categoria`): máx 1 registro por día entre todas las reglas que comparten la misma etiqueta. Decisiones confirmadas con el dueño: "Trasnochar sin motivo" queda FUERA del grupo de horas de sueño (es sobre el motivo, no la cantidad de horas — puede coexistir con cualquier bucket de horas); "Guayabo" queda FUERA del grupo de tragos (puede pasar con cualquiera de las dos cantidades). Mismo límite de solo cliente que §3.12 — ver §9.
14. **Desempate del ranking sin el cap de +15/día (revisado post-deploy).** El cap de §3.5 hace que los empates en el ranking sean normales — dos personas pueden terminar con el mismo total "con cap" aunque a una le haya ido mucho mejor en el día a día. El dueño pidió llevar una segunda suma SIN el cap y usarla solo para desempatar: el orden del ranking sigue siendo por `puntos_totales` (con cap) primero, y solo si hay empate ahí se mira `puntos_totales_sin_limite` (sin cap). Se guarda por día en `daily_entries.puntos_netos_sin_limite`, calculado por `calcularNetoSinLimite()` en `pointsEngine.js` (misma lógica que `calcularNeto`, sin el `Math.min(positivos, 15)`). El comodín sigue dejando el día en 0 en AMBAS sumas — el cap es lo único que se quita, no las demás reglas.
15. **Bienestar vuelve a permitir sumar sus dos reglas el mismo día (revierte parte de §3.12).** El dueño decidió que meditar/journaling/misa/leer (+2) y 1h sin pantallas (+1) SÍ se pueden ganar el mismo día — hasta 3 pts entre las dos. Cambio de solo datos: `rules.limite_categoria_dia` vuelve a `null` para `bien_mente` y `bien_sin_pantallas` (`supabase/11_bienestar_sin_limite_categoria.sql`). El mecanismo genérico de límite por categoría sigue existiendo en el código para usarse en otra categoría el día que se necesite.
16. **Módulo administrativo "Gestionar Reto" protegido por PIN.** El dueño pidió poder activar/desactivar actividades, crear nuevas y ajustar sus puntos/tipo (suma o resta) sin tocar código ni SQL a mano. Acceso vía botón debajo de "Gestionar participantes" → PIN fijo de 4 dígitos (`9610`), validado SOLO en el cliente (`AdminGate.jsx`) — mismo modelo de honor system que el resto de la app, no es seguridad real (ver §9). Explícitamente NO se gestionan `limite_categoria_dia` ni `grupo_exclusivo` desde este módulo por ahora — decisión del dueño, se trabaja después. Desactivar una regla no la borra (columna `rules.activo`, nueva) — solo la oculta del checklist/selector de registro diario; el historial de quien ya la registró no se toca. Editar puntos/tipo tampoco reescribe el pasado: `entry_items` guarda su propia copia de `puntos`/`categoria` al momento de marcarse.

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

Bienestar ya NO tiene límite de categoría — sus dos reglas se pueden sumar el mismo día (§3.15). `hidra_2l` y `hidra_1a2l` tienen `grupo_exclusivo = 'agua'` (junto con `rest_agua_menos1l`, abajo); `sueno_7a8` y `sueno_6` tienen `grupo_exclusivo = 'sueno_horas'` (junto con `rest_dormir_menos5`, abajo) — ver §3.13.

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

Grupos exclusivos (§3.13): `rest_alcohol_1a2`/`rest_alcohol_3mas` comparten `grupo_exclusivo = 'tragos'` (`rest_guayabo` queda fuera); `rest_dormir_menos5` comparte `'sueno_horas'` con `sueno_7a8`/`sueno_6` (`rest_trasnochar` queda fuera); `rest_agua_menos1l` comparte `'agua'` con `hidra_2l`/`hidra_1a2l`.

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
- **rules**: `regla_key` (PK text), `categoria`, `descripcion`, `puntos` (smallint), `tipo` (`suma`|`resta`|`especial`), `automatica` (bool), `orden`, `limite_categoria_dia` (smallint, nullable — máx de items marcados por día compartido entre todas las reglas de esa categoría; null = sin límite de categoría), `grupo_exclusivo` (text, nullable — máx 1 registro por día entre todas las reglas que comparten la misma etiqueta, sin importar su categoría; null = no pertenece a ningún grupo exclusivo), `activo` (bool, default true — false = oculta la regla del checklist diario sin borrarla; gestionado desde "Gestionar Reto", §3.16)
- **daily_entries**: `id`, `user_id` (FK), `fecha` (date), `puntos_netos` (smallint), `puntos_netos_sin_limite` (smallint — igual que `puntos_netos` pero sin el cap de +15/día; solo se usa para desempatar el ranking, ver §3.14), `comida_libre_usada` (bool), `comodin_usado` (bool), `created_at`, `updated_at`. Único por `(user_id, fecha)`.
- **entry_items**: `id`, `entry_id` (FK), `regla_key` (FK), `categoria`, `puntos` (copiado de la regla al marcar), `created_at`. Constraint única `(entry_id, regla_key)` (`supabase/07_entry_items_unique.sql`) — resguardo real de "una regla, una vez por día"; el frontend ya deshabilita la opción en el selector, pero esto lo garantiza a nivel de datos.
- **evidence**: `id`, `entry_id` (FK), `regla_key` (FK, nullable), `foto_url`, `created_at`. **Tabla sin uso** — la app ya no maneja evidencia fotográfica (§3.3). Se deja en el esquema sin borrar (puede tener filas viejas de cuando sí se usó), pero ningún código actual lee ni escribe en ella.

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
│   ├── 05_penalidades_manual.sql ← correr quinto (migración: pasa Día perdido / Finde destructivo / No registrar a manuales — solo si tu DB ya tenía el seed viejo)
│   ├── 06_avatars_storage.sql    ← correr sexto (bucket "avatars" + policies)
│   ├── 07_entry_items_unique.sql ← correr séptimo (constraint única entry_id+regla_key)
│   ├── 08_limite_categoria_dia.sql ← correr octavo (columna limite_categoria_dia + Bienestar = 1)
│   ├── 09_grupo_exclusivo.sql    ← correr noveno (columna grupo_exclusivo + agua/sueno_horas/tragos)
│   ├── 10_puntos_sin_limite.sql  ← correr décimo (columna puntos_netos_sin_limite + backfill + v_ranking con desempate)
│   ├── 11_bienestar_sin_limite_categoria.sql ← correr onceavo (quita limite_categoria_dia de Bienestar)
│   └── 12_rules_activo.sql       ← correr doceavo (columna rules.activo, default true)
└── src/
    ├── main.jsx
    ├── App.jsx                   ← orquesta vistas (select ↔ manage ↔ admin-gate ↔ admin) + tabs (Hoy ↔ Ranking ↔ Historial) + fechaEditar (abrir "Hoy" en una fecha específica desde Historial)
    ├── styles.css                ← base mobile-first, tema oscuro
    ├── lib/
    │   └── supabase.js           ← cliente Supabase
    └── features/
        ├── users/
        │   ├── usersApi.js       ← CRUD (listActiveUsers, listAllUsers, createUser, updateUser, deactivateUser, reactivateUser, uploadAvatar)
        │   ├── useProfile.js     ← sesión de perfil en localStorage (+ updateProfile para refrescar comodines)
        │   ├── avatarUtils.js    ← iniciales + color estable por nombre (renombrado desde avatar.js — colisionaba con Avatar.jsx en sistemas de archivos insensibles a mayúsculas, ej. macOS)
        │   ├── Avatar.jsx        ← avatar compartido: foto real si `avatar_url` existe, si no el círculo de iniciales
        │   ├── ProfileSelect.jsx ← pantalla de selección de perfil, con el ranking público (`Ranking`, de la feature `ranking/`) debajo — visible sin elegir perfil
        │   └── ManageUsers.jsx   ← gestión de participantes (CRUD + reactivar + subir foto de perfil por participante)
        ├── entries/
        │   ├── pointsEngine.js   ← calcularNeto() (cap +15, comodín, comida libre) + calcularNetoSinLimite() (igual pero sin el cap, solo para desempatar el ranking — §3.14)
        │   ├── rulesApi.js       ← listCheckableRules() (excluye automatica=true y activo=false, incluye limite_categoria_dia y grupo_exclusivo) — solo lectura, para el checklist diario
        │   ├── entriesApi.js     ← modelo incremental: registrarActividad (una regla a la vez, sin fotos), actualizarComodin, actualizarComidaLibre, getEntryForDate, getDayDetail, countComidaLibreEnSemana, ajustarComodines. `recalcularNeto` (interna) persiste tanto `puntos_netos` como `puntos_netos_sin_limite` en cada acción. Ya NO existe saveDailyEntry (batch). Ya NO toca la tabla/bucket `evidence`.
        │   ├── historyApi.js     ← getHistoryForUser (historial personal)
        │   ├── ItemRow.jsx       ← fila compartida "descripción + puntos" (usada en DailyEntry y DayDetail)
        │   ├── DailyEntry.jsx    ← selector de actividad + botón "Registrar" que guarda al toque, sin foto; lista "ya registraste hoy"; comodín/comida libre se guardan al toque también. Deshabilita en el selector la regla ya registrada, cualquier otra de su categoría si `limite_categoria_dia` ya se alcanzó, y cualquier otra de su `grupo_exclusivo` (ej. agua, horas de sueño, tragos) si ya se registró otra del mismo grupo — cada motivo se muestra distinto en el texto de la opción. Acepta `fechaInicial` para abrir directo en un día pasado
        │   ├── History.jsx      ← historial personal: días registrados + total acumulado; selector "¿se te olvidó un día?" para ir a cualquier fecha pasada (con o sin entry); cada día abre DayDetail
        │   └── DayDetail.jsx    ← detalle de solo lectura de un día pasado: qué se marcó (vía ItemRow) + etiquetas de Comodín/Comida libre (recibidas como props desde History.jsx, no una consulta nueva); botón "Editar este día" → vuelve a Hoy en esa fecha
        ├── ranking/
        │   ├── rankingApi.js     ← getRanking() (lee de v_ranking; ordena por puntos_totales desc, luego puntos_totales_sin_limite desc como desempate, luego nombre)
        │   └── Ranking.jsx       ← leaderboard público; "último lugar" se determina con el mismo desempate (no solo por puntos_totales) para no marcar a alguien con mejor puntos_totales_sin_limite
        └── admin/                ← módulo "Gestionar Reto", protegido por PIN (§3.16)
            ├── rulesAdminApi.js  ← CRUD sobre rules: listAllRules (incluye inactivas), crearRegla, actualizarRegla — separado de rulesApi.js (solo lectura)
            ├── AdminGate.jsx     ← pantalla de PIN (fijo, 9610, validado en cliente)
            └── ManageRules.jsx   ← activar/desactivar, crear actividad, editar puntos/tipo — agrupado por categoría
```

**Nota de la Fase 2:** al empezar, los archivos de la Fase 1 estaban sueltos en la raíz del proyecto (sin `src/`, sin `index.html`, sin `vite.config.js`), aunque sus imports ya asumían la estructura anidada de arriba. Es decir, `npm run build` no podía estar pasando limpio como decía este documento. Se reorganizaron los archivos a esa estructura y se agregaron los archivos de configuración faltantes; ahora sí compila.

**Nota de la Fase 4:** el plan original (ver versión vieja de este documento) era un job pg_cron para las tres penalidades por umbral. Al intentar habilitarlo, Supabase devolvió `ERROR: schema "cron" does not exist` — la extensión no estaba disponible sin más pasos — y el dueño decidió no complicar la infra por esto. Las tres penalidades (día perdido, finde destructivo, no registrar) se movieron al catálogo manual (§3.8, §4). No quedó ningún job ni cron en el proyecto.

**Ajuste post-deploy (evidencia obligatoria):** ya con la app en producción (https://grasolimpiadas.vercel.app), el dueño pidió atar la evidencia fotográfica a cada item marcado en vez de una foto genérica opcional por día. Se implementó sin cambios de esquema (`evidence.regla_key` ya existía) — solo cambios de app: `entriesApi.js` y `DailyEntry.jsx`. Reglas: obligatorio (mín. 1 foto) para todo `tipo = 'suma'`; nunca para `tipo = 'resta'` (incluida Penalidades); bloquea el guardado si falta. Al implementar esto se encontró y corrigió un bug real (no solo de las pruebas automatizadas): `e.target.files` es una referencia viva al input — limpiar `input.value = ''` justo después de leerlo (para poder re-seleccionar) vaciaba también el array que se pensaba guardar en el estado, si la lectura ocurría de forma diferida. Fix: convertir a array (`Array.from(...)`) ANTES de limpiar el input, no dentro del callback de `setState`.

**Ajuste post-deploy (drill-down del historial):** cada día del historial ahora es clickeable y abre `DayDetail.jsx`, un resumen de solo lectura de exactamente lo que se marcó ese día y la evidencia subida (fotos con link a tamaño completo). Nueva función `getDayDetail(entryId)` en `entriesApi.js`, sin cambios de esquema.

**Ajuste post-deploy (foto de perfil real):** `users.avatar_url` ya existía en el esquema desde la Fase 1 pero nunca se usaba — toda la app siempre mostraba el círculo de iniciales. Se agregó `uploadAvatar(userId, file)` en `usersApi.js`, el bucket `avatars` (`supabase/06_avatars_storage.sql`), y un componente compartido `Avatar.jsx` (foto si `avatar_url` existe, si no las iniciales de siempre) que reemplazó las 4 implementaciones locales duplicadas (`App.jsx`, `ProfileSelect.jsx`, `ManageUsers.jsx`, `Ranking.jsx`). `ManageUsers.jsx` agrega un botón de cámara sobre el avatar de cada participante activo para subir/reemplazar su foto. Sin remover fotos viejas de Storage al reemplazar (quedan huérfanas, igual que el resto de la app no hace borrado duro). **Nota de nombres de archivo:** el helper `avatar.js` (iniciales + color) se renombró a `avatarUtils.js` porque colisionaba con el nuevo `Avatar.jsx` en sistemas de archivos insensibles a mayúsculas (macOS) — Vite resolvía `./Avatar` al archivo viejo y el build fallaba. Si agregas otro archivo cuyo nombre solo difiera en mayúsculas de uno existente, vas a pisar la misma piedra.

**Ajuste post-deploy (penalidades retroactivas desde Historial):** el dueño pidió poder marcar cosas negativas (día perdido, fin de semana destructivo, no registrar) para días pasados directamente desde el Historial, incluso si ese día nunca se registró. No se construyó un formulario nuevo — se reusó `DailyEntry.jsx` completo (ya soportaba cualquier fecha pasada vía el selector de fecha): `App.jsx` ahora guarda `fechaEditar` y expone `irAEditarDia(fecha)`, que abre la pestaña "Hoy" con esa fecha precargada. `History.jsx` agregó un selector de fecha + botón "Ir" (para días con o sin entry) y `DayDetail.jsx` un botón "Editar este día" (para días que ya tienen entry). Sin cambios de esquema ni de `entriesApi.js` — el checklist, el motor de puntos y la validación de evidencia (que no aplica a Penalidades por ser `resta`) ya funcionaban igual para cualquier fecha.

**Ajuste post-deploy (registro incremental — cambio grande de flujo):** viendo el comportamiento real del grupo, el dueño notó que la gente no marca todo el día de una — van subiendo evidencia de a pocos según pasa el día (ejercicio en la mañana, comida fit al mediodía, etc.). El checklist-completo-y-un-botón-de-"Guardar día" se reemplazó por un modelo incremental: `DailyEntry.jsx` ahora muestra un `<select>` (agrupado por categoría vía `<optgroup>`) para elegir UNA actividad, un input de foto si la regla es `tipo='suma'` (las restas no la piden), y un botón "Registrar" que persiste esa actividad al toque — sin paso de guardado final. Debajo, una sección "Ya registraste hoy" (usando el nuevo componente compartido `ItemRow.jsx`) muestra lo ya hecho ese día con sus fotos. **Cada regla se puede registrar máximo 1 vez por día** — el `<select>` muestra las ya registradas como `<option disabled>` (visibles pero no seleccionables, no ocultas, como pidió el dueño), y a nivel de datos hay una constraint única `(entry_id, regla_key)` en `entry_items` (`supabase/07_entry_items_unique.sql`) como resguardo real. Comodín y comida libre pasaron de ser toggles locales guardados junto al checklist a guardarse cada uno al toque (`actualizarComodin`, `actualizarComidaLibre` en `entriesApi.js`), recalculando el neto tras cada acción. Se eliminó `saveDailyEntry` (el batch "reemplaza todo") de `entriesApi.js` — ya no tenía caller. La foto "en el momento" no necesitó código nuevo: un `<input type="file" accept="image/*">` plano ya dispara el selector nativo de iOS/Android que ofrece cámara y galería — agregar el atributo `capture` habría forzado solo cámara, quitando la opción de elegir de la galería que también se pidió.

**Ajuste post-deploy (límite compartido por categoría):** el dueño pidió que las actividades de Bienestar (meditar/journaling/misa/leer y 1h sin pantallas) contaran como máx 1 por día ENTRE las dos — alguien no debería poder ganar puntos por ambas el mismo día. Se implementó de forma genérica, no hardcodeada a "Bienestar": nueva columna `rules.limite_categoria_dia` (nullable, `supabase/08_limite_categoria_dia.sql`), seteada a `1` solo en `bien_mente` y `bien_sin_pantallas`. `rulesApi.js` la trae en el select; `DailyEntry.jsx` cuenta cuántos items ya registrados hoy comparten la `categoria` de cada regla y, si una categoría con límite ya lo alcanzó, deshabilita TODAS sus reglas restantes en el `<select>` (no solo la que ya estaba marcada) con un motivo distinto ("— ya cumpliste el límite de Bienestar hoy") al de "— ya registrada". Es un límite de solo cliente, igual que el máximo de comodines o la comida libre semanal — no hay constraint ni trigger de DB que lo garantice (ver §9). Si se quiere aplicar este mismo límite a otra categoría en el futuro, alcanza con actualizar la columna en `rules` — no hace falta tocar código.

**Ajuste post-deploy (se quita toda la evidencia fotográfica):** el dueño simplificó el flujo real: el grupo reporta evidencia por su chat de WhatsApp y lleva los puntos aparte en un Excel — quería que la app solo emulara ese comportamiento (checklist + cálculo de puntos), sin manejar fotos. Se revirtió por completo la evidencia obligatoria del ajuste anterior: `entriesApi.js` — `registrarActividad` perdió el parámetro `fotos` y el loop de subida a Storage; `getEntryForDate` y `getDayDetail` dejaron de consultar la tabla `evidence`. `DailyEntry.jsx` perdió el estado `fotosSeleccionadas`/`evidenciaExistente`, el bloque de UI de foto, y la validación `requiereEvidencia`/`puedeRegistrar` que la exigía. `ItemRow.jsx` se simplificó a solo descripción + puntos (ya no recibe ni renderiza `fotos`). `DayDetail.jsx` sigue mostrando el detalle de un día, ahora sin fotos. La tabla `evidence` y el bucket de Storage del mismo nombre se dejaron intactos en el esquema (nada de borrado duro), simplemente ya no los usa ningún código — pueden tener filas/archivos huérfanos de cuando la evidencia sí existía. Si se quiere reintroducir evidencia en el futuro, **preguntar primero** — ya se probaron dos direcciones distintas y ambas se descartaron.

**Ajuste post-deploy (ranking en la pantalla de selección de perfil):** se agregó el componente `Ranking` (de `features/ranking/`, sin cambios) directamente en `ProfileSelect.jsx`, debajo de la grilla de perfiles y del botón "Gestionar participantes" — visible para cualquiera que abra la app, sin necesidad de elegir un perfil primero. Reuso directo, sin duplicar lógica: `Ranking` no depende de ningún perfil/sesión, así que se importó tal cual desde `features/users/`. Solo se muestra cuando hay al menos un participante activo (mismo `if` que ya ocultaba la grilla cuando la lista está vacía).

**Ajuste post-deploy (grupos exclusivos entre reglas de una misma medida):** el dueño pidió que ciertas reglas fueran mutuamente excluyentes porque son "buckets" de la misma medida — ejemplo textual: "el agua solo puedes registrar o un litro o 2 litros". Igual con horas de sueño y cantidad de tragos. El mecanismo de §3.12 (`limite_categoria_dia`) no bastaba porque agua cruza dos categorías (Hidratación y Hábitos), así que se agregó una etiqueta libre `rules.grupo_exclusivo` (`supabase/09_grupo_exclusivo.sql`), independiente de `categoria`: máx 1 registro por día entre todas las reglas que comparten la misma etiqueta. Se crearon 3 grupos: `'agua'` (`hidra_2l`, `hidra_1a2l`, `rest_agua_menos1l`), `'sueno_horas'` (`sueno_7a8`, `sueno_6`, `rest_dormir_menos5`), `'tragos'` (`rest_alcohol_1a2`, `rest_alcohol_3mas`). Se confirmó con el dueño ANTES de implementar que `rest_trasnochar` (Trasnochar sin motivo) y `rest_guayabo` (Guayabo) quedan fuera de sus respectivos grupos — ambos son efectos/comportamientos que pueden coexistir con cualquier bucket de la medida principal, no son parte de la medida en sí. `DailyEntry.jsx` agregó `grupoExclusivoConflicto(regla)` (similar en espíritu a `limiteCategoriaAlcanzado`, pero busca coincidencia de `grupo_exclusivo` en vez de `categoria`) — el `<select>` deshabilita la opción y muestra `— ya elegiste "X" hoy` nombrando la regla específica que causó el conflicto (no un mensaje genérico).

**Ajuste post-deploy (desempate del ranking sin el cap de +15/día):** el cap de §3.5 hace que los empates en `puntos_totales` sean normales en el ranking — dos personas pueden empatar aunque a una le haya ido mucho mejor en el día a día. El dueño pidió llevar una segunda suma SIN el cap y usarla solo para desempatar (el orden sigue siendo primero por el total CON cap). Se agregó `daily_entries.puntos_netos_sin_limite` (`supabase/10_puntos_sin_limite.sql`, con backfill de todos los días ya guardados) y `calcularNetoSinLimite()` en `pointsEngine.js` (mismo cálculo que `calcularNeto`, sin `Math.min(positivos, 15)`; el comodín sigue dejando el día en 0 en ambas sumas). `entriesApi.js`'s `recalcularNeto` ahora persiste ambos valores en cada acción. `v_ranking` agrega `puntos_totales_sin_limite` y lo usa como segundo criterio de `order by`; `rankingApi.js` refleja el mismo orden en su `.order()`. `Ranking.jsx` deja de determinar "quién es el último" solo por `puntos_totales` — ahora, entre los que empatan en el mínimo, busca también el mínimo de `puntos_totales_sin_limite`, para no marcar como último a alguien a quien realmente le fue mejor. **Nota de Postgres:** `create or replace view` no permite insertar una columna en medio de las ya existentes (falla con "cannot change name of view column") — hubo que usar `drop view` + `create view` en la migración; si se agregan más columnas a `v_ranking` en el futuro, usar el mismo patrón o agregarlas al final del `select`.

**Ajuste post-deploy (módulo administrativo "Gestionar Reto"):** ver §3.16 para la decisión completa. Resumen técnico: nuevo feature `src/features/admin/` (`AdminGate.jsx`, `ManageRules.jsx`, `rulesAdminApi.js`), nueva columna `rules.activo` (`supabase/12_rules_activo.sql`), `rulesApi.js` filtra `activo = true` para el checklist diario, `ProfileSelect.jsx`/`App.jsx` agregan la navegación al módulo. El PIN vive hardcodeado en `AdminGate.jsx` (`const PIN_ADMIN = '9610'`) — si se necesita cambiarlo, es una edición de código, no de datos.

**Ajuste post-deploy (UI del ranking: total sin límite visible + colores por signo + top 3 en verde):** solo cambios de presentación en `Ranking.jsx`, sin tocar datos ni queries — `puntos_totales_sin_limite` ya viajaba desde `v_ranking` desde el ajuste anterior pero no se mostraba en pantalla. Se agregó `colorPuntos(valor, esUltimo)`: verde (`var(--success)`) si el valor es positivo, rojo (`var(--danger)`) si es negativo o si la fila es el último lugar (el último siempre se ve rojo aunque su valor sea 0), neutro (`var(--text)`) en 0. El número principal (`puntos_totales`) y el número entre paréntesis (`puntos_totales_sin_limite`) se colorean cada uno según su propio signo — pueden diferir (ej. `+26 (+29)`). Las 3 primeras filas del ranking (excluyendo al último, para no pisar su resaltado rojo en grupos chicos) ahora tienen borde/fondo verde (`var(--success)` / `var(--success-soft)`), simétrico al tratamiento rojo que ya tenía el último lugar. Nuevas variables CSS en `styles.css`: `--success: #34c759`, `--success-soft: #10331f`.

**Ajuste post-deploy (registro en dos modos: individual + checklist en bulk):** el dueño pidió recuperar la posibilidad de marcar el día completo de una sola vez (como la versión inicial), sin perder el modo incremental "una por una" que ya usa el grupo. `DailyEntry.jsx` agregó un switch de modo (`modo: 'individual' | 'checklist'`) arriba del formulario de registro. En modo checklist se muestran TODAS las reglas como checkboxes agrupados por categoría (igual estética que el `<select>` de modo individual, pero de a varias); al tildar, un nuevo botón "Registrar seleccionadas (N)" las guarda todas juntas en un solo viaje. Nueva función `registrarActividades({ userId, fecha, reglas })` en `entriesApi.js`: un solo `insert` multi-fila en `entry_items` + una sola llamada a `recalcularNeto` al final (no N llamadas), reusando `ensureEntry`/`recalcularNeto` tal cual. Las validaciones (una regla máx 1x/día, `limite_categoria_dia`, `grupo_exclusivo`) se replicaron para el checklist como `limiteCategoriaAlcanzadoChecklist`/`grupoExclusivoConflictoChecklist`, considerando tanto lo ya persistido (`marcadas`) como lo tildado-pero-aún-sin-guardar (`seleccionadosChecklist`) — así un checkbox se deshabilita en vivo en cuanto tildás otro de su mismo grupo/categoría, sin esperar al guardado. Ambos modos leen y escriben exactamente los mismos `entry_items`; son dos maneras de llegar al mismo registro, no dos sistemas paralelos — cambiar de modo a mitad de día no pierde ni duplica nada.

**Ajuste post-deploy (Bienestar deja de tener límite de categoría):** el dueño pidió permitir sumar meditar/journaling/misa/leer (+2) y 1h sin pantallas (+1) el mismo día — hasta ahora contaban máx 1 entre las dos (§3.12). Cambio de solo datos, sin tocar código: `supabase/11_bienestar_sin_limite_categoria.sql` vuelve a poner `rules.limite_categoria_dia = null` en `bien_mente` y `bien_sin_pantallas`. `DailyEntry.jsx` ya trataba `limite_categoria_dia == null` como "sin límite de categoría" desde que se implementó el mecanismo (§3.12), así que no hizo falta cambiar `limiteCategoriaAlcanzado`/`limiteCategoriaAlcanzadoChecklist` ni el `<select>`/checklist — simplemente dejan de encontrar un límite que aplicar. El mecanismo genérico sigue disponible para otras categorías en el futuro.

**Ajuste post-deploy (eliminar un item ya registrado, con confirmación):** el dueño pidió poder corregir un registro por accidente (ejemplo real: marcó "Dormir <5h" sin haber dormido eso) — no había forma de deshacer un registro, solo de agregar más. Nueva función `eliminarActividad({ entryId, reglaKey })` en `entriesApi.js`: borra el `entry_item` puntual (por `entry_id` + `regla_key`) y recalcula el neto — no borra el `daily_entries` en sí aunque quede sin items, para no perder flags de comodín/comida libre si estaban activos ese día. `ItemRow.jsx` ganó una prop opcional `onEliminar` que agrega una caneca (🗑️) al final de la fila — opcional porque `DayDetail.jsx` (historial, de solo lectura) sigue usando `ItemRow` sin ella. `DailyEntry.jsx` guarda ahora `entryId` (antes no se guardaba, no hacía falta) y, al tocar la caneca, abre un popup de confirmación (overlay fijo con `position: fixed`, no un componente de modal genérico — no había ninguno en el proyecto) mostrando la descripción y los puntos del item antes de borrar de verdad; "Cancelar" lo cierra sin tocar nada. Funciona para el día actual y para cualquier día pasado, porque reusa el mismo `DailyEntry.jsx` que ya soporta fecha vía el selector — no fue necesario tocar `History.jsx` ni `DayDetail.jsx`. Tras eliminar, el item vuelve a aparecer como seleccionable en el `<select>`/checklist (ya no está en `marcadas`), igual que si nunca se hubiera registrado.

**Ajuste post-deploy (módulo administrativo "Gestionar Reto"):** el dueño pidió un lugar para gestionar el catálogo de actividades sin tocar SQL — activar/desactivar, crear nuevas, ajustar puntos y si suman o restan. Nuevo feature `src/features/admin/`: `AdminGate.jsx` (pantalla de PIN, fijo en `9610`, validado en el cliente — ver §3.16 y §9), `ManageRules.jsx` (la gestión en sí) y `rulesAdminApi.js` (CRUD sobre `rules`, separado de `rulesApi.js` que sigue siendo el de solo-lectura para el checklist diario). Nueva columna `rules.activo` (`supabase/12_rules_activo.sql`, default `true`) — desactivar pone `activo = false` y `listCheckableRules()` en `rulesApi.js` ahora filtra `.eq('activo', true)`, así que una regla desactivada desaparece del `<select>`/checklist de `DailyEntry.jsx` sin borrar la fila ni afectar `entry_items` ya existentes. Crear una actividad (`crearRegla`) genera el `regla_key` con un slug de la descripción (prefijo `custom_`, con sufijo numérico si hay choque), y nace con `limite_categoria_dia`/`grupo_exclusivo` en `null` — a propósito, el dueño pidió no tocar esas condiciones entre reglas todavía. Editar puntos/tipo (`actualizarRegla`) permite cambiar el valor y si es `suma`/`resta`; como `entry_items` copia `puntos`/`categoria` al momento de registrarse (diseño ya existente desde Fase 2), estos cambios solo afectan registros futuros, nunca reescriben el historial. `ProfileSelect.jsx` agregó el botón "Gestionar Reto" debajo de "Gestionar participantes"; `App.jsx` agregó los estados de vista `'admin-gate'` y `'admin'`.

**Ajuste post-deploy (fix visual: input de fecha en iOS Safari):** el dueño reportó que el selector de fecha de "Hoy" (`DailyEntry.jsx`) se veía descentrado y mucho más alto que el resto de los inputs en su iPhone, aunque en el navegador (incluida la emulación mobile de Chrome) se veía bien. Causa: `<input type="date">` en iOS Safari usa un control nativo que ignora buena parte del box model normal (padding/altura) y no viene centrado por default — un problema conocido de ese input específico en iOS, no reproducible desde escritorio ni desde la emulación de Chrome. Fix en `styles.css`: regla `input[type="date"].input` con `-webkit-appearance: none`, `appearance: none`, `color-scheme: dark` (evita que el widget nativo se vea con controles claros sobre el tema oscuro) y `text-align: center` + `min-height: 46px` para igualar el alto del resto de los `.input`. Sin cambios de JSX.

**Ajuste post-deploy (detalle del historial también muestra Comodín/Comida libre):** al validar en navegador (contra Supabase real, usuario "Pruebas") que el registro de Comodín y Comida libre funcionara — cap forzado a 0, contador de comodines, exención de restas de Alimentación, límite semanal — se encontró que `DayDetail.jsx` (drill-down del historial) no mostraba esos flags: un día donde solo se activó Comodín o Comida libre (sin ninguna actividad marcada) decía "No se marcó nada ese día", que es confuso porque sí se marcó algo. `History.jsx` ya traía `comodin_usado`/`comida_libre_usada` por día (los usa para la etiqueta en la lista) — se pasan ahora también a `DayDetail.jsx` como props (`comodinUsado`, `comidaLibreUsada`) en vez de pedirlos de nuevo. `DayDetail.jsx` los muestra como etiquetas (mismo estilo pill) arriba de la lista de items, y el mensaje de "vacío" cambia a "No se marcó ninguna actividad ese día" cuando alguno de los dos flags está activo, para no sonar contradictorio.

Lo que ya funciona:
- Selección de perfil sin contraseña, persistida en localStorage. El ranking público se muestra ahí mismo, sin elegir perfil.
- CRUD de participantes con soft-delete y reincorporación.
- Registro diario en dos modos, elegibles con un switch: "Una por una" (incremental, elegir una actividad de un selector agrupado por categoría y "Registrar" — se guarda al toque) y "Checklist" (marcar varias actividades a la vez y guardarlas todas juntas). Ambos leen de `rules` (incluye "Penalidades") y escriben los mismos `entry_items`. Sin foto, sin botón de guardado final del día completo. Cada regla máximo 1 vez por día (deshabilitada en ambos modos una vez registrada, o en vivo dentro del checklist si otra ya tildada la bloquea por límite de categoría o grupo exclusivo). Editable para el día actual y días pasados vía selector de fecha. Cada item ya registrado tiene una caneca para eliminarlo (con popup de confirmación) si se marcó por accidente.
- Motor de puntos (`calcularNeto`): cap +15 solo a positivos, negativos sin piso.
- Comodín: máx 2 por persona (contador en `users.comodines_restantes`), aplicable a cualquier día (retroactivo), deja el neto del día en 0. El ranking histórico queda consistente automáticamente porque `puntos_netos` se guarda en 0 al momento de activarlo — no requiere un recálculo aparte (Fase 3 solo suma esa columna).
- Comida libre: máx 1 por semana (lunes a domingo), decisión de UX tomada aquí: exime del cómputo las restas de categoría "Alimentación" marcadas ese día (quedan registradas para el historial, pero no penalizan el neto).
- Sin evidencia fotográfica — se probó (opcional, luego obligatoria) y se descartó por completo. El grupo reporta evidencia por WhatsApp y lleva puntos en Excel aparte; esta app solo emula el checklist. La tabla `evidence` y el bucket de Storage quedaron sin uso en el esquema.
- Ranking público (`v_ranking`): total acumulado del reto por usuario activo, desempatado por el total SIN el cap de +15/día (`puntos_totales_sin_limite`), resalta a quien(es) están en último lugar de verdad (ya considerando el desempate). Requiere correr `04_ranking_view.sql` y `10_puntos_sin_limite.sql`.
- Historial personal: lista de días registrados del usuario actual (más reciente primero), con el neto de cada uno, etiquetas de comodín/comida libre usados, y el total acumulado. Cada día es clickeable y abre un detalle de solo lectura (`DayDetail.jsx`) con lo marcado ese día.
- Penalidades manuales (día perdido, finde destructivo, no registré el día): checkboxes normales del checklist, ya no automáticas. Requiere correr `05_penalidades_manual.sql` si la DB ya tenía el catálogo viejo.
- Retroactivo desde Historial: selector de fecha + "Ir" (para días con o sin entry) y botón "Editar este día" en el detalle — ambos abren "Hoy" en esa fecha para marcar/editar cualquier cosa, típicamente Penalidades olvidadas.
- Foto de perfil real por participante: botón de cámara en "Gestionar participantes" sube a Storage (`avatars`) y actualiza `users.avatar_url`; se muestra en las 4 pantallas que renderizan avatares (selección de perfil, gestión, header de "Hoy", Ranking). Requiere correr `06_avatars_storage.sql`.
- Límite compartido por categoría (`rules.limite_categoria_dia`): mecanismo genérico, no hardcodeado, disponible para cualquier categoría vía datos. Actualmente ninguna categoría lo usa — se le quitó a Bienestar (§3.15); Bienestar ahora permite sumar meditar/journaling/misa/leer y 1h sin pantallas el mismo día. Requiere correr `08_limite_categoria_dia.sql` seguido de `11_bienestar_sin_limite_categoria.sql`.
- Grupos exclusivos entre reglas cruzando categorías (`rules.grupo_exclusivo`): agua (+2L / 1-2L / <1L), horas de sueño (7-8h / 6h / <5h), tragos (1-2 / 3+) — máx 1 por día entre las reglas de cada grupo. "Trasnochar" y "Guayabo" quedan fuera de sus grupos (confirmado con el dueño). Requiere correr `09_grupo_exclusivo.sql`.
- Desempate del ranking: `puntos_totales_sin_limite` (mismo total sin el cap de +15/día) rompe empates en `puntos_totales`, tanto en el orden como en quién se marca "último". Requiere correr `10_puntos_sin_limite.sql`.
- Módulo administrativo "Gestionar Reto" (botón debajo de "Gestionar participantes", protegido por PIN `9610` fijo en cliente): activar/desactivar actividades (`rules.activo`, las desactivadas desaparecen del checklist diario sin borrar historial), crear actividades nuevas (categoría, descripción, puntos, suma/resta), y editar puntos/tipo de las existentes (solo afecta registros futuros). No gestiona `limite_categoria_dia` ni `grupo_exclusivo` todavía — decisión explícita del dueño. Requiere correr `12_rules_activo.sql`.
- Navegación por tabs (Hoy / Ranking / Historial) dentro de `App.jsx`, sin librería de routing.
- `npm run build` pasa limpio. Fases 1–4 probadas end-to-end en navegador contra Supabase real (registro incremental actividad por actividad sin foto, con neto actualizándose al toque, selector deshabilitando lo ya registrado, comodín/comida libre guardándose de inmediato, persistencia tras recargar, ranking con resaltado de último, drill-down del historial mostrando el item registrado, penalidad retroactiva agregada a un día sin entry previo desde Historial usando el mismo flujo incremental, foto de perfil subida y persistiendo en las 4 pantallas que la muestran, límite de categoría Bienestar deshabilitando la segunda regla con el motivo correcto y persistiendo tras recargar).

Convenciones observadas en el código actual (mantenerlas):
- JS plano, sin TypeScript.
- Estilos con clases utilitarias en `styles.css` (`.btn`, `.card`, `.input`, `.muted`) + estilos inline puntuales.
- Tema oscuro, acento coral/rojo (`--accent: #d8442c`).
- Cada feature en su carpeta bajo `src/features/`.
- API de datos separada de los componentes (`*Api.js`), motor de puntos aparte y puro (`pointsEngine.js`).
- Agregaciones (ranking) viven en una vista SQL, no en JS — mismo principio que el catálogo de `rules`: no hardcodear lógica de datos en el frontend.
- Mensajes de error en español, tono directo, sin "por favor".

Setup local (proyecto Supabase nuevo):
1. Correr `01_schema.sql`, `02_seed_rules.sql`, `04_ranking_view.sql`, `06_avatars_storage.sql` y `07_entry_items_unique.sql` en orden. `03_storage.sql` (bucket `evidence`) es opcional/legacy — la app ya no maneja evidencia fotográfica (§3.3), así que en una instalación nueva no hace falta correrlo. No corras `05_penalidades_manual.sql`, `08_limite_categoria_dia.sql`, `09_grupo_exclusivo.sql`, `10_puntos_sin_limite.sql`, `11_bienestar_sin_limite_categoria.sql` ni `12_rules_activo.sql` — son solo para DBs que ya tenían el esquema viejo; `01_schema.sql` ya incluye `puntos_netos_sin_limite` y `activo`, `04_ranking_view.sql` ya incluye el desempate en `v_ranking`, y `02_seed_rules.sql` ya siembra Penalidades como manuales, Bienestar SIN límite de categoría, y los grupos exclusivos de agua/sueño/tragos.
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

`calcularNeto` sigue siendo pura y no cambió con el registro incremental (§8, ajuste post-deploy) — lo que cambió es CUÁNDO se llama: antes una vez al guardar todo el día, ahora una vez por cada acción (registrar una actividad, o togglear comodín/comida libre), siempre recalculando desde TODOS los `entry_items` vigentes del entry, no solo el nuevo.

`calcularNetoSinLimite` (§3.14, ajuste post-deploy) es la misma función sin el `Math.min(positivos, 15)` — separada en `pointsEngine.js` compartiendo un helper interno (`separarPuntos`) con `calcularNeto`, para no duplicar la lógica de comida libre / filtrado por tipo. Se llama junto a `calcularNeto` en cada `recalcularNeto`, y su resultado solo se usa como desempate del ranking (`v_ranking.puntos_totales_sin_limite`) — nunca se muestra como "el neto del día" en la UI.

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

### Ajuste post-deploy — Evidencia obligatoria por item (COMPLETA, luego REVERTIDA — ver más abajo)
- Con la app ya en producción, se reemplazó la foto opcional/genérica por día por evidencia obligatoria (mín. 1 foto) atada a cada item de `tipo = 'suma'` marcado; las restas nunca la piden. ✅
- Guardar el día se bloquea si falta foto de algún item de suma marcado; mensaje lista cuáles. ✅
- Sin cambios de esquema — `evidence.regla_key` ya existía. Solo cambió `entriesApi.js` (`getEntryForDate` devuelve `evidenciaPorRegla`; `saveDailyEntry` recibe `fotosPorRegla`) y `DailyEntry.jsx` (UI de foto por fila). ✅
- Bug encontrado y corregido durante la implementación: limpiar el `<input type="file">` justo después de leerlo vaciaba la referencia viva a `FileList` antes de que el `setState` la procesara. Fix: `Array.from(...)` antes de limpiar el input. ✅
- Probado en navegador: bloqueo funciona (lista los items sin foto), subir una foto desbloquea ese item, y la foto persiste tras recargar (viene de Supabase, no de memoria). ✅

### Ajuste post-deploy — Registro incremental (COMPLETA)
- Reemplazado el checklist-completo-y-un-botón-de-guardar por: elegir una actividad de un `<select>`, adjuntar foto si aplica (obligatoria en suma, no en resta), y "Registrar" — se persiste al toque. ✅
- Cada regla máximo 1 vez por día: el `<select>` la muestra como `<option disabled>` (visible, no seleccionable) una vez registrada; constraint única `(entry_id, regla_key)` en `entry_items` como resguardo de datos (`supabase/07_entry_items_unique.sql`). ✅
- Comodín y comida libre se guardan al toque (`actualizarComodin`, `actualizarComidaLibre`), ya no junto al checklist. ✅
- `saveDailyEntry` (batch) eliminado de `entriesApi.js` — sin caller tras el cambio. `calcularNeto` se sigue llamando igual, solo que ahora una vez por acción en vez de una vez al guardar todo. ✅
- Nuevo componente compartido `ItemRow.jsx` (descripción + puntos + fotos) usado tanto en la lista "ya registraste hoy" de `DailyEntry.jsx` como en `DayDetail.jsx`. ✅
- La foto "en el momento" no necesitó código nuevo — el input de archivo plano ya dispara cámara+galería en móvil. ✅
- Probado en navegador contra Supabase real: registrar con y sin foto, bloqueo sin foto en suma, selector deshabilitando lo ya registrado, comodín actualizando el contador y el neto al instante, persistencia tras recargar, y el flujo retroactivo desde Historial ("Editar este día") funcionando igual con el nuevo modelo. ✅

### Ajuste post-deploy — Límite compartido por categoría (COMPLETA)
- Bienestar (meditar/journaling/misa/leer + 1h sin pantallas) pasa a máx 1 registro por día entre las dos reglas. ✅
- Genérico vía `rules.limite_categoria_dia` (nullable) — no hardcodeado a "Bienestar" en `DailyEntry.jsx`, así que se puede extender a otra categoría solo con datos (`supabase/08_limite_categoria_dia.sql`). ✅
- El `<select>` deshabilita TODAS las reglas restantes de una categoría que ya alcanzó su límite, con un motivo distinto ("ya cumpliste el límite de X hoy") al de "ya registrada". ✅
- Límite de solo cliente, igual que comodines/comida libre — sin trigger de DB (ver §9). ✅
- Probado en navegador contra Supabase real: registrar "Meditación" deshabilitó "1h sin pantallas" con el motivo correcto (y viceversa no se probó pero es simétrico por diseño), y persistió tras recargar. ✅

### Ajuste post-deploy — Se quita toda la evidencia fotográfica (COMPLETA)
- El grupo reporta evidencia real por su chat de WhatsApp y lleva los puntos aparte en un Excel; el dueño quería que la app solo emulara eso (checklist + puntos), sin manejar fotos en absoluto. ✅
- Revertido el ajuste de "evidencia obligatoria por item" completo: `registrarActividad` perdió el parámetro `fotos` y la subida a Storage; `getEntryForDate`/`getDayDetail` dejaron de consultar `evidence`. ✅
- `DailyEntry.jsx`: sin estado de fotos, sin bloque de UI de foto, sin validación que la exigiera — "Registrar" solo depende de haber elegido una actividad (y no haber topado el límite de categoría). ✅
- `ItemRow.jsx` simplificado a solo descripción + puntos. ✅
- Tabla `evidence` y bucket de Storage `evidence` sin borrar (nada de borrado duro) pero sin uso desde ningún código. ✅
- Probado en navegador contra Supabase real: registrar "Entrenamiento completo" (antes exigía foto) sin ningún paso de foto, detalle del historial sin sección de fotos, sin errores de consola. ✅

### Ajuste post-deploy — Ranking en la pantalla de selección de perfil (COMPLETA)
- `Ranking` (sin cambios) se agregó a `ProfileSelect.jsx`, debajo de la grilla de perfiles — visible sin elegir perfil primero. ✅
- Reuso directo, cero lógica nueva — `Ranking` ya era independiente de cualquier sesión/perfil. ✅
- Solo se muestra cuando hay al menos un participante activo (mismo `if` que ya condicionaba la grilla). ✅
- Probado en navegador contra Supabase real: la pantalla de selección muestra el leaderboard completo con el resaltado de último lugar, sin errores de consola. ✅

### Ajuste post-deploy — Grupos exclusivos entre reglas (COMPLETA)
- Agua (+2L / 1-2L / <1L), horas de sueño (7-8h / 6h / <5h) y tragos (1-2 / 3+): máx 1 registro por día entre las reglas de cada grupo, sin importar su categoría. ✅
- Nueva etiqueta genérica `rules.grupo_exclusivo` (no ligada a `categoria`, a diferencia de `limite_categoria_dia`) — necesaria porque agua cruza Hidratación y Hábitos. ✅
- Confirmado con el dueño antes de implementar: "Trasnochar sin motivo" y "Guayabo" quedan FUERA de sus respectivos grupos (son efectos que pueden coexistir con cualquier bucket de la medida principal). ✅
- `DailyEntry.jsx`: `grupoExclusivoConflicto(regla)` deshabilita en el `<select>` cualquier regla del mismo grupo ya cubierto por otra, mostrando qué regla específica causó el conflicto (`— ya elegiste "X" hoy`). ✅
- Probado en navegador contra Supabase real: los 3 grupos deshabilitan correctamente sus opciones restantes con el motivo correcto, "Trasnochar" y "Guayabo" siguen disponibles, y persiste tras recargar (verificado a nivel de DOM `disabled: true`). ✅

### Ajuste post-deploy — Desempate del ranking sin el cap de +15/día (COMPLETA)
- Nueva columna `daily_entries.puntos_netos_sin_limite` + `calcularNetoSinLimite()` en `pointsEngine.js` (mismo cálculo que `calcularNeto`, sin el cap) + `v_ranking.puntos_totales_sin_limite` como segundo criterio de orden. ✅
- Migración con backfill real de todos los días ya guardados (`supabase/10_puntos_sin_limite.sql`), no solo default 0 — importante porque ya había datos de producción. ✅
- `Ranking.jsx` usa el mismo desempate para decidir "quién es el último", no solo `puntos_totales` — evita marcar a alguien como último si su `puntos_totales_sin_limite` es mejor que el de otro con el mismo total con cap. ✅
- Bug de Postgres encontrado al migrar: `create or replace view` no permite insertar una columna en medio de las existentes (`ERROR: cannot change name of view column`) — se resolvió con `drop view` + `create view`. ✅
- Probado en navegador contra Supabase real: `getRanking()` devuelve `puntos_totales=26` / `puntos_totales_sin_limite=29` para un usuario cuyo cap sí se activó en algún día (backfill correcto); la lógica de desempate de "último lugar" se validó con datos simulados reproduciendo un empate real en `puntos_totales` con `puntos_totales_sin_limite` distinto, confirmando que solo el de menor desempate queda marcado. ✅

### Ajuste post-deploy — UI del ranking: sin límite visible + colores por signo + top 3 en verde (COMPLETA)
- `puntos_totales_sin_limite` (ya en `v_ranking` desde el ajuste anterior) ahora se muestra en pantalla, entre paréntesis junto al total con cap. ✅
- Color del número principal y del paréntesis por signo propio: verde si positivo, rojo si negativo o si es el último lugar, neutro en 0 — pueden diferir entre sí (ej. `+26 (+29)`). ✅
- Top 3 del ranking resaltados con borde/fondo verde (`--success` / `--success-soft`), simétrico al resaltado rojo del último lugar; el último nunca queda también marcado como top 3. ✅
- Solo cambios de presentación en `Ranking.jsx` + 2 variables CSS nuevas en `styles.css` — sin cambios de esquema ni de queries. ✅
- Probado en navegador contra Supabase real: top 3 en verde, último en rojo con `-2 (-2)`, un usuario con cap activado mostrando `+26 (+29)` en verde. ✅

### Ajuste post-deploy — Registro en dos modos: individual + checklist en bulk (COMPLETA)
- Switch en `DailyEntry.jsx` entre "Una por una" (el modo incremental existente) y "Checklist" (marcar varias reglas y guardarlas todas juntas), como pidió el dueño para recuperar la sensación de la versión inicial sin perder el modelo incremental. ✅
- Nueva `registrarActividades({ userId, fecha, reglas })` en `entriesApi.js`: un solo insert multi-fila en `entry_items` + un solo `recalcularNeto` al final. ✅
- Validaciones de límite por categoría y grupo exclusivo replicadas para el checklist (`limiteCategoriaAlcanzadoChecklist`, `grupoExclusivoConflictoChecklist`), considerando lo ya persistido Y lo tildado-sin-guardar — los checkboxes se deshabilitan entre sí en vivo. ✅
- Ambos modos comparten el mismo estado (`marcadas`) y los mismos `entry_items` — cambiar de modo no pierde ni duplica registros. ✅
- Probado en navegador contra Supabase real: registro bulk de 3 actividades en un solo guardado, conflicto de grupo exclusivo (agua) deshabilitando en vivo entre categorías distintas (Hidratación/Hábitos), límite de categoría (Bienestar) deshabilitando en vivo, y verificación de que el modo individual ve los mismos items ya marcados tras cambiar de modo. ✅

### Ajuste post-deploy — Bienestar deja de tener límite de categoría (COMPLETA)
- `bien_mente` (+2) y `bien_sin_pantallas` (+1) ahora se pueden registrar ambas el mismo día — antes máx 1 entre las dos (§3.12). ✅
- Cambio de solo datos: `rules.limite_categoria_dia` vuelve a `null` para las dos (`supabase/11_bienestar_sin_limite_categoria.sql`). Sin cambios de código — `DailyEntry.jsx` ya trataba `null` como "sin límite". ✅
- `supabase/02_seed_rules.sql` actualizado para que una instalación nueva ya nazca sin este límite. ✅
- El mecanismo genérico de límite por categoría queda intacto en el código, disponible para otra categoría en el futuro. ✅

### Ajuste post-deploy — Eliminar un item ya registrado, con confirmación (COMPLETA)
- Nueva `eliminarActividad({ entryId, reglaKey })` en `entriesApi.js`: borra el `entry_item` puntual y recalcula el neto; no borra el `daily_entries` completo (conserva comodín/comida libre si estaban activos). ✅
- `ItemRow.jsx` ganó una prop opcional `onEliminar` que agrega una caneca 🗑️ — opcional para no afectar `DayDetail.jsx` (historial, solo lectura). ✅
- `DailyEntry.jsx`: nuevo estado `entryId` (antes no se guardaba) + popup de confirmación (overlay `position: fixed`) con la descripción y puntos del item antes de borrar. Funciona en el día actual y en cualquier día pasado vía el selector de fecha ya existente. ✅
- Probado en navegador contra Supabase real: eliminado un registro real de "Dormir <5h" (-2) del perfil de un participante — el modal mostró la descripción y puntos correctos, "Eliminar" lo borró y el neto del día se recalculó de +5 a +7 correctamente, la fila desapareció de "Ya registraste hoy" y la regla volvió a estar disponible en el selector. ✅

### Ajuste post-deploy — Módulo administrativo "Gestionar Reto" (COMPLETA)
- Botón "Gestionar Reto" debajo de "Gestionar participantes" en `ProfileSelect.jsx`, protegido por PIN fijo `9610` validado en el cliente (`AdminGate.jsx`). ✅
- Nueva columna `rules.activo` (`supabase/12_rules_activo.sql`) — desactivar una regla la oculta del checklist/selector diario (`rulesApi.js` filtra `activo = true`) sin borrar su historial. ✅
- `ManageRules.jsx` + `rulesAdminApi.js`: crear actividad nueva (categoría, descripción, puntos, suma/resta), editar puntos/tipo de una existente, activar/desactivar — agrupado por categoría, mismo estilo visual que el resto de la app. ✅
- A propósito, NO se gestionan `limite_categoria_dia` ni `grupo_exclusivo` desde este módulo — decisión explícita del dueño, queda para después. ✅
- Editar puntos/tipo no reescribe historial: `entry_items` ya copiaba `puntos`/`categoria` al momento de registrarse (diseño de Fase 2), así que solo afecta registros futuros. ✅
- Probado en navegador contra Supabase real: PIN incorrecto muestra error y limpia el campo, PIN correcto entra; se creó una actividad de prueba, se editó a resta con otro valor de puntos, se desactivó (desaparece del `<select>` de "Hoy" para otro usuario) y se reactivó — todo persistiendo correctamente. ✅

### Ajuste post-deploy — Fix visual del input de fecha en iOS Safari (COMPLETA)
- Reportado por el dueño con captura real de su iPhone: el selector de fecha de "Hoy" se veía descentrado y más alto que el resto de los inputs. ✅
- Causa: control nativo de `<input type="date">` en iOS Safari, que no se reproduce en escritorio ni en la emulación mobile de Chrome — no se pudo verificar en un iPhone real desde este entorno. ✅ (verificado en Chrome mobile emulation, donde ya se veía bien antes y después)
- Fix solo CSS en `styles.css`: `-webkit-appearance: none`, `appearance: none`, `color-scheme: dark`, `text-align: center`, `min-height: 46px` en `input[type="date"].input`. Sin cambios de JSX. ✅
- Pendiente de confirmación real: el dueño debe revisar en su iPhone tras el próximo deploy a Vercel, ya que este entorno no tiene forma de probar Safari/iOS de verdad.

### Ajuste post-deploy — Validación de Comodín/Comida libre + fix del detalle del historial (COMPLETA)
- Validación end-to-end en navegador contra Supabase real (usuario "Pruebas"): Comodín fuerza el neto a 0 sin importar los puntos registrados, el contador `comodines_restantes` decrementa/incrementa correctamente (probado hasta agotarlo en 2 días distintos y confirmando que el botón se deshabilita en un tercero), y Comida libre exime las restas de "Alimentación" del cálculo sin borrarlas de la lista, respetando el límite de 1 por semana (probado con dos días de la misma semana). ✅
- Encontrado durante la validación: `DayDetail.jsx` no mostraba si ese día se había usado Comodín/Comida libre cuando no había ninguna actividad marcada — decía "No se marcó nada ese día", contradictorio. ✅ (corregido)
- Fix: `History.jsx` pasa `comodinUsado`/`comidaLibreUsada` (que ya traía consigo para la etiqueta de la lista) a `DayDetail.jsx` como props — sin consulta nueva. `DayDetail.jsx` los muestra como etiquetas y ajusta el mensaje de vacío. ✅

### Fase 5 — Pulido (opcional)
- Copy con el tono de las Grasolimpiadas, animaciones, notificación del último lugar.

---

## 9. Seguridad / cosas a resolver

- **RLS:** definir políticas en Supabase. Sin auth real, la anon key da acceso. Para un grupo cerrado puede bastar, pero **no publicar la anon key en un repo público** ni exponer la app abiertamente sin pensar en abuso (alguien podría borrar/editar entries de otros). Opciones: mantener la app privada, o meter una capa mínima de identificación.
- **Comodín retroactivo + recálculo:** asegurar que el ranking se recalcula de forma consistente y que el contador `comodines_restantes` se decrementa sin condiciones de carrera.
- **Storage:** bucket `evidence` (`supabase/03_storage.sql`) sin uso — la app ya no maneja evidencia fotográfica (§3.3). El bucket `avatars` (`06_avatars_storage.sql`) sí está en uso activo para fotos de perfil, con las mismas políticas públicas de lectura/inserción. Mismo trade-off que el resto del honor system (acceso abierto, grupo cerrado); revisar si la app deja de ser privada.
- **Límites de solo cliente:** comodines (máx 2), comida libre (1/semana), `limite_categoria_dia` (ej. Bienestar) y `grupo_exclusivo` (agua, sueño, tragos) se validan solo en `DailyEntry.jsx`, sin constraint ni trigger de DB. Con la anon key expuesta, alguien podría saltárselos llamando a Supabase directo. Aceptable para un grupo cerrado de honor system, pero si se quiere blindar de verdad haría falta un trigger de Postgres (más complejo que la constraint única de "una regla, una vez" que sí quedó a nivel de datos — ver `entry_items` en §5).
- **PIN del módulo administrativo (§3.16) es solo del lado del cliente.** `AdminGate.jsx` compara contra un string hardcodeado (`9610`) en el bundle de JS — cualquiera con las devtools abiertas puede leerlo o directamente llamar a `rulesAdminApi.js` sin pasar por el gate. No protege contra alguien decidido, solo evita que un participante cualquiera desactive o edite actividades por accidente o curiosidad. Mismo nivel de confianza que el resto de la app (honor system, sin Supabase Auth) — no usar este PIN como si fuera una contraseña real.

---

## 10. Copy original del reto (referencia de tono, para Fase 5)

El reto se llama "Las Grasolimpiadas". Tono competitivo, burlón, motivacional-agresivo: "aquí hay dos tipos de personas: los que compiten y los que estorban", "el ranking es público y el último no pasa desapercibido", "comes limpio, entrenas duro, cumples TODO, reportas TODO… o empiezas a acostumbrarte a ver tu nombre abajo". Reglas visibles al usuario: máx 15 pts/día, 2 comodines por persona (dejan el día en 0), 1 comida libre por semana sin penalización. (La evidencia con fotos que mencionaba el copy original ya no aplica — se reporta por WhatsApp, ver §3.3.)

---

## Resumen para arrancar rápido

Estás continuando una webapp React+Vite+Supabase de un reto fitness, ya en producción en https://grasolimpiadas.vercel.app. Fases 1 (auth por perfil + CRUD de participantes), 2 (registro diario + motor de puntos), 3 (ranking público + historial), 4 (penalidades manuales, sin jobs) y varios ajustes post-deploy (drill-down del historial, foto de perfil, penalidades retroactivas, registro en dos modos — individual incremental y checklist en bulk, ambos máximo 1 vez por regla al día, con caneca para eliminar un item ya registrado por accidente —, mecanismo genérico de límite compartido por categoría (sin uso actual — se le quitó a Bienestar), evidencia fotográfica probada en dos direcciones y finalmente eliminada por completo, ranking visible en la pantalla de selección de perfil, grupos exclusivos entre reglas que cruzan categorías — agua/horas de sueño/tragos, máx 1 por día por grupo —, desempate del ranking sin el cap de +15/día, UI del ranking con colores por signo y top 3 resaltado, y un módulo administrativo "Gestionar Reto" protegido por PIN para activar/desactivar y crear actividades y ajustar sus puntos/tipo) están listos, compilan y probados end-to-end contra Supabase real. **Lo que queda es la Fase 5: pulido** (opcional — ver §8). Lee §3 (decisiones cerradas, incluye evidencia — ahora ninguna — en §3.3, registro incremental en §3.11, límite por categoría en §3.12 y su reversión para Bienestar en §3.15, grupos exclusivos en §3.13, desempate del ranking en §3.14 y el módulo administrativo en §3.16), §4 (reglamento), §5 (modelo de datos) y §7 (motor de puntos) antes de escribir código. No reabras decisiones cerradas sin preguntar — la de evidencia en particular ya se intentó dos veces en direcciones opuestas. El módulo administrativo NO gestiona `limite_categoria_dia` ni `grupo_exclusivo` todavía — eso se trabaja después, no lo agregues sin que te lo pidan. Mantén JS plano, español en la UI, y la estructura por features.
