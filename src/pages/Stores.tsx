import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Edit2, Trash2, Phone } from 'lucide-react';

interface Store {
  id_tienda: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  id_admin: number | null;
  id_asesora: number | null;
  created_at: string;
  meta_mensual: number;
  zona: 'norte' | 'sur' | null;
}

const Stores: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [zonaFilter, setZonaFilter] = useState<'todas' | 'norte' | 'sur'>('todas');
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    meta_mensual: 0,
    zona: '' as '' | 'norte' | 'sur'
  });

  // Cargar tiendas
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setStores(data || []);
    } catch (err: any) {
      console.error('Error cargando tiendas:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'meta_mensual' ? parseFloat(value) || 0 : value
    }));
  };

  // Crear nueva tienda
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validamos los datos antes de enviar
      if (!formData.nombre || !formData.direccion || !formData.ciudad) {
        throw new Error('Por favor completa todos los campos requeridos');
      }

      // Preparamos los datos asegurándonos que meta_mensual sea un número válido
      const storeData = {
        ...formData,
        meta_mensual: formData.meta_mensual ? Number(formData.meta_mensual) : 0,
        zona: formData.zona || null
      };

      if (editingStore) {
        // Actualizar tienda existente
        const { error: updateError } = await supabase
          .from('tiendas')
          .update(storeData)
          .eq('id_tienda', editingStore.id_tienda);

        if (updateError) throw new Error('Error al actualizar la tienda. Por favor intenta de nuevo.');
        setSuccessMessage('Tienda actualizada exitosamente');
      } else {
        // Crear nueva tienda
        const { error: insertError } = await supabase
          .from('tiendas')
          .insert([storeData]);

        if (insertError) throw new Error('Error al crear la tienda. Por favor intenta de nuevo.');
        setSuccessMessage('Tienda creada exitosamente');
      }

      // Si la operación fue exitosa, actualizamos la UI
      await fetchStores();
      setIsModalOpen(false);
      setEditingStore(null);
      setFormData({ nombre: '', direccion: '', ciudad: '', telefono: '', meta_mensual: 0, zona: '' as '' | 'norte' | 'sur' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de edición
  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      nombre: store.nombre,
      direccion: store.direccion,
      ciudad: store.ciudad,
      telefono: store.telefono || '',
      meta_mensual: store.meta_mensual,
      zona: store.zona || ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal de confirmación de eliminación
  const handleDeleteClick = (store: Store) => {
    setStoreToDelete(store);
    setIsDeleteModalOpen(true);
  };

  // Eliminar tienda
  const handleDelete = async () => {
    if (!storeToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('tiendas')
        .delete()
        .eq('id_tienda', storeToDelete.id_tienda);

      if (deleteError) {
        // Manejar error de restricción de clave foránea
        if (deleteError.code === '23503') {
          throw new Error(
            'No se puede eliminar la tienda porque tiene datos relacionados (auditorías, ventas, usuarios, etc.). ' +
            'Debes eliminar primero todos los registros relacionados o contacta al administrador del sistema.'
          );
        }
        throw deleteError;
      }

      setSuccessMessage('Tienda eliminada exitosamente');
      await fetchStores();
      setIsDeleteModalOpen(false);
      setStoreToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error eliminando tienda:', err);
      setError(err.message || 'Error al eliminar la tienda');
      setIsDeleteModalOpen(false);
      setStoreToDelete(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-6">
      <div className="flex justify-between items-center mb-4 mt-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Tiendas</h1>
        <Button onClick={() => {
          setEditingStore(null);
          setFormData({ nombre: '', direccion: '', ciudad: '', telefono: '', meta_mensual: 0, zona: '' as '' | 'norte' | 'sur' });
          setIsModalOpen(true);
        }}>
          Crear Nueva Tienda
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['todas', 'norte', 'sur'] as const).map(zona => (
          <button
            key={zona}
            onClick={() => setZonaFilter(zona)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              zonaFilter === zona
                ? zona === 'norte'
                  ? 'bg-blue-600 text-white'
                  : zona === 'sur'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {zona === 'todas' ? 'Todas' : `Zona ${zona.charAt(0).toUpperCase() + zona.slice(1)}`}
            <span className="ml-1.5 text-xs opacity-75">
              ({zona === 'todas' ? stores.length : stores.filter(s => s.zona === zona).length})
            </span>
          </button>
        ))}
      </div>

      {successMessage && (
        <div className="mb-4 p-4 border rounded-md bg-green-50 border-green-200 text-green-600">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 border rounded-md bg-red-50 border-red-200 text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.filter(s => zonaFilter === 'todas' || s.zona === zonaFilter).map(store => (
          <Card key={store.id_tienda} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{store.nombre}</h3>
                {store.zona && (
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                    store.zona === 'norte'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    Zona {store.zona.charAt(0).toUpperCase() + store.zona.slice(1)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(store)}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="Editar tienda"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteClick(store)}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Eliminar tienda"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Dirección:</span> {store.direccion}</p>
              <p><span className="font-medium">Ciudad:</span> {store.ciudad}</p>
              {store.telefono && (
                <p className="flex items-center gap-1">
                  <Phone size={14} className="text-gray-400" />
                  <span>{store.telefono}</span>
                </p>
              )}
              <p><span className="font-medium">Meta Mensual:</span> ${store.meta_mensual?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStore(null);
          setFormData({ nombre: '', direccion: '', ciudad: '', telefono: '', meta_mensual: 0, zona: '' as '' | 'norte' | 'sur' });
        }}
        title={editingStore ? 'Editar Tienda' : 'Crear Nueva Tienda'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la Tienda
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teléfono / Celular de la tienda
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              placeholder="Ej: 3001234567"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meta Mensual
            </label>
            <input
              type="number"
              name="meta_mensual"
              value={formData.meta_mensual}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zona
            </label>
            <select
              name="zona"
              value={formData.zona}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Sin zona asignada</option>
              <option value="norte">Zona Norte</option>
              <option value="sur">Zona Sur</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingStore(null);
                setFormData({ nombre: '', direccion: '', ciudad: '', telefono: '', meta_mensual: 0, zona: '' as '' | 'norte' | 'sur' });
              }}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (editingStore ? 'Actualizando...' : 'Creando...') : (editingStore ? 'Actualizar Tienda' : 'Crear Tienda')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStoreToDelete(null);
        }}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar la tienda <strong>{storeToDelete?.nombre}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Esta acción eliminará todos los datos relacionados con esta tienda y no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setStoreToDelete(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Eliminando...' : 'Eliminar Tienda'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Stores;
