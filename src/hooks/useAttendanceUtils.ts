// Utilidades de negocio para el módulo de asistencia.
// Funciones puras — sin estado, sin efectos secundarios, fáciles de testear.

import type { StoreSchedule, IndividualSchedule } from '../types/attendance';

const DAY_KEYS = [
  'sunday_check_in_deadline',
  'monday_check_in_deadline',
  'tuesday_check_in_deadline',
  'wednesday_check_in_deadline',
  'thursday_check_in_deadline',
  'friday_check_in_deadline',
  'saturday_check_in_deadline',
] as const;

/** Devuelve la hora límite de entrada para hoy, considerando el horario individual primero. */
export const getTodayDeadline = (
  storeSchedule: StoreSchedule | null,
  individualSchedule: IndividualSchedule | null
): string => {
  if (individualSchedule) return individualSchedule.check_in_deadline;
  if (!storeSchedule) return '09:00:00';
  const dayKey = DAY_KEYS[new Date().getDay()];
  return storeSchedule[dayKey] || storeSchedule.check_in_deadline;
};

/** Determina si el usuario llegó tarde comparado con la hora límite. */
export const isLateForDeadline = (deadline: string): boolean => {
  const now = new Date();
  const [hours, minutes] = deadline.split(':').map(Number);
  const limit = new Date();
  limit.setHours(hours, minutes, 0, 0);
  return now > limit;
};

/** Formatea una fecha ISO a hora legible en formato 12h (ej: "9:30 AM"). */
export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Calcula la duración entre entrada y ahora (o salida si existe). */
export const calculateDuration = (checkIn: string, checkOut: string | null): string => {
  const diff = (checkOut ? new Date(checkOut) : new Date()).getTime() - new Date(checkIn).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
};

/** Distancia en metros entre dos coordenadas GPS (fórmula Haversine). */
export const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6_371_000;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Convierte hora "HH:mm:ss" a formato 12h para mostrar al usuario. */
export const formatDeadline = (time: string): string => {
  if (!time) return '--:--';
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 || 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

/** Obtiene el número de semana del año para una fecha dada. */
export const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
};

/** Devuelve la fecha del lunes de la semana de la fecha dada. */
export const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d;
};
