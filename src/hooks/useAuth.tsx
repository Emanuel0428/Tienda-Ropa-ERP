import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Flag para suprimir cambios de auth durante el flujo de registro
// Evita que signUp redirija al dashboard mientras se crea un usuario
let suppressNextAuthChange = false;
export const setSuppressNextAuthChange = (val: boolean) => { suppressNextAuthChange = val; };

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
    let isMounted = true;

    const loadUser = async (sessionUser: { id: string; email?: string } | null) => {
      if (!sessionUser) {
        if (isMounted) { setUser(null); setLoading(false); }
        return;
      }
      try {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id_usuario, nombre, rol, id_tienda, celular')
          .eq('id', sessionUser.id)
          .single();

        if (!isMounted) return;
        if (userData) {
          setUser({
            id: sessionUser.id,
            name: userData.nombre,
            email: sessionUser.email || '',
            role: userData.rol,
            store: userData.id_tienda?.toString(),
            avatar: ''
          });
        } else {
          setUser(null);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Cargar sesión inicial directamente (no depende de eventos)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!suppressNextAuthChange) {
        loadUser(session?.user ?? null);
      } else {
        if (isMounted) setLoading(false);
      }
    });

    // Escuchar cambios posteriores (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (suppressNextAuthChange) {
        if (event === 'SIGNED_OUT') suppressNextAuthChange = false;
        return;
      }
      // INITIAL_SESSION ya lo manejamos con getSession, ignorarlo aquí
      if (event === 'INITIAL_SESSION') return;

      loadUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        throw new Error('Usuario o contraseña incorrectos');
      }
      throw new Error(error.message);
    }

    if (!data.user) throw new Error('Usuario o contraseña incorrectos');
    // El usuario se setea automáticamente via onAuthStateChange (SIGNED_IN)
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // El usuario se limpia automáticamente via onAuthStateChange (SIGNED_OUT)
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
