// Tipos centralizados del módulo de asistencia
// Una sola fuente de verdad para todos los componentes relacionados

export interface AttendanceRecord {
  id: number;
  id_usuario: number;
  id_tienda: number;
  check_in: string;
  check_out: string | null;
  wifi_verified: boolean;
  wifi_name: string | null;
  late_note?: string | null;
}

export interface StoreSchedule {
  check_in_deadline: string;
  expected_wifi_name: string;
  notification_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  location_radius_meters: number;
  monday_check_in_deadline?: string;
  tuesday_check_in_deadline?: string;
  wednesday_check_in_deadline?: string;
  thursday_check_in_deadline?: string;
  friday_check_in_deadline?: string;
  saturday_check_in_deadline?: string;
  sunday_check_in_deadline?: string;
}

export interface IndividualSchedule {
  check_in_deadline: string;
  is_day_off: boolean;
  notes: string | null;
}

export interface EmployeeSchedule {
  id?: number;
  id_usuario: number;
  id_tienda: number;
  schedule_date: string;
  check_in_deadline: string;
  is_day_off: boolean;
  notes: string | null;
}

export interface ScheduleTemplate {
  id?: number;
  id_usuario: number;
  id_tienda: number;
  template_name: string;
  monday_time: string | null;
  monday_is_off: boolean;
  tuesday_time: string | null;
  tuesday_is_off: boolean;
  wednesday_time: string | null;
  wednesday_is_off: boolean;
  thursday_time: string | null;
  thursday_is_off: boolean;
  friday_time: string | null;
  friday_is_off: boolean;
  saturday_time: string | null;
  saturday_is_off: boolean;
  sunday_time: string | null;
  sunday_is_off: boolean;
}

export interface RotatingTemplate {
  id?: number;
  id_tienda: number | null;
  template_name: string;
  is_rotating_template: boolean;
  week_number: 1 | 2;
  target_role: 'administradora' | 'asesora';
  monday_time: string | null;
  monday_is_off: boolean;
  tuesday_time: string | null;
  tuesday_is_off: boolean;
  wednesday_time: string | null;
  wednesday_is_off: boolean;
  thursday_time: string | null;
  thursday_is_off: boolean;
  friday_time: string | null;
  friday_is_off: boolean;
  saturday_time: string | null;
  saturday_is_off: boolean;
  sunday_time: string | null;
  sunday_is_off: boolean;
}

export interface ActiveEmployee {
  id_usuario: number;
  nombre: string;
  rol: string;
  check_in: string;
  duration: string;
  wifi_verified: boolean;
  isLate: boolean;
  expectedTime: string | null;
  late_note?: string | null;
  attendance_id: number;
}

export interface StoreAttendance {
  id_tienda: number;
  nombre_tienda: string;
  activeEmployees: ActiveEmployee[];
  totalActive: number;
}

export interface Employee {
  id_usuario: number;
  nombre: string;
  rol: string;
  id_tienda: number;
  nombre_tienda: string;
}
