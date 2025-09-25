import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface User {
  id_usuario: number;
  id: string;
  nombre: string;
  rol: 'admin' | 'coordinador' | 'asesora' | 'auditor' | 'gerencia';
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
    rol: 'asesora' as 'admin' | 'coordinador' | 'asesora' | 'auditor' | 'gerencia',
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

  const handleUpdateUser = async (id_usuario: number, userData: EditUserForm) => {
    try {
      // Verificar la sesión actual antes de hacer la actualización
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Error de sesión: Por favor, inicia sesión nuevamente');
      }

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: userData.nombre,
          rol: userData.rol,
          celular: userData.celular,
          fecha_nacimiento: userData.fecha_nacimiento,
          id_tienda: userData.id_tienda,
        })
        .eq('id_usuario', id_usuario);

      if (error) {
        console.error('Error actualizando usuario:', error);
        throw error;
      }

      // Actualizar la lista de usuarios
      await fetchUsers();
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error en actualización:', error);
      setError((error as Error).message);
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
    <div className="py-6 px-6">
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Crear Nuevo Usuario
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <Card key={user.id_usuario} className="p-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.nombre}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl text-gray-500">
                      {user.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user.nombre}</h3>
                <p className="text-sm text-gray-500">{user.rol}</p>
                <p className="text-sm">{user.celular}</p>
                {user.tienda && (
                  <p className="text-sm text-gray-600">Tienda: {user.tienda.nombre}</p>
                )}
                <p className="text-sm text-gray-600">
                  {new Date(user.fecha_nacimiento).toLocaleDateString()}
                </p>
              </div>
              
              <Button
                onClick={() => handleEditUser(user)}
                className="bg-primary-600 text-white px-3 py-1 rounded"
              >
                Editar
              </Button>
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
          }}
          title="Editar Usuario"
        >
          <form className="space-y-4">
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
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="bg-gray-200 text-gray-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => selectedUser && handleUpdateUser(selectedUser.id_usuario, selectedUser)}
                className="bg-primary-600 text-white"
              >
                Guardar cambios
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
