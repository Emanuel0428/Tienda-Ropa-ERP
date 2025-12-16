import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Phone, MapPin, Calendar, Edit2, UserCircle } from 'lucide-react';

interface User {
  id_usuario: number;
  id: string;
  nombre: string;
  rol: 'admin' | 'coordinador' | 'administradora' | 'asesora' | 'auditor' | 'gerencia';
  celular: string;
  fecha_nacimiento: string;
  id_tienda: number | null;
  created_at: string;
  avatar_url?: string;
  tienda?: {
    id_tienda: number;
    nombre: string;
  };
}

interface EditUserForm extends User {
  tienda_nombre?: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EditUserForm | null>(null);
  const [tiendas, setTiendas] = useState<{ id_tienda: number; nombre: string; }[]>([]);
  const [newUser, setNewUser] = useState({
    nombre: '',
    rol: 'asesora' as 'admin' | 'coordinador' | 'administradora' | 'asesora' | 'auditor' | 'gerencia',
    celular: '',
    fecha_nacimiento: '',
    id_tienda: '',
    email: '',
    password: ''
  });

  // Cargar usuarios y tiendas
  useEffect(() => {
    fetchUsers();
    fetchTiendas();
  }, []);

  const fetchUsers = async () => {
    try {
      // Primero obtenemos los usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('*');

      if (usersError) throw usersError;

      // Luego obtenemos las tiendas
      const { data: tiendasData, error: tiendasError } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre');

      if (tiendasError) throw tiendasError;

      // Combinamos la información
      const usersWithTiendas = usersData?.map(user => ({
        ...user,
        tienda: tiendasData?.find(tienda => tienda.id_tienda === user.id_tienda)
      }));

      setUsers(usersWithTiendas || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchTiendas = async () => {
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre');

      if (error) throw error;

      setTiendas(data || []);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser({
      ...user,
      nombre: user.nombre,
      rol: user.rol,
      celular: user.celular,
      fecha_nacimiento: user.fecha_nacimiento,
      id_tienda: user.id_tienda,
      avatar_url: user.avatar_url,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: selectedUser.nombre,
          rol: selectedUser.rol,
          celular: selectedUser.celular,
          fecha_nacimiento: selectedUser.fecha_nacimiento,
          id_tienda: selectedUser.id_tienda,
        })
        .eq('id_usuario', selectedUser.id_usuario);

      if (error) {
        throw error;
      }

      // Actualizar la lista de usuarios
      await fetchUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error en actualización:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // Validaciones
      if (!newUser.email || !newUser.password || !newUser.nombre || !newUser.rol) {
        throw new Error('Todos los campos marcados son requeridos');
      }

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.nombre,
            role: newUser.rol
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Error al crear usuario en autenticación');

      console.log('✅ Usuario creado en Auth:', authData.user.id);

      // 2. Crear registro en tabla usuarios
      const { error: dbError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id, // UUID del usuario de auth
          nombre: newUser.nombre,
          rol: newUser.rol,
          celular: newUser.celular || null,
          fecha_nacimiento: newUser.fecha_nacimiento || null,
          id_tienda: newUser.id_tienda ? parseInt(newUser.id_tienda) : null,
        });

      if (dbError) {
        console.error('Error insertando en tabla usuarios:', dbError);
        throw dbError;
      }

      console.log('✅ Usuario creado en base de datos');

      // 3. Limpiar formulario y cerrar modal
      setNewUser({
        nombre: '',
        rol: 'asesora',
        celular: '',
        fecha_nacimiento: '',
        id_tienda: '',
        email: '',
        password: ''
      });
      setIsCreateModalOpen(false);
      
      // 4. Recargar lista de usuarios
      await fetchUsers();
      
      alert('Usuario creado exitosamente');

    } catch (error) {
      console.error('Error creando usuario:', error);
      setError((error as Error).message);
    }
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-16 sm:pt-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usuarios</h1>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
        >
          + Crear Nuevo Usuario
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {users.map(user => (
          <Card key={user.id_usuario} className="overflow-hidden hover:shadow-xl transition-all duration-200 border border-gray-200">
            {/* Header con avatar y rol */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.nombre}
                      className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                      <UserCircle className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{user.nombre}</h3>
                  <Badge 
                    variant={user.rol === 'admin' ? 'success' : user.rol === 'coordinador' ? 'warning' : 'default'}
                    className="mt-1 text-xs capitalize"
                  >
                    {user.rol}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{user.celular}</span>
              </div>
              
              {user.tienda && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.tienda.nombre}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>
                  {new Date(user.fecha_nacimiento).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="px-4 pb-4">
              <button
                onClick={() => handleEditUser(user)}
                className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 py-2.5 rounded-lg"
              >
                <Edit2 className="w-4 h-4" />
                <span>Editar</span>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {isEditModalOpen && selectedUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
            setError(null);
          }}
          title="Editar Usuario"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={selectedUser.nombre}
                onChange={(e) => setSelectedUser({ ...selectedUser, nombre: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                value={selectedUser.rol}
                onChange={(e) => setSelectedUser({ ...selectedUser, rol: e.target.value as User['rol'] })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="admin">Admin</option>
                <option value="coordinador">Coordinador</option>
                <option value="administradora">Administradora</option>
                <option value="asesora">Asesora</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                value={selectedUser.celular}
                onChange={(e) => setSelectedUser({ ...selectedUser, celular: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de nacimiento</label>
              <input
                type="date"
                value={selectedUser.fecha_nacimiento}
                onChange={(e) => setSelectedUser({ ...selectedUser, fecha_nacimiento: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tienda</label>
              <select
                value={selectedUser.id_tienda || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, id_tienda: Number(e.target.value) || null })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Sin tienda asignada</option>
                {tiendas.map(tienda => (
                  <option key={tienda.id_tienda} value={tienda.id_tienda}>
                    {tienda.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="bg-gray-200 text-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de crear usuario */}
      {isCreateModalOpen && (
        <Modal
          title="Crear Nuevo Usuario"
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setNewUser({
              nombre: '',
              rol: 'asesora',
              celular: '',
              fecha_nacimiento: '',
              id_tienda: '',
              email: '',
              password: ''
            });
          }}
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={newUser.nombre}
                  onChange={handleNewUserChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: María García"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleNewUserChange}
                  required
                  minLength={6}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  name="rol"
                  value={newUser.rol}
                  onChange={handleNewUserChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="asesora">Asesora</option>
                  <option value="coordinador">Coordinador</option>
                  <option value="administradora">Administradora</option>
                  <option value="auditor">Auditor</option>
                  <option value="gerencia">Gerencia</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Celular
                </label>
                <input
                  type="tel"
                  name="celular"
                  value={newUser.celular}
                  onChange={handleNewUserChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="3001234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={newUser.fecha_nacimiento}
                  onChange={handleNewUserChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tienda
                </label>
                <select
                  name="id_tienda"
                  value={newUser.id_tienda}
                  onChange={handleNewUserChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar tienda</option>
                  {tiendas.map(tienda => (
                    <option key={tienda.id_tienda} value={tienda.id_tienda}>
                      {tienda.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewUser({
                    nombre: '',
                    rol: 'asesora',
                    celular: '',
                    fecha_nacimiento: '',
                    id_tienda: '',
                    email: '',
                    password: ''
                  });
                }}
                className="bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Crear Usuario
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Users;
