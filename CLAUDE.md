# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, port 5173)
npm run build     # Production build → dist/
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test suite is configured. Verify changes manually via `npm run dev`.

## Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GOOGLE_CLIENT_ID
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

## Architecture

**Single-page React 18 + TypeScript app** backed by Supabase (PostgreSQL + Auth + Storage). No server-side code — all business logic runs in the browser and talks directly to Supabase.

### Auth & Routing ([src/App.tsx](src/App.tsx))

Authentication is provided by `useAuth` (Supabase session + `usuarios` table). Routes are protected by three wrapper components:
- `<AdminRoute>` — `admin` only
- `<CoordinadorRoute>` — `admin` or `coordinador`
- `<AuditorRoute>` — `admin`, `coordinador`, or `auditor`

Five roles exist: `admin`, `coordinador`, `auditor`, `administradora`, `asesora`.

### State Management

No Redux or Zustand. State lives in:
1. **`useAuth`** ([src/hooks/useAuth.tsx](src/hooks/useAuth.tsx)) — global auth context (user, role, store, signIn/signOut)
2. **`useDarkMode`** ([src/hooks/useDarkMode.tsx](src/hooks/useDarkMode.tsx)) — persisted to localStorage, applies `dark` class to `<html>`
3. **`useAudit`** ([src/hooks/useAudit.tsx](src/hooks/useAudit.tsx)) — all audit logic (categories, questions, answers, photos, scoring, email notifications)
4. **Page-level `useState`** — modals, forms, loading, filters

### Services ([src/services/](src/services/))

| File | Responsibility |
|------|---------------|
| `supabaseClient.ts` | Supabase client singleton |
| `attendanceService.ts` | Check-in/out, schedules, employee queries |
| `googleDriveService.ts` | Drive API (list, upload, delete files) |
| `driveService.ts` | Google Drive OAuth implicit flow, token handling |
| `emailService.ts` | EmailJS — sends audit completion notifications |
| `imageService.ts` | Photo storage for audits |

### Types ([src/types/](src/types/))

- `index.ts` — core types: `User`, `Store`, `Sale`, `Task`, `Document`, `Goal`, etc.
- `attendance.ts` — `AttendanceRecord`, `StoreSchedule`, `Employee`, etc.
- `audit.ts` — `Auditoria`, `Respuesta`, `Categoria`, `Pregunta`, etc.

### Key Integrations

- **Google Drive** — OAuth 2.0 implicit flow; the OAuth callback is intercepted in [`src/main.tsx`](src/main.tsx) before React mounts. Configured in [`src/pages/DriveConfig.tsx`](src/pages/DriveConfig.tsx).
- **EmailJS** — sends audit emails from the browser (no backend required).
- **jscanify + jsPDF** — document border detection and PDF generation in [`src/pages/CameraCapture.tsx`](src/pages/CameraCapture.tsx).
- **Recharts** — charts in Statistics and Audit statistics pages.
- **n8n** — proxied at `/api/n8n` via Vite dev server (see `vite.config.ts`).

### Audit System

The audit module is the most complex feature. Flow: `Categorias → Subcategorias → Preguntas (master catalog)` → snapshot copied into `auditoria_preguntas` + `respuestas` per audit. Supports photo attachments, dynamic question add/remove, weighted scoring, and history references. Logic is centralized in `useAudit`.

### Attendance System

WiFi-based check-in verification (store has expected WiFi SSID). Supports individual templates and rotating shift schedules. Late detection runs on `useAttendanceUtils`. Real-time monitoring available to coordinador/admin via `AttendanceMonitor`.

### Styling

Tailwind CSS with dark mode via `class` strategy. Custom primary color: green (`#166534` family). Dark mode class applied to `document.documentElement`.

### Deployment

Deployed on Vercel. [`vercel.json`](vercel.json) rewrites all routes to `/index.html` for SPA routing.
