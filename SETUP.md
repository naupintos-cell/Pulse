# CaritoFit Pro — Guía de instalación paso a paso

## Lo que vas a necesitar
- Una computadora con internet
- 1-2 horas de tiempo
- No necesitás saber programar

---

## PASO 1 — Crear cuenta en Supabase (base de datos)

1. Entrá a **https://supabase.com**
2. Hacé clic en **"Start your project"**
3. Registrate con tu email de Google o creá una cuenta
4. Hacé clic en **"New project"**
5. Completá:
   - **Name**: `caritofit-pro`
   - **Database Password**: inventá una contraseña fuerte (guardala)
   - **Region**: elegí `South America (São Paulo)`
6. Esperá 2-3 minutos a que se cree el proyecto

---

## PASO 2 — Crear las tablas (base de datos)

1. En tu proyecto de Supabase, hacé clic en **"SQL Editor"** (en el menú izquierdo)
2. Hacé clic en **"New query"**
3. Abrí el archivo `supabase-schema.sql` de esta carpeta
4. Copiá TODO el contenido y pegalo en el editor
5. Hacé clic en **"Run"** (botón verde)
6. Deberías ver "Success. No rows returned" — eso está perfecto ✅

---

## PASO 3 — Obtener las credenciales de Supabase

1. En el menú izquierdo de Supabase, hacé clic en el ícono de **engranaje ⚙️** (Settings)
2. Hacé clic en **"API"**
3. Vas a ver dos valores que necesitás:
   - **Project URL**: algo como `https://abcdefg.supabase.co`
   - **anon public key**: una cadena muy larga que empieza con `eyJ...`
4. Guardá estos dos valores — los vas a necesitar en el siguiente paso

---

## PASO 4 — Instalar Node.js

1. Entrá a **https://nodejs.org**
2. Descargá la versión **LTS** (la recomendada)
3. Instalá siguiendo los pasos del instalador
4. Para verificar que funcionó, abrí una terminal/cmd y escribí:
   ```
   node --version
   ```
   Debería mostrarte algo como `v20.11.0`

---

## PASO 5 — Configurar el proyecto

1. Abrí la carpeta `caritofit` (la que contiene este archivo)
2. Copiá el archivo `.env.example` y renombralo a `.env.local`
3. Abrí `.env.local` con el Bloc de notas
4. Reemplazá los valores:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU-URL-ACÁ.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...TU-CLAVE-ACÁ
   ```
5. Guardá el archivo

---

## PASO 6 — Instalar dependencias y ejecutar

1. Abrí una terminal en la carpeta del proyecto
   - **Windows**: clic derecho en la carpeta → "Abrir en Terminal"
   - **Mac**: clic derecho → "Nuevo terminal en la carpeta"

2. Ejecutá estos comandos uno por uno:
   ```bash
   npm install
   npm run dev
   ```

3. Abrí el navegador y entrá a: **http://localhost:3000**
   ¡Deberías ver CaritoFit Pro funcionando! 🎉

---

## PASO 7 — Crear la cuenta de la profesora (Carla)

1. Con la app corriendo, entrá a **http://localhost:3000/register**
2. Registrate con los datos de Carla (el email y contraseña real que va a usar)
3. Una vez creada la cuenta, volvé a Supabase
4. Hacé clic en **"Table Editor"** → **"perfiles"**
5. Buscá la fila con el email de Carla
6. Cambiá el campo **`rol`** de `alumno` a `admin`
7. Cambiá el campo **`aprobado`** a `true`
8. Guardá los cambios

¡Listo! Carla ahora puede ingresar como profesora/admin.

---

## PASO 8 — Publicar online con Vercel (para que sea accesible desde cualquier lado)

1. Creá una cuenta en **https://github.com** (gratis)
2. Creá un repositorio nuevo y subí los archivos del proyecto
3. Entrá a **https://vercel.com** y creá una cuenta con GitHub
4. Hacé clic en **"New Project"** → importá tu repositorio
5. En la sección **"Environment Variables"**, agregá las mismas variables del `.env.local`
6. Hacé clic en **"Deploy"**
7. En 2-3 minutos tenés una URL pública tipo `caritofit.vercel.app`

---

## Costos mensuales

| Servicio  | Plan gratuito cubre...          |
|-----------|--------------------------------|
| Supabase  | Hasta 50.000 filas — suficiente para cientos de alumnos |
| Vercel    | Ilimitado para proyectos pequeños |
| **Total** | **$0/mes para empezar** |

---

## ¿Algo no funcionó?

Escribinos y te ayudamos a resolverlo.
Los errores más comunes son:
- Variables de entorno mal copiadas (verificar que no haya espacios)
- SQL del schema no ejecutado completamente (correr de nuevo)
- Node.js no instalado correctamente (reinstalar)
