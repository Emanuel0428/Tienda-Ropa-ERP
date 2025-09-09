import React from 'react';
import { Categoria } from '../../types/audit';

interface AuditCategoriesProps {
  categories: Categoria[];
  onCalificacionChange: (catId: number, subcatId: number, itemId: number, value: 0 | 100) => void;
  onNovedadChange: (catId: number, subcatId: number, itemId: number, value: string) => void;
  getSubcategoriaTotal: (subcat: any) => number;
  getCategoriaPromedio: (cat: Categoria) => number;
}

export const AuditCategories: React.FC<AuditCategoriesProps> = ({
  categories,
  onCalificacionChange,
  onNovedadChange,
  getSubcategoriaTotal,
  getCategoriaPromedio
}) => {
  return (
    <>
      {categories.map(cat => (
        <div key={cat.id} className="mb-10 border rounded-lg shadow-sm bg-white">
          <div className="flex items-center justify-between bg-purple-100 px-4 py-2 rounded-t-lg">
            <h2 className="text-lg font-bold text-purple-800">
              {cat.nombre}
              <span className="ml-3 text-sm font-semibold text-purple-600">(Peso: {cat.peso})</span>
            </h2>
            <div className="text-right">
              <span className="font-semibold">Promedio categoría: </span>
              <span className="text-xl font-bold text-primary-600">
                {getCategoriaPromedio(cat).toFixed(2)} / 100
              </span>
            </div>
          </div>

          {cat.subcategorias.map(subcat => (
            <div key={subcat.id} className="mb-6">
              <div className="flex items-center justify-between bg-gray-100 px-3 py-1">
                <h3 className="text-md font-semibold text-gray-700">{subcat.nombre}</h3>
                <div className="text-right">
                  <span className="font-semibold">Total subcategoría: </span>
                  <span className="text-md font-bold text-primary-600">
                    {getSubcategoriaTotal(subcat).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left w-2/5">Ítem</th>
                      <th className="p-2 text-center w-1/5">Calificación</th>
                      <th className="p-2 text-left w-2/5">Novedad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcat.items.map(item => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">{item.label}</td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                item.calificacion === 100 ? 'bg-green-500 text-white' : 'bg-gray-200'
                              }`}
                              onClick={() => onCalificacionChange(cat.id, subcat.id, item.id, 100)}
                            >
                              ✓
                            </button>
                            <button
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                item.calificacion === 0 ? 'bg-red-500 text-white' : 'bg-gray-200'
                              }`}
                              onClick={() => onCalificacionChange(cat.id, subcat.id, item.id, 0)}
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.novedad}
                            onChange={(e) => onNovedadChange(cat.id, subcat.id, item.id, e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            placeholder="Agregar novedad..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
