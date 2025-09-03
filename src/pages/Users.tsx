import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface User {
  id_usuario: number;
  id: string;
  nombre: string;
  rol: 'admin' | 'coordinador' | 'asesora' | 'auditor';
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
  const [selectedUser, setSelectedUser] = useState<EditUserForm | null>(null);
  const [tiendas, setTiendas] = useState<{ id_tienda: number; nombre: string; }[]>([]);

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

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Usuarios</h1>
      
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
    </div>
  );
};

export default Users;
