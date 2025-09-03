import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (celular: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!mounted) return;

      try {
        console.log('🔄 Verificando sesión existente...');
        
        // Obtener la sesión actual
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error obteniendo sesión:', sessionError);
          if (mounted) setLoading(false);
          return;
        }

        const session = data.session;

        if (!session?.user) {
          console.log('ℹ️ No hay sesión activa');
          if (mounted) setLoading(false);
          return;
        }

        console.log('✅ Sesión encontrada, cargando datos de usuario...');

        // Si hay sesión, cargar datos del usuario
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id_usuario, nombre, rol, id_tienda, celular')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('❌ Error cargando datos de usuario:', userError);
          if (mounted) setLoading(false);
          return;
        }

        if (!userData) {
          console.error('❌ No se encontraron datos del usuario');
          if (mounted) setLoading(false);
          return;
        }

        console.log('✅ Sesión restaurada para:', userData.nombre);
        
        if (mounted) {
          setUser({
            id: session.user.id,
            name: userData.nombre,
            email: userData.celular + '@tienda.com',
            role: userData.rol,
            store: userData.id_tienda?.toString(),
            avatar: ''
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error en inicialización de auth:', error);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
    };

    // Suscribirse a cambios en la autenticación
    // Suscribirse a cambios en el estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Cambio en estado de autenticación:', event);
      
      if (!mounted) return;

      if (!session?.user) {
        console.log('ℹ️ Usuario desconectado');
        setUser(null);
        return;
      }

      try {
        console.log('🔄 Actualizando datos de usuario...');
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id_usuario, nombre, rol, id_tienda, celular')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          console.error('❌ Error actualizando datos de usuario:', userError);
          return;
        }

        console.log('✅ Datos de usuario actualizados:', userData.nombre);
        if (mounted) {
          setUser({
            id: session.user.id,
            name: userData.nombre,
            email: userData.celular + '@tienda.com',
            role: userData.rol,
            store: userData.id_tienda?.toString(),
            avatar: ''
          });
        }
      } catch (error) {
        console.error('❌ Error en actualización de usuario:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (celular: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Iniciando sesión...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: celular + '@tienda.com',
        password: password
      });

      if (error) {
        console.error('❌ Error en login:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo iniciar sesión');
      }

      // Cargar datos del usuario inmediatamente
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre, rol, id_tienda, celular')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        console.error('❌ Error cargando datos:', userError);
        throw new Error('No se pudieron cargar los datos del usuario');
      }

      console.log('✅ Usuario cargado:', userData.nombre);
      setUser({
        id: data.user.id,
        name: userData.nombre,
        email: userData.celular + '@tienda.com',
        role: userData.rol,
        store: userData.id_tienda?.toString(),
        avatar: ''
      });
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await supabase.auth.signOut();
      setUser(null);
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};