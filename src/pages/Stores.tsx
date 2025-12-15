import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Edit2, Trash2 } from 'lucide-react';

interface Store {
  id_tienda: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  id_admin: number | null;
  id_asesora: number | null;
  created_at: string;
  meta_mensual: number;
}

const Stores: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    ciudad: '',
    meta_mensual: 0
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        meta_mensual: formData.meta_mensual ? Number(formData.meta_mensual) : 0
      };

      if (editingStore) {
        // Actualizar tienda existente
        const { error: updateError } = await supabase
          .from('tiendas')
          .update(storeData)
          .eq('id_tienda', editingStore.id_tienda);

        if (updateError) {
          console.error('Error de actualización:', updateError);
          throw new Error('Error al actualizar la tienda. Por favor intenta de nuevo.');
        }
        setError('Tienda actualizada exitosamente');
      } else {
        // Crear nueva tienda
        const { error: insertError } = await supabase
          .from('tiendas')
          .insert([storeData]);

        if (insertError) {
          console.error('Error de inserción:', insertError);
          throw new Error('Error al crear la tienda. Por favor intenta de nuevo.');
        }
        setError('Tienda creada exitosamente');
      }

      // Si la operación fue exitosa, actualizamos la UI
      await fetchStores();
      setIsModalOpen(false);
      setEditingStore(null);
      setFormData({
        nombre: '',
        direccion: '',
        ciudad: '',
        meta_mensual: 0
      });
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error('Error procesando tienda:', err);
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
      meta_mensual: store.meta_mensual
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

      setError('Tienda eliminada exitosamente');
      await fetchStores();
      setIsDeleteModalOpen(false);
      setStoreToDelete(null);
      setTimeout(() => setError(null), 3000);
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
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Tiendas</h1>
        <Button onClick={() => {
          setEditingStore(null);
          setFormData({ nombre: '', direccion: '', ciudad: '', meta_mensual: 0 });
          setIsModalOpen(true);
        }}>
          Crear Nueva Tienda
        </Button>
      </div>

      {error && (
        <div className={`mb-4 p-4 border rounded-md ${
          error === 'Tienda creada exitosamente' 
            ? 'bg-green-50 border-green-200 text-green-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map(store => (
          <Card key={store.id_tienda} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{store.nombre}</h3>
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
          setFormData({ nombre: '', direccion: '', ciudad: '', meta_mensual: 0 });
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

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingStore(null);
                setFormData({ nombre: '', direccion: '', ciudad: '', meta_mensual: 0 });
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
