import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { User, Camera, Mail, Phone, MapPin, Calendar, Shield, Save, X } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    nombre: user?.name || '',
    celular: user?.email?.replace('@tienda.com', '') || '',
    fecha_nacimiento: '',
    rol: user?.role || '',
    id_tienda: user?.store || ''
  });

  React.useEffect(() => {
    if (user) {
      loadUserDetails();
    }
  }, [user]);

  const loadUserDetails = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error cargando detalles del usuario:', error);
        return;
      }

      if (data) {
        setFormData({
          nombre: data.nombre || '',
          celular: data.celular || '',
          fecha_nacimiento: data.fecha_nacimiento || '',
          rol: data.rol || '',
          id_tienda: data.id_tienda?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: formData.nombre,
          celular: formData.celular,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          rol: formData.rol,
          id_tienda: parseInt(formData.id_tienda) || null
        })
        .eq('id', user.id);

      if (error) {
        setMessage({ type: 'error', text: 'Error actualizando perfil: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
        setIsEditing(false);
        // Recargar datos
        await loadUserDetails();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadUserDetails(); // Restaurar datos originales
    setMessage({ type: '', text: '' });
  };

  const getRoleDisplayName = (role: string) => {
    const roles: { [key: string]: string } = {
      'admin': 'Administrador',
      'coordinador': 'Coordinador',
      'asesora': 'Asesora',
      'auditor': 'Auditor'
    };
    return roles[role] || role;
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          No hay información de usuario disponible
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pt-16">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-sm text-gray-500">Gestiona tu información personal</p>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Editar</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información Personal */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Información Personal</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Celular
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="celular"
                    value={formData.celular}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.celular}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Nacimiento
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {formData.fecha_nacimiento || 'No especificada'}
                  </p>
                )}
              </div>
            </div>

            {/* Información Laboral */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Información Laboral</span>
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                {isEditing ? (
                  <select
                    name="rol"
                    value={formData.rol}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="admin">Administrador</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="asesora">Asesora</option>
                    <option value="auditor">Auditor</option>
                  </select>
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                    {getRoleDisplayName(formData.rol)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  ID Tienda
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    name="id_tienda"
                    value={formData.id_tienda}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{formData.id_tienda}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email del Sistema
                </label>
                <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg text-sm">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Este email se genera automáticamente y no se puede modificar
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
