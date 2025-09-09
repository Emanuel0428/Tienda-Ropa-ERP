import React from 'react';
import { ExtraNotes } from '../../types/audit';

interface AuditNotesProps {
  extraNotes: ExtraNotes;
  onExtraNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const AuditNotes: React.FC<AuditNotesProps> = ({
  extraNotes,
  onExtraNotesChange
}) => {
  return (
    <>
      <h2 className="text-lg font-bold mb-4 text-primary-600">Notas y conclusiones</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Personal</label>
          <textarea
            name="personal"
            value={extraNotes.personal}
            onChange={onExtraNotesChange}
            rows={4}
            className="w-full border rounded px-2 py-1"
            placeholder="Notas sobre el personal de la tienda..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campañas y tienda en general
          </label>
          <textarea
            name="campanasTienda"
            value={extraNotes.campanasTienda}
            onChange={onExtraNotesChange}
            rows={4}
            className="w-full border rounded px-2 py-1"
            placeholder="Notas sobre campañas y estado general de la tienda..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Conclusiones</label>
          <textarea
            name="conclusiones"
            value={extraNotes.conclusiones}
            onChange={onExtraNotesChange}
            rows={4}
            className="w-full border rounded px-2 py-1"
            placeholder="Conclusiones generales de la auditoría..."
          />
        </div>
      </div>
    </>
  );
};
