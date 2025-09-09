import React from 'react';
import { UploadedImages } from '../../types/audit';

interface AuditImageChecklistProps {
  checklistImages: string[];
  uploadedImages: UploadedImages;
  onImageChange: (label: string, files: FileList | null) => void;
}

export const AuditImageChecklist: React.FC<AuditImageChecklistProps> = ({
  checklistImages,
  uploadedImages,
  onImageChange
}) => {
  return (
    <>
      <h2 className="text-lg font-bold mb-4 text-primary-600">Checklist de imágenes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {checklistImages.map(label => (
          <div key={label} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => onImageChange(label, e.target.files)}
              className="mb-2 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {uploadedImages[label] && (
              <div className="flex flex-wrap gap-2">
                {uploadedImages[label].map((src, idx) => (
                  <img 
                    key={idx} 
                    src={src} 
                    alt={`${label} ${idx + 1}`} 
                    className="w-32 h-32 object-cover rounded border shadow-sm hover:shadow-md transition-shadow"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
