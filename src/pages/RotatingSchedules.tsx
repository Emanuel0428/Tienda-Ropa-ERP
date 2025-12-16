import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw, Save, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface RotatingTemplate {
  id?: number;
  id_tienda: number;
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

const RotatingSchedules: React.FC = () => {
  const [templates, setTemplates] = useState<RotatingTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [applyMonth, setApplyMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('is_rotating_template', true)
        .is('id_tienda', null)
        .order('target_role')
        .order('week_number');

      if (error) throw error;

      // Si no hay plantillas, crear las por defecto
      if (!data || data.length === 0) {
        await createDefaultTemplates();
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      setMessage({ type: 'error', text: 'Error cargando plantillas rotativas' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDefaultTemplates = async () => {
    try {
      const { error } = await supabase.rpc('create_default_rotating_templates');

      if (error) throw error;
      setMessage({ type: 'success', text: 'Plantillas creadas exitosamente' });
      await loadTemplates();
    } catch (error) {
      console.error('Error creando plantillas:', error);
      setMessage({ type: 'error', text: 'Error creando plantillas' });
    }
  };

  const saveTemplates = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      for (const template of templates) {
        const { error } = await supabase
          .from('schedule_templates')
          .update({
            monday_time: template.monday_time,
            monday_is_off: template.monday_is_off,
            tuesday_time: template.tuesday_time,
            tuesday_is_off: template.tuesday_is_off,
            wednesday_time: template.wednesday_time,
            wednesday_is_off: template.wednesday_is_off,
            thursday_time: template.thursday_time,
            thursday_is_off: template.thursday_is_off,
            friday_time: template.friday_time,
            friday_is_off: template.friday_is_off,
            saturday_time: template.saturday_time,
            saturday_is_off: template.saturday_is_off,
            sunday_time: template.sunday_time,
            sunday_is_off: template.sunday_is_off
          })
          .eq('id', template.id);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: '✓ Plantillas guardadas correctamente' });
    } catch (error) {
      console.error('Error guardando plantillas:', error);
      setMessage({ type: 'error', text: 'Error guardando plantillas' });
    } finally {
      setIsSaving(false);
    }
  };

  const applyRotatingSchedules = async () => {
    if (!applyMonth) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const targetDate = `${applyMonth}-01`;
      const { data, error } = await supabase.rpc('apply_rotating_schedules_to_all_stores', {
        p_target_month: targetDate
      });

      if (error) throw error;

      const result = data[0];
      setMessage({ 
        type: 'success', 
        text: `✓ Horarios aplicados: ${result.tiendas_procesadas} tiendas, ${result.usuarios_procesados} usuarios, ${result.dias_creados} días creados`
      });
    } catch (error) {
      console.error('Error aplicando horarios:', error);
      setMessage({ type: 'error', text: 'Error aplicando horarios rotativos' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateTemplate = (templateId: number | undefined, field: string, value: any) => {
    setTemplates(prev => 
      prev.map(t => 
        t.id === templateId ? { ...t, [field]: value } : t
      )
    );
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const getTemplate = (role: 'administradora' | 'asesora', week: 1 | 2) => {
    return templates.find(t => t.target_role === role && t.week_number === week);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Horarios Rotativos Globales</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura las plantillas que se aplicarán a TODAS las tiendas automáticamente
          </p>
        </div>
        <Button
          onClick={() => loadTemplates()}
          variant="secondary"
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            ¿Cómo funciona?
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-7">
            <li>• Configuras solo <strong>2 plantillas globales</strong> (Semana 1 y Semana 2) para cada rol</li>
            <li>• Estas plantillas se aplican a <strong>TODAS las tiendas</strong> del sistema</li>
            <li>• El sistema alterna automáticamente cada semana del mes</li>
            <li>• Semanas impares (1, 3, 5) → Plantilla "Semana 1"</li>
            <li>• Semanas pares (2, 4) → Plantilla "Semana 2"</li>
          </ul>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Admin Templates */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Plantillas para Administradoras
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Admin Semana 1 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 border-b pb-2">
                    Semana 1 (Semanas impares: 1, 3, 5)
                  </h3>
                  {(() => {
                    const template = getTemplate('administradora', 1);
                    if (!template) return <p className="text-red-500">No se encontró plantilla</p>;
                    
                    return daysOfWeek.map(day => {
                      const timeKey = `${day.key}_time` as keyof RotatingTemplate;
                      const offKey = `${day.key}_is_off` as keyof RotatingTemplate;
                      return (
                        <div key={day.key} className="flex items-center gap-3">
                          <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                            {day.label}
                          </label>
                          <input
                            type="checkbox"
                            checked={template[offKey] as boolean}
                            onChange={(e) => updateTemplate(template.id, offKey, e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-xs text-gray-500 w-16">Día libre</span>
                          <input
                            type="time"
                            value={(template[timeKey] as string) || ''}
                            onChange={(e) => updateTemplate(template.id, timeKey, e.target.value || null)}
                            disabled={template[offKey] as boolean}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Admin Semana 2 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 border-b pb-2">
                    Semana 2 (Semanas pares: 2, 4)
                  </h3>
                  {(() => {
                    const template = getTemplate('administradora', 2);
                    if (!template) return <p className="text-red-500">No se encontró plantilla</p>;
                    
                    return daysOfWeek.map(day => {
                    const timeKey = `${day.key}_time` as keyof RotatingTemplate;
                    const offKey = `${day.key}_is_off` as keyof RotatingTemplate;
                    return (
                      <div key={day.key} className="flex items-center gap-3">
                        <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                          {day.label}
                        </label>
                        <input
                          type="checkbox"
                          checked={template[offKey] as boolean}
                          onChange={(e) => updateTemplate(template.id, offKey, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-xs text-gray-500 w-16">Día libre</span>
                        <input
                          type="time"
                          value={(template[timeKey] as string) || ''}
                          onChange={(e) => updateTemplate(template.id, timeKey, e.target.value || null)}
                          disabled={template[offKey] as boolean}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </Card>

          {/* Asesora Templates */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Plantillas para Asesoras
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Asesora Semana 1 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 border-b pb-2">
                    Semana 1 (Semanas impares: 1, 3, 5)
                  </h3>
                  {(() => {
                    const template = getTemplate('asesora', 1);
                    if (!template) return <p className="text-red-500">No se encontró plantilla</p>;
                    
                    return daysOfWeek.map(day => {
                    const timeKey = `${day.key}_time` as keyof RotatingTemplate;
                    const offKey = `${day.key}_is_off` as keyof RotatingTemplate;
                    return (
                      <div key={day.key} className="flex items-center gap-3">
                        <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                          {day.label}
                        </label>
                        <input
                          type="checkbox"
                          checked={template[offKey] as boolean}
                          onChange={(e) => updateTemplate(template.id, offKey, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-xs text-gray-500 w-16">Día libre</span>
                        <input
                          type="time"
                          value={(template[timeKey] as string) || ''}
                          onChange={(e) => updateTemplate(template.id, timeKey, e.target.value || null)}
                          disabled={template[offKey] as boolean}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      );
                    });
                  })()}
                </div>

                {/* Asesora Semana 2 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-primary-600 dark:text-primary-400 border-b pb-2">
                    Semana 2 (Semanas pares: 2, 4)
                  </h3>
                  {(() => {
                    const template = getTemplate('asesora', 2);
                    if (!template) return <p className="text-red-500">No se encontró plantilla</p>;
                    
                    return daysOfWeek.map(day => {
                    const timeKey = `${day.key}_time` as keyof RotatingTemplate;
                    const offKey = `${day.key}_is_off` as keyof RotatingTemplate;
                    return (
                      <div key={day.key} className="flex items-center gap-3">
                        <label className="w-24 text-sm text-gray-700 dark:text-gray-300">
                          {day.label}
                        </label>
                        <input
                          type="checkbox"
                          checked={template[offKey] as boolean}
                          onChange={(e) => updateTemplate(template.id, offKey, e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-xs text-gray-500 w-16">Día libre</span>
                        <input
                          type="time"
                          value={(template[timeKey] as string) || ''}
                          onChange={(e) => updateTemplate(template.id, timeKey, e.target.value || null)}
                          disabled={template[offKey] as boolean}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <Card>
            <div className="p-6 space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={saveTemplates}
                  disabled={isSaving || templates.length === 0}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Plantillas'}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Aplicar Horarios Rotativos a un Mes
                </h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Selecciona el mes
                    </label>
                    <input
                      type="month"
                      value={applyMonth}
                      onChange={(e) => setApplyMonth(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <Button
                    onClick={applyRotatingSchedules}
                    disabled={isSaving || !applyMonth}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Aplicar Horarios
                  </Button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Esto aplicará las plantillas rotativas a <strong>todas las tiendas</strong> del sistema.
                  Cada tienda procesará automáticamente a sus empleados (admin y asesoras),
                  alternando entre Semana 1 y Semana 2 según el calendario.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default RotatingSchedules;
