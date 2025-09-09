import React from 'react';
import { Button } from '../ui/Button';
import { Usuario, Tienda, AuditInfo } from '../../types/audit';

interface AuditInfoFormProps {
  auditInfo: AuditInfo;
  tiendas: Tienda[];
  usuariosTienda: Usuario[];
  userEmail: string;
  isSaving: boolean;
  onAuditInfoChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AuditInfoForm: React.FC<AuditInfoFormProps> = ({
  auditInfo,
  tiendas,
  usuariosTienda,
  userEmail,
  isSaving,
  onAuditInfoChange,
  onSubmit
}) => {
  return (
    <div className="mb-8">
      <form onSubmit={onSubmit} className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4 text-primary-600">Datos de la auditoría</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auditor</label>
            <input 
              type="text"
              value={userEmail}
              readOnly
              className="w-full border rounded px-2 py-1 bg-gray-100"
              placeholder="Usuario actual"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tienda</label>
            <select 
              name="id_tienda" 
              value={auditInfo.id_tienda} 
              onChange={onAuditInfoChange}
              required 
              className="w-full border rounded px-2 py-1"
            >
              <option value="">Selecciona una tienda</option>
              {tiendas.map(tienda => (
                <option key={tienda.id_tienda} value={tienda.id_tienda}>
                  {tienda.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input 
              type="date" 
              name="fecha" 
              value={auditInfo.fecha} 
              onChange={onAuditInfoChange} 
              required 
              className="w-full border rounded px-2 py-1" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quien recibe la auditoría</label>
            <select
              name="quienes_reciben"
              value={auditInfo.quienes_reciben}
              onChange={onAuditInfoChange}
              required
              className="w-full border rounded px-2 py-1"
            >
              <option value="">Selecciona quien recibe</option>
              {usuariosTienda.map(usuario => (
                <option key={usuario.id} value={usuario.nombre}>
                  {usuario.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button 
          type="submit" 
          variant="primary"
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar y continuar'}
        </Button>
      </form>
    </div>
  );
};
