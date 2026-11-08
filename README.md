# CYB (Check Your Bills)

App web instalable (PWA) para registrar gastos, ingresos y deudas, y decidir cuál deuda atacar primero. Los datos los captura el usuario a mano; no se conecta con bancos.

## Qué incluye

- **Bills:** deudas (tarjetas, préstamos, informales) con abonos e historial.
- **Movimientos:** gastos, ingresos e ingresos extra, recurrentes y vistas por día, quincena y mes.
- **Plan:** método avalancha, bola de nieve o personalizado, con capacidad de pago y colchón.
- **Asesor:** base de conocimiento local sobre deudas. El asesor con IA está desactivado (ver `DEUDA-TECNICA.md`).
- **Seguridad y datos:** verificación en dos pasos (TOTP), exportar a CSV y borrar cuenta.

## Tecnología

React, TypeScript, Vite, Tailwind, TanStack Query y Supabase (Postgres con seguridad por usuario y autenticación).

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

Completa en `.env` la URL del proyecto y la clave pública (`anon` o `publishable`) de Supabase. Nunca uses la clave `service_role` en el frontend.

Las migraciones SQL están en `supabase/migrations` y se ejecutan en orden en el editor SQL de Supabase.

## Despliegue

Cada push a `main` construye y publica en GitHub Pages con `.github/workflows/deploy.yml`.

1. En el repositorio: Settings, Pages, Source: GitHub Actions.
2. En Settings, Secrets and variables, Actions, pestaña Variables, crear `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. En Supabase: Authentication, URL Configuration, agregar la URL publicada como Site URL y en Redirect URLs.

## Pendientes

Ver `DEUDA-TECNICA.md`.
