import { Categoria, Subcategoria } from '../types/audit';

/**
 * Calcula el puntaje total de una subcategoría
 * @param subcat - La subcategoría a calcular
 * @returns El promedio de calificaciones de los items calificados
 */
export const getSubcategoriaTotal = (subcat: Subcategoria): number => {
  const calificados = subcat.items.filter(item => item.calificacion !== null);
  if (calificados.length === 0) return 0;
  const sum = calificados.reduce((acc, item) => acc + (item.calificacion || 0), 0);
  return sum / calificados.length;
};

/**
 * Calcula el promedio de una categoría
 * @param cat - La categoría a calcular
 * @returns El promedio de todas sus subcategorías
 */
export const getCategoriaPromedio = (cat: Categoria): number => {
  if (!cat.subcategorias.length) return 0;
  const sum = cat.subcategorias.reduce((acc, subcat) => acc + getSubcategoriaTotal(subcat), 0);
  return sum / cat.subcategorias.length;
};

/**
 * Calcula la calificación total ponderada de todas las categorías
 * @param categories - Array de todas las categorías
 * @returns La calificación total ponderada de la tienda
 */
export const getCalificacionTotalTienda = (categories: Categoria[]): number => {
  const totalPeso = categories.reduce((acc, cat) => acc + cat.peso, 0);
  if (totalPeso === 0) return 0;
  const sum = categories.reduce((acc, cat) => acc + (getCategoriaPromedio(cat) * cat.peso), 0);
  return sum / totalPeso;
};
