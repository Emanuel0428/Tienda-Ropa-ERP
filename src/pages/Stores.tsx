import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

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

      // Intentamos crear la tienda
      const { error: insertError } = await supabase
        .from('tiendas')
        .insert([storeData]);

      if (insertError) {
        console.error('Error de inserción:', insertError);
        throw new Error('Error al crear la tienda. Por favor intenta de nuevo.');

      }

      // Si la inserción fue exitosa, actualizamos la UI
      await fetchStores();
      setIsModalOpen(false);
      setFormData({
        nombre: '',
        direccion: '',
        ciudad: '',
        meta_mensual: 0
      });
      setError('Tienda creada exitosamente');
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error('Error creando tienda:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-6">
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-2xl font-bold text-gray-800">Tiendas</h1>
        <Button onClick={() => setIsModalOpen(true)}>
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
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{store.nombre}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Dirección:</span> {store.direccion}</p>
              <p><span className="font-medium">Ciudad:</span> {store.ciudad}</p>
              <p><span className="font-medium">Meta Mensual:</span> ${store.meta_mensual?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Tienda"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Tienda
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>





          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Tienda'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Stores;
