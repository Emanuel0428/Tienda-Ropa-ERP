import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';

const Auth: React.FC = () => {
  const { signIn } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    rol: 'asesor', // Rol por defecto
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
        console.error('Error cargando tiendas:', error);
      } else {
        setTiendas(data || []);
      }
    };

    fetchTiendas();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // Registro de nuevo usuario
        console.log('📝 Registrando nuevo usuario...');
        const { nombre, rol, id_tienda, fecha_nacimiento, celular, password } = form;
        
        // Crear usuario en Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: celular + '@tienda.com',
          password,
          options: {
            data: { 
              nombre, 
              rol, 
              id_tienda: parseInt(id_tienda), 
              fecha_nacimiento, 
              celular 
            }
          }
        });

        if (signUpError) {
          console.error('❌ Error en registro:', signUpError);
          setError(signUpError.message);
          return;
        }

        if (authData.user) {
          // Insertar datos adicionales en tabla usuarios
          const { error: dbError } = await supabase
            .from('usuarios')
            .insert([
              {
                id: authData.user.id,
                nombre,
                rol,
                id_tienda: parseInt(id_tienda),
                fecha_nacimiento,
                celular
              }
            ]);

          if (dbError) {
            console.error('❌ Error guardando en BD:', dbError);
            setError('Error guardando datos del usuario: ' + dbError.message);
          } else {
            console.log('✅ Usuario registrado correctamente');
            setSuccess('Usuario creado correctamente. Puedes iniciar sesión.');
            // Limpiar formulario
            setForm({
              nombre: '',
              rol: '',
              id_tienda: '',
              fecha_nacimiento: '',
              celular: '',
              password: '',
            });
            setIsRegister(false);
          }
        }
      } else {
        // Inicio de sesión
        console.log('🔐 Iniciando sesión...');
        const { celular, password } = form;
        
        if (!celular || !password) {
          setError('Por favor completa todos los campos');
          return;
        }

        await signIn(celular, password);
        console.log('✅ Login exitoso');
        setSuccess('Inicio de sesión exitoso');
        
        // Limpiar formulario
        setForm({
          nombre: '',
          rol: '',
          id_tienda: '',
          fecha_nacimiento: '',
          celular: '',
          password: '',
        });
      }
    } catch (err: any) {
      console.error('💥 Error:', err);
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
                
                {/* El rol es fijo como asesor */}
                <input type="hidden" name="rol" value="asesor" />
                
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
            
            <div>
              <label htmlFor="celular" className="block text-sm font-medium text-gray-700">
                Celular
              </label>
              <input
                id="celular"
                name="celular"
                type="text"
                required
                value={form.celular}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-600 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Número de celular"
              />
            </div>
            
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

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
                setForm({
                  nombre: '',
                  rol: '',
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