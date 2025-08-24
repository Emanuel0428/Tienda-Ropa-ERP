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
  const [loading, setLoading] = useState(false);

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

      if (data.user) {
        // Cargar datos del usuario inmediatamente
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('id_usuario, nombre, rol, id_tienda, celular')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.error('❌ Error cargando datos:', userError);
          throw new Error('No se pudieron cargar los datos del usuario');
        }

        if (userData) {
          console.log('✅ Usuario cargado:', userData.nombre);
          setUser({
            id: data.user.id,
            name: userData.nombre,
            email: userData.celular + '@tienda.com',
            role: userData.rol,
            store: userData.id_tienda?.toString(),
            avatar: ''
          });
        }
      }
    } catch (error) {
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