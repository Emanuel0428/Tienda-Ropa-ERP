# Tienda Ropa ERP

Sistema de gestión integral para tiendas de ropa. Aplicación web construida con React + TypeScript y Supabase como backend.

## Funcionalidades

- **Autenticación** — Login seguro con roles por usuario
- **Dashboard** — Vista general de métricas y resultados
- **Ventas** — Registro de ventas diarias y resumen por período
- **Metas** — Seguimiento de objetivos por tienda
- **Inventario** — Control de stock y productos
- **Auditorías** — Sistema completo de auditorías por tienda con fotos, preguntas, historial y estadísticas
- **Asistencia** — Control de horarios, turnos rotativos y monitor de asistencia
- **Documentos** — Gestión y carga de documentos a Google Drive
- **Tareas** — Asignación y seguimiento de tareas
- **Tiendas** — Administración de tiendas (nombre, teléfono, responsables)
- **Usuarios** — Gestión de usuarios y roles (crear, editar, eliminar)
- **Configuración** — Ajustes de la aplicación y modo oscuro

## Roles

| Rol | Acceso |
|-----|--------|
| `admin` | Todo |
| `coordinador` | Dashboard, Usuarios, Tiendas, Documentos, Auditorías, Asistencia |
| `auditor` | Dashboard, Auditorías |
| `administradora` / `asesora` | Dashboard, Asistencia, Documentos |

## Stack técnico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + modo oscuro
- **Backend / DB**: Supabase (PostgreSQL + Auth + Storage)
- **Almacenamiento de archivos**: Google Drive API

## Estructura de ramas

- `main` — producción (rama estable desplegada)
- `fede` — desarrollo activo

## Instalación local

```bash
npm install
npm run dev
```

Requiere archivo `.env` con las variables de Supabase y Google Drive (ver `.env.example` si existe).
