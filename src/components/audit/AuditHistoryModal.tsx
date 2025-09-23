import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AuditHistoryModalProps {
  isOpen: boolean;
  audits: any[];
  onSelectAudit: (audit: any) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  audits,
  onSelectAudit,
  onCreateNew,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en_progreso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En Progreso';
      default:
        return estado;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auditorías Existentes">
      <div className="p-6">
        <div className="mb-4">
          <p className="text-gray-600 mb-4">
            Se encontraron {audits.length} auditorías existentes para esta tienda. 
            Puedes continuar con una existente o crear una nueva.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto mb-6">
          <div className="space-y-3">
            {audits.map((audit) => (
              <div
                key={audit.id_auditoria}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectAudit(audit)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        Auditoría #{audit.id_auditoria}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(audit.estado)}`}>
                        {getStatusText(audit.estado)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Fecha:</strong> {formatDate(audit.fecha)}</p>
                      <p><strong>Recibido por:</strong> {audit.quienes_reciben || 'No especificado'}</p>
                      {audit.calificacion_total && (
                        <p><strong>Calificación:</strong> {audit.calificacion_total}%</p>
                      )}
                      {audit.estado === 'completada' && (
                        <p className="text-green-600 text-xs">✅ Esta auditoría está completada</p>
                      )}
                      {audit.estado === 'en_progreso' && (
                        <p className="text-yellow-600 text-xs">⏳ Esta auditoría está en progreso</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAudit(audit);
                      }}
                    >
                      {audit.estado === 'completada' ? 'Ver' : 'Continuar'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="primary"
            onClick={onCreateNew}
            className="flex-1"
          >
            🆕 Crear Nueva Auditoría
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};