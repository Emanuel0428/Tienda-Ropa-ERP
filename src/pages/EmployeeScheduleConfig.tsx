import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Calendar, User, Save, RefreshCw, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  getEmployeesWithStore,
  getMonthSchedule,
  getEmployeeTemplates,
  saveTemplate,
  deleteTemplate,
  applyTemplateToMonth,
  upsertSchedules,
  deleteScheduleDay,
  copySchedulesFromPreviousMonth,
} from '../services/attendanceService';
import type { Employee, EmployeeSchedule, ScheduleTemplate } from '../types/attendance';

interface DaySchedule {
  date: Date;
  dateString: string;
  schedule: EmployeeSchedule | null;
  isToday: boolean;
  isPast: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const EMPTY_TEMPLATE = (employee: Employee): ScheduleTemplate => ({
  id_usuario: employee.id_usuario,
  id_tienda: employee.id_tienda,
  template_name: '',
  monday_time: '09:00', monday_is_off: false,
  tuesday_time: '09:00', tuesday_is_off: false,
  wednesday_time: '09:00', wednesday_is_off: false,
  thursday_time: '09:00', thursday_is_off: false,
  friday_time: '09:00', friday_is_off: false,
  saturday_time: '09:00', saturday_is_off: false,
  sunday_time: '09:00', sunday_is_off: false,
});

const EmployeeScheduleConfig: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<ScheduleTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
      setUserRole(data?.rol ?? null);
    };
    checkRole();
  }, []);

  // ── Empleados ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userRole === 'admin' || userRole === 'coordinador') {
      getEmployeesWithStore().then(setEmployees).catch(console.error);
    }
  }, [userRole]);

  // ── Horarios del mes ──────────────────────────────────────────────────────
  const loadSchedulesForMonth = useCallback(async () => {
    if (!selectedEmployee) return;
    setIsLoading(true);
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const data = await getMonthSchedule(
        selectedEmployee.id_usuario,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setSchedules(data);
    } catch (error) {
      console.error('Error cargando horarios:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployee, currentMonth]);

  // ── Plantillas ────────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (!selectedEmployee) return;
    getEmployeeTemplates(selectedEmployee.id_usuario).then(setTemplates).catch(console.error);
  }, [selectedEmployee]);

  useEffect(() => {
    if (selectedEmployee) {
      loadSchedulesForMonth();
      loadTemplates();
    }
  }, [selectedEmployee, currentMonth, loadSchedulesForMonth, loadTemplates]);

  // ── Días del mes ──────────────────────────────────────────────────────────
  const getDaysInMonth = useCallback((): DaySchedule[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: lastDay.getDate() }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateString = date.toISOString().split('T')[0];
      return {
        date,
        dateString,
        schedule: schedules.find(s => s.schedule_date === dateString) ?? null,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
      };
    });
  }, [currentMonth, schedules]);

  // ── Edición local ─────────────────────────────────────────────────────────
  const updateSchedule = useCallback((dateString: string, field: keyof EmployeeSchedule, value: any) => {
    setSchedules(prev => {
      const existing = prev.find(s => s.schedule_date === dateString);
      if (existing) {
        return prev.map(s => s.schedule_date === dateString ? { ...s, [field]: value } : s);
      }
      if (!selectedEmployee) return prev;
      const newEntry: EmployeeSchedule = {
        id_usuario: selectedEmployee.id_usuario,
        id_tienda: selectedEmployee.id_tienda,
        schedule_date: dateString,
        check_in_deadline: '09:00:00',
        is_day_off: false,
        notes: null,
        [field]: value,
      };
      return [...prev, newEntry];
    });
  }, [selectedEmployee]);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const saveSchedules = useCallback(async () => {
    if (!selectedEmployee) return;
    const toSave = schedules.filter(s => s.check_in_deadline !== '09:00:00' || s.is_day_off || s.notes);
    if (toSave.length === 0) { alert('No hay cambios para guardar'); return; }

    setIsSaving(true);
    try {
      await upsertSchedules(toSave);
      alert(`✅ ${toSave.length} días configurados guardados correctamente`);
      await loadSchedulesForMonth();
    } catch (error) {
      console.error('Error guardando horarios:', error);
      alert('❌ Error al guardar horarios');
    } finally {
      setIsSaving(false);
    }
  }, [selectedEmployee, schedules, loadSchedulesForMonth]);

  const clearSchedule = useCallback(async (dateString: string) => {
    if (!confirm('¿Eliminar el horario de este día?')) return;
    const schedule = schedules.find(s => s.schedule_date === dateString);
    if (!schedule?.id) {
      setSchedules(prev => prev.filter(s => s.schedule_date !== dateString));
      return;
    }
    try {
      await deleteScheduleDay(schedule.id);
      await loadSchedulesForMonth();
    } catch {
      alert('❌ Error al eliminar horario');
    }
  }, [schedules, loadSchedulesForMonth]);

  // ── Plantillas ────────────────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!currentTemplate || !selectedEmployee) return;
    setIsLoading(true);
    try {
      await saveTemplate({ ...currentTemplate, id_usuario: selectedEmployee.id_usuario, id_tienda: selectedEmployee.id_tienda });
      alert('✅ Plantilla guardada');
      setShowTemplateModal(false);
      setCurrentTemplate(null);
      await loadTemplates();
    } catch {
      alert('❌ Error guardando plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: number) => {
    if (!selectedEmployee || !window.confirm('¿Aplicar esta plantilla al mes actual? Sobrescribirá los horarios existentes.')) return;
    setIsLoading(true);
    try {
      const count = await applyTemplateToMonth(selectedEmployee.id_usuario, templateId, currentMonth.toISOString().split('T')[0]);
      alert(`✅ ${count} días configurados desde la plantilla`);
      await loadSchedulesForMonth();
    } catch {
      alert('❌ Error aplicando plantilla');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      await deleteTemplate(templateId);
      await loadTemplates();
    } catch {
      alert('❌ Error eliminando plantilla');
    }
  };

  const handleCopyPreviousMonth = async () => {
    if (!selectedEmployee || !confirm('¿Copiar los horarios del mes anterior a este mes?')) return;
    setIsLoading(true);
    try {
      const count = await copySchedulesFromPreviousMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0]);
      alert(`✅ ${count || 0} horarios copiados del mes anterior`);
      await loadSchedulesForMonth();
    } catch {
      alert('❌ Error al copiar horarios del mes anterior');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (userRole !== 'admin' && userRole !== 'coordinador') {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
        <Card className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Restringido</h2>
          <p className="text-gray-600">Solo administradores y coordinadores pueden configurar horarios individuales.</p>
        </Card>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-6 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary-600" />
            Horarios Individuales por Empleado
          </h1>
          <p className="text-gray-600 mt-2">Configura el horario día por día de cualquier empleado</p>
        </div>

        {/* Selector de empleado */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <User className="w-6 h-6 text-primary-600" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Empleado</label>
              <select
                value={selectedEmployee?.id_usuario || ''}
                onChange={(e) => setSelectedEmployee(employees.find(emp => emp.id_usuario === parseInt(e.target.value)) ?? null)}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">-- Selecciona un empleado --</option>
                {employees.map(emp => (
                  <option key={emp.id_usuario} value={emp.id_usuario}>
                    {emp.nombre} ({emp.nombre_tienda}) - {emp.rol}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {!selectedEmployee && (
          <Card className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Selecciona un empleado para configurar sus horarios</p>
          </Card>
        )}

        {selectedEmployee && (
          <>
            {/* Info del empleado */}
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">{selectedEmployee.nombre}</h3>
                  <p className="text-sm text-blue-700">{selectedEmployee.nombre_tienda} • {selectedEmployee.rol}</p>
                </div>
                <Button onClick={handleCopyPreviousMonth} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Copiar mes anterior
                </Button>
              </div>
            </Card>

            {/* Plantillas */}
            <Card className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Plantillas de Horario</h3>
                <Button onClick={() => { setCurrentTemplate(EMPTY_TEMPLATE(selectedEmployee)); setShowTemplateModal(true); }} variant="outline" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Plantilla
                </Button>
              </div>

              {templates.length === 0 ? (
                <p className="text-sm text-gray-600">
                  No hay plantillas creadas. Las plantillas permiten configurar horarios semanales y aplicarlos a cualquier mes.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{template.template_name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, i) => {
                            const label = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i];
                            const isOff = template[`${day}_is_off` as keyof ScheduleTemplate];
                            const time = template[`${day}_time` as keyof ScheduleTemplate];
                            return `${label}: ${isOff ? 'Libre' : time || '09:00'}`;
                          }).join(' • ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => handleApplyTemplate(template.id!)} variant="primary" size="sm">Aplicar</Button>
                        <Button onClick={() => { setCurrentTemplate(template); setShowTemplateModal(true); }} variant="outline" size="sm">Editar</Button>
                        <Button onClick={() => handleDeleteTemplate(template.id!)} variant="outline" size="sm"><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Navegación de mes */}
            <Card className="mb-6">
              <div className="flex items-center justify-between">
                <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} variant="outline" className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" />Anterior
                </Button>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">{monthName}</h2>
                <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} variant="outline" className="flex items-center gap-2">
                  Siguiente<ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Calendario del mes */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Configuración del Mes</h3>
                <Button onClick={saveSchedules} disabled={isSaving || isLoading} variant="primary" className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-gray-600">Cargando horarios...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {daysInMonth.map((day) => {
                    const { schedule } = day;
                    const dayName = day.date.toLocaleDateString('es-ES', { weekday: 'short' });
                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

                    return (
                      <div
                        key={day.dateString}
                        className={`p-4 border rounded-lg ${
                          day.isToday ? 'bg-blue-50 border-blue-300' :
                          day.isPast ? 'bg-gray-50 border-gray-200' :
                          isWeekend ? 'bg-green-50 border-green-200' :
                          'bg-white border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-20 text-center">
                            <div className={`text-sm font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-500'}`}>{dayName}</div>
                            <div className={`text-2xl font-bold ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>{day.date.getDate()}</div>
                          </div>

                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Hora de entrada</label>
                            <input
                              type="time"
                              value={schedule?.check_in_deadline?.slice(0, 5) || '09:00'}
                              onChange={(e) => updateSchedule(day.dateString, 'check_in_deadline', e.target.value)}
                              disabled={schedule?.is_day_off}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                            />
                          </div>

                          <div className="flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={schedule?.is_day_off || false}
                                onChange={(e) => updateSchedule(day.dateString, 'is_day_off', e.target.checked)}
                                className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
                              />
                              <span className="text-sm text-gray-700">Día libre</span>
                            </label>
                          </div>

                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
                            <input
                              type="text"
                              value={schedule?.notes || ''}
                              onChange={(e) => updateSchedule(day.dateString, 'notes', e.target.value || null)}
                              placeholder="Ej: Turno doble"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            />
                          </div>

                          {schedule && (
                            <Button onClick={() => clearSchedule(day.dateString)} variant="outline" className="p-2">
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Modal de plantilla */}
        {showTemplateModal && currentTemplate && (
          <Modal
            isOpen={showTemplateModal}
            onClose={() => { setShowTemplateModal(false); setCurrentTemplate(null); }}
            title={currentTemplate.id ? 'Editar Plantilla' : 'Nueva Plantilla'}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Plantilla</label>
                <input
                  type="text"
                  value={currentTemplate.template_name}
                  onChange={(e) => setCurrentTemplate({ ...currentTemplate, template_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Horario Matutino, Horario Vespertino"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Configuración Semanal</h4>
                <p className="text-xs text-gray-600 mb-4">
                  Todos los lunes del mes tendrán el mismo horario, todos los martes igual, etc.
                </p>
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map(({ key, label }) => {
                    const timeKey = `${key}_time` as keyof ScheduleTemplate;
                    const isOffKey = `${key}_is_off` as keyof ScheduleTemplate;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-24 font-medium text-sm text-gray-700">{label}</div>
                        <input
                          type="time"
                          value={(currentTemplate[timeKey] as string) || '09:00'}
                          onChange={(e) => setCurrentTemplate({ ...currentTemplate, [timeKey]: e.target.value })}
                          disabled={currentTemplate[isOffKey] as boolean}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={(currentTemplate[isOffKey] as boolean) || false}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, [isOffKey]: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Día libre
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button onClick={() => { setShowTemplateModal(false); setCurrentTemplate(null); }} variant="outline">Cancelar</Button>
                <Button onClick={handleSaveTemplate} disabled={!currentTemplate.template_name || isLoading} variant="primary">
                  {isLoading ? 'Guardando...' : 'Guardar Plantilla'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default EmployeeScheduleConfig;
