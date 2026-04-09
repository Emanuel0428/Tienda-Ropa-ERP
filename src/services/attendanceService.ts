// Servicio de asistencia: único punto de acceso a Supabase para este módulo.
// Las páginas y hooks NO deben importar supabase directamente para datos de asistencia.

import { supabase } from '../supabaseClient';
import type {
  AttendanceRecord,
  StoreSchedule,
  IndividualSchedule,
  EmployeeSchedule,
  ScheduleTemplate,
  RotatingTemplate,
  Employee,
} from '../types/attendance';

// ─── Attendance Records ───────────────────────────────────────────────────────

export const getTodayRecords = async (userId: number): Promise<AttendanceRecord[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('id_usuario', userId)
    .gte('check_in', `${today}T00:00:00`)
    .lte('check_in', `${today}T23:59:59`)
    .order('check_in', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const registerCheckIn = async (
  userId: number,
  storeId: number,
  wifiVerified: boolean,
  wifiName: string | null
): Promise<AttendanceRecord> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert([{
      id_usuario: userId,
      id_tienda: storeId,
      check_in: new Date().toISOString(),
      wifi_verified: wifiVerified,
      wifi_name: wifiName,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const registerCheckOut = async (recordId: number): Promise<void> => {
  const { error } = await supabase
    .from('attendance_records')
    .update({ check_out: new Date().toISOString() })
    .eq('id', recordId);
  if (error) throw error;
};

export const updateLateNote = async (attendanceId: number, note: string | null): Promise<void> => {
  const { error } = await supabase
    .from('attendance_records')
    .update({ late_note: note })
    .eq('id', attendanceId);
  if (error) throw error;
};

export const getActiveRecordsByStore = async (
  storeId: number,
  date: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      id_usuario,
      check_in,
      wifi_verified,
      late_note,
      usuarios!inner(id_usuario, nombre, rol)
    `)
    .eq('id_tienda', storeId)
    .gte('check_in', `${date}T00:00:00`)
    .is('check_out', null)
    .order('check_in', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getActiveAttendanceStatus = async (userId: number): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('id_usuario', userId)
    .gte('check_in', `${today}T00:00:00`)
    .is('check_out', null)
    .maybeSingle();
  return !!data;
};

// ─── Store Schedules ──────────────────────────────────────────────────────────

export const getStoreSchedule = async (storeId: number): Promise<StoreSchedule | null> => {
  const { data, error } = await supabase
    .from('store_schedules')
    .select('*')
    .eq('id_tienda', storeId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// ─── Individual Schedules (por persona) ──────────────────────────────────────

export const getIndividualSchedule = async (
  userId: number,
  date: string
): Promise<IndividualSchedule | null> => {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('check_in_deadline, is_day_off, notes')
    .eq('id_usuario', userId)
    .eq('schedule_date', date)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const getWeekSchedule = async (
  userId: number,
  startDate: string,
  endDate: string
): Promise<EmployeeSchedule[]> => {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('id_usuario', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate)
    .order('schedule_date', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getMonthSchedule = async (
  userId: number,
  startDate: string,
  endDate: string
): Promise<EmployeeSchedule[]> => {
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('*')
    .eq('id_usuario', userId)
    .gte('schedule_date', startDate)
    .lte('schedule_date', endDate);
  if (error) throw error;
  return data || [];
};

export const upsertSchedules = async (schedules: EmployeeSchedule[]): Promise<void> => {
  const { error } = await supabase
    .from('employee_schedules')
    .upsert(schedules, { onConflict: 'id_usuario,schedule_date' });
  if (error) throw error;
};

export const deleteScheduleDay = async (scheduleId: number): Promise<void> => {
  const { error } = await supabase
    .from('employee_schedules')
    .delete()
    .eq('id', scheduleId);
  if (error) throw error;
};

export const getSchedulesByDateForEmployees = async (
  userIds: number[],
  date: string
): Promise<EmployeeSchedule[]> => {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('employee_schedules')
    .select('id_usuario, check_in_deadline, is_day_off')
    .eq('schedule_date', date)
    .in('id_usuario', userIds);
  if (error) throw error;
  return data || [];
};

// ─── Templates (plantillas por persona) ──────────────────────────────────────

export const getEmployeeTemplates = async (userId: number): Promise<ScheduleTemplate[]> => {
  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('id_usuario', userId)
    .order('template_name');
  if (error) throw error;
  return data || [];
};

export const saveTemplate = async (template: ScheduleTemplate): Promise<void> => {
  const { error } = await supabase.from('schedule_templates').upsert(template);
  if (error) throw error;
};

export const deleteTemplate = async (templateId: number): Promise<void> => {
  const { error } = await supabase
    .from('schedule_templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
};

export const applyTemplateToMonth = async (
  userId: number,
  templateId: number,
  targetMonth: string
): Promise<number> => {
  const { data, error } = await supabase.rpc('apply_template_to_month', {
    p_user_id: userId,
    p_template_id: templateId,
    p_target_month: targetMonth,
  });
  if (error) throw error;
  return data;
};

export const copySchedulesFromPreviousMonth = async (targetMonth: string): Promise<number> => {
  const { data, error } = await supabase.rpc('copy_schedules_from_previous_month', {
    p_target_month: targetMonth,
  });
  if (error) throw error;
  return data || 0;
};

// ─── Rotating Templates (plantillas globales rotativas) ───────────────────────

export const getRotatingTemplates = async (): Promise<RotatingTemplate[]> => {
  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('is_rotating_template', true)
    .is('id_tienda', null)
    .order('target_role')
    .order('week_number');
  if (error) throw error;
  return data || [];
};

export const updateRotatingTemplate = async (
  templateId: number,
  fields: Partial<RotatingTemplate>
): Promise<void> => {
  const { error } = await supabase
    .from('schedule_templates')
    .update(fields)
    .eq('id', templateId);
  if (error) throw error;
};

export const createDefaultRotatingTemplates = async (): Promise<void> => {
  const { error } = await supabase.rpc('create_default_rotating_templates');
  if (error) throw error;
};

export const applyRotatingSchedules = async (
  targetMonth: string
): Promise<{ tiendas_procesadas: number; usuarios_procesados: number; dias_creados: number }> => {
  const { data, error } = await supabase.rpc('apply_rotating_schedules_to_all_stores', {
    p_target_month: `${targetMonth}-01`,
  });
  if (error) throw error;
  return data[0];
};

// ─── Employees ────────────────────────────────────────────────────────────────

export const getEmployeesWithStore = async (): Promise<Employee[]> => {
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, rol, id_tienda')
    .order('nombre');
  if (usuariosError) throw usuariosError;

  const { data: tiendas, error: tiendasError } = await supabase
    .from('tiendas')
    .select('id_tienda, nombre');
  if (tiendasError) throw tiendasError;

  return (usuarios || []).map((emp) => {
    const tienda = (tiendas || []).find((t: any) => t.id_tienda === emp.id_tienda);
    return {
      id_usuario: emp.id_usuario,
      nombre: emp.nombre,
      rol: emp.rol,
      id_tienda: emp.id_tienda,
      nombre_tienda: tienda?.nombre || 'Sin tienda',
    };
  });
};

export const getAllStores = async (): Promise<{ id_tienda: number; nombre: string }[]> => {
  const { data, error } = await supabase
    .from('tiendas')
    .select('id_tienda, nombre')
    .order('nombre');
  if (error) throw error;
  return data || [];
};
