import React, { useState } from 'react';
import { useAuth, setSuppressNextAuthChange } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';

const Auth: React.FC = () => {
  const { signIn } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    rol: 'asesora', // Rol por defecto
    id_tienda: '',
    fecha_nacimiento: '',
    celular: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tiendas, setTiendas] = useState<{ id_tienda: number; nombre: string; }[]>([]);

  // Cargar la lista de tiendas al montar el componente
  React.useEffect(() => {
    const fetchTiendas = async () => {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id_tienda, nombre')
        .order('nombre');
      
      if (error) {
        // Error al cargar tiendas
      } else {
        setTiendas(data || []);
      }
    };

    fetchTiendas();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        const { nombre, email, rol, id_tienda, fecha_nacimiento, celular, password } = form;
        const rolValido = rol || 'asesora';

        // Validar y formatear teléfono
        let telefonoFormateado = celular.trim().replace(/\s/g, '');

        if (!/^\+?\d{10,15}$/.test(telefonoFormateado)) {
          throw new Error('El número de celular debe tener entre 10 y 15 dígitos');
        }

        if (!telefonoFormateado.startsWith('+')) {
          if (telefonoFormateado.length < 10) {
            throw new Error('El número de celular debe tener al menos 10 dígitos');
          }
          if (telefonoFormateado.length === 10) {
            telefonoFormateado = `+57${telefonoFormateado}`;
          }
        }

        // Suprimir el cambio de auth para que signUp no redirija al dashboard
        setSuppressNextAuthChange(true);

        // Crear usuario en Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: nombre, nombre, rol: rolValido, id_tienda: parseInt(id_tienda), fecha_nacimiento, celular: telefonoFormateado }
          }
        });

        if (signUpError) throw new Error(signUpError.message);
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        // Insertar en tabla usuarios usando el UUID del nuevo usuario
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert([{
            id: authData.user.id,
            nombre,
            rol: rolValido,
            id_tienda: parseInt(id_tienda),
            fecha_nacimiento,
            celular: telefonoFormateado
          }]);

        if (dbError) throw new Error('Error guardando datos del usuario: ' + dbError.message);

        // Cerrar sesión del nuevo usuario inmediatamente para que el admin
        // no pierda su sesión y no haya redirección automática al dashboard
        await supabase.auth.signOut();

        setSuccess('Usuario creado correctamente. Puedes iniciar sesión.');
        setForm({ nombre: '', email: '', rol: 'asesora', id_tienda: '', fecha_nacimiento: '', celular: '', password: '' });
        setIsRegister(false);

      } else {
        const { email, password } = form;
        if (!email || !password) throw new Error('Por favor completa todos los campos');
        await signIn(email, password);
      }
    } catch (err: any) {
      // Si falló durante el registro, asegurar que el flag quede limpio
      setSuppressNextAuthChange(false);
      setError(err.message || 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isRegister ? 'Registra un nuevo usuario' : 'Accede a tu cuenta'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required={isRegister}
                    value={form.nombre}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required={isRegister}
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                
                {/* El rol es fijo como asesora */}
                <input type="hidden" name="rol" value="asesora" />
                
                <div>
                  <label htmlFor="id_tienda" className="block text-sm font-medium text-gray-700">
                    Tienda
                  </label>
                  <select
                    id="id_tienda"
                    name="id_tienda"
                    required={isRegister}
                    value={form.id_tienda}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-600 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Selecciona una tienda</option>
                    {tiendas.map(tienda => (
                      <option key={tienda.id_tienda} value={tienda.id_tienda}>
                        {tienda.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700">
                    Fecha de nacimiento
                  </label>
                  <input
                    id="fecha_nacimiento"
                    name="fecha_nacimiento"
                    type="date"
                    required={isRegister}
                    value={form.fecha_nacimiento}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                  />
                </div>
              </>
            )}
            
            {isRegister && (
              <div>
                <label htmlFor="celular" className="block text-sm font-medium text-gray-700">
                  Celular
                </label>
                <input
                  id="celular"
                  name="celular"
                  type="tel"
                  required={isRegister}
                  value={form.celular}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="3001234567 (sin +57)"
                />
              </div>
            )}
            
            {!isRegister && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required={!isRegister}
                  value={form.email}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </div>
              ) : (
                isRegister ? 'Crear cuenta' : 'Iniciar sesión'
              )}
            </button>
          </div>


          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
                setForm({
                  nombre: '',
                  email: '',
                  rol: 'asesora',
                  id_tienda: '',
                  fecha_nacimiento: '',
                  celular: '',
                  password: '',
                });
              }}
              className="font-medium text-primary-500 hover:text-primary-600"
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;