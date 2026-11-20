# Sorteo GTA 6 · TechnoCell 2015

Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + Supabase (Postgres + Storage).

Identidad estilo Vice City: morado noche, rosa neón #FF2E88, naranja y amarillo del atardecer, turquesa #14D4C4; escena con sol, ciudad y palmeras dibujada en SVG (`src/components/vice.tsx`), tipografía Archivo (variable, auto-alojada en `src/fonts`). Los colores están en `src/app/globals.css`.

## Qué cambió respecto a la versión HTML

| Antes (sorteo.html + Netlify Forms) | Ahora |
|---|---|
| Puntos guardados en `localStorage` del teléfono: se pierden y se pueden falsear | Puntos calculados en la base de datos por cédula (vista `participant_points`) |
| «Una vez por tienda al día» solo lo controlaba el navegador | Restricción `unique (participante, tienda, día)` en Postgres |
| El QR era `?tienda=unicentro`: cualquiera podía sumarse todas las tiendas desde casa | Cada tienda tiene un token secreto en el QR (y se puede regenerar) |
| Se pedían todos los datos en cada visita | Cédula + teléfono una vez; luego solo la foto |
| Los 10 puntos por completar las tiendas y los 2 de Instagram no se calculaban | Se calculan solos; el bonus de IG se aprueba en el panel con el enlace del post |
| Sin panel, sin sorteo | Panel: ranking, fotos (aprobar/rechazar), Instagram, sorteo ponderado con historial, tiendas, carteles QR, export CSV |

## Puesta en marcha (unos 15 minutos)

1. **Crea un proyecto en [supabase.com](https://supabase.com)** (plan gratis).
2. Ve a **SQL Editor**, pega `supabase/schema.sql` y presiona **Run**. (Si ya lo habías ejecutado antes, vuelve a ejecutarlo: agrega las columnas nuevas y permite videos en el bucket sin borrar nada.) Esto crea las tablas, la vista de puntos, el bucket privado `fotos` y las 6 tiendas.
3. Copia `.env.example` a `.env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API). La service role **solo** vive en el servidor.
   - `NEXT_PUBLIC_SITE_URL`: el dominio final (los QR apuntan aquí).
   - `ADMIN_PASSWORD` y `SESSION_SECRET` (cadena aleatoria larga).
4. Ejecuta localmente:
   ```bash
   npm install
   npm run dev     # http://localhost:3000
   ```
5. **Publica en Vercel**: importa el repo y pega las mismas variables de entorno. Después entra a `/admin/carteles` e imprime los carteles **con el dominio final ya configurado**.

## Cómo funciona el sorteo

- **Puntos:** foto en una tienda **+2**, video creativo **+4** (máx. 30 s), visitar todas las tiendas **+10**, publicación de Instagram aprobada **+2**. Una subida por tienda al día.
- **Fotos y videos suben directo del teléfono a Supabase Storage** (URL firmada, con barra de progreso), sin pasar por el servidor: más rápido y sin límite de tamaño del servidor.
- **Todo suma al instante** y sale en la galería. La revisión se hace **al sortear**: el panel muestra todas las fotos y videos del ganador; si cumplió, lo confirmas; si no, lo anulas (queda descalificado) y sorteas de nuevo.
- **Enlace de Instagram (bonus +2):** si subió foto, solo acepta enlace de publicación (`/p/…`) o Historia; si subió video, solo Reel (`/reel/…`) o Historia. Un mismo enlace no se puede usar dos veces (se compara por el código de la publicación). El equipo confirma en el panel que etiquete a la cuenta.
- **Compartir en Instagram:** en el celular abre el menú del sistema con Instagram y una imagen 9:16 lista para Historias (o el video tal cual).

## Fecha de cierre y sorteo (desde el panel)

- **Panel → Sorteo → Fecha de cierre:** eliges el último día para participar (inclusive). Al pasar ese día los QR muestran "El sorteo cerró" y no aceptan más fotos ni videos. La portada muestra la cuenta regresiva.
- El botón **Sortear ganador** solo se habilita cuando el sorteo cerró. Si necesitas sortear antes, adelanta la fecha.
- Al **confirmar** un ganador, la portada lo anuncia (nombre corto, p. ej. "Ana P.").

## Acceso al panel (/admin)

- Solo **2 cuentas**. Se definen en Vercel con la variable `ADMIN_ACCOUNTS`, en formato `usuario:clave;usuario2:clave2` (claves de 12 caracteres o más).
- Login con usuario y clave; 5 intentos fallidos bloquean esa conexión 15 minutos.
- El panel muestra quién está conectado y el historial del sorteo guarda quién sorteó, confirmó o anuló.
- Cambiar la clave de alguien cierra sus sesiones abiertas. La sesión dura 12 horas.
- El panel no aparece en Google ni puede incrustarse en otras páginas.
- (Si no defines `ADMIN_ACCOUNTS`, funciona `ADMIN_PASSWORD` con el usuario `admin`.)

## Panel: estadísticas y gestión

- **Estadísticas:** tiendas con más registros, registros por día, horas pico, cuántas tiendas visitó cada persona y detalle por tienda (personas, fotos, videos, hoy, último registro).
- **Fotos y videos:** filtros por tienda y por tipo (foto/video).
- **Ficha de cada persona** (toca su nombre): desglose de puntos, tiendas visitadas, todas sus fotos/videos e Instagram.
- **Borrar:** fotos o videos sueltos, o a un participante completo (con sus archivos). Para borrar a alguien hay que escribir su cédula. Quien ya salió en un sorteo no se puede borrar (se anula), para que el historial quede completo.

## Otras protecciones

- Máximo 8 intentos fallidos de cédula + teléfono por conexión cada 15 minutos (frena a quien intente adivinar cédulas).
- Al compartir el link por WhatsApp o redes aparece una imagen de vista previa del sorteo.

## Rutas

- `/` página principal: cómo participar, tiendas y reglas
- `/t/<token>` destino del QR de cada tienda (registro + foto)
- `/galeria` galería pública de fotos + tabla de puntos (nombre corto "Ana P.", nunca cédula ni teléfono)
- `/mis-puntos` consulta de puntos con cédula + teléfono
- `/admin` panel (clave en `ADMIN_PASSWORD`)

## Configuración rápida

Marca, premio, usuario de Instagram, hashtag y valores de puntos: `src/lib/config.ts`. La fecha de cierre se cambia desde el panel (la de `config.ts` es solo el valor inicial).
Las reglas de puntos en SQL están en la vista `participant_points` de `supabase/schema.sql`. Si cambias los valores, cámbialos en los dos lugares.

## Seguridad

- RLS activado sin políticas: el navegador no puede leer ni escribir en la base directamente; todo pasa por server actions.
- Fotos en un bucket privado; el panel las ve con URLs firmadas que expiran en 1 hora.
- Sesión del admin y del participante con cookies firmadas (HMAC, `httpOnly`).
- Sorteo con `crypto.randomInt`; cada resultado queda guardado con el total de boletos de ese momento.
