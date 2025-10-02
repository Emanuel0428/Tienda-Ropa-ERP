import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../supabaseClient';

interface Categoria {
  id: number;
  nombre: string;
}

interface Subcategoria {
  id: number;
  nombre: string;
  categoria_id: number;
}

interface Pregunta {
  id: number;
  texto_pregunta: string;
  subcategoria_id: number;
  orden: number;
  activo: boolean;
}

const PreguntasMaestras = () => {
  const navigate = useNavigate();
  
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para edición
  const [preguntaEnEdicion, setPreguntaEnEdicion] = useState<number | null>(null);
  const [textoEditando, setTextoEditando] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  
  // Estados para agregar nuevas preguntas
  const [mostrandoFormulario, setMostrandoFormulario] = useState<number | null>(null); // subcategoria_id
  const [textoNuevaPregunta, setTextoNuevaPregunta] = useState<string>('');
  const [agregando, setAgregando] = useState(false);
  
  // Estado para mensaje de éxito
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  
  // Estados para eliminar preguntas
  const [eliminando, setEliminando] = useState<number | null>(null);
  
  // Estados para agregar categorías/subcategorías
  const [mostrandoFormularioCategoria, setMostrandoFormularioCategoria] = useState<'categoria' | 'subcategoria' | null>(null);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState<string>('');
  const [nuevaSubcategoriaNombre, setNuevaSubcategoriaNombre] = useState<string>('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [agregandoCategoria, setAgregandoCategoria] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Cargar categorías
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .eq('activo', true)
        .order('orden');

      if (categoriasError) throw categoriasError;

      // Cargar subcategorías
      const { data: subcategoriasData, error: subcategoriasError } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('activo', true)
        .order('orden');

      if (subcategoriasError) throw subcategoriasError;

      // Cargar preguntas
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('activo', true)
        .order('subcategoria_id, orden');

      if (preguntasError) throw preguntasError;

      setCategorias(categoriasData || []);
      setSubcategorias(subcategoriasData || []);
      setPreguntas(preguntasData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para iniciar edición de una pregunta
  const iniciarEdicion = (pregunta: Pregunta) => {
    setPreguntaEnEdicion(pregunta.id);
    setTextoEditando(pregunta.texto_pregunta);
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setPreguntaEnEdicion(null);
    setTextoEditando('');
  };

  // Función para guardar pregunta editada
  const guardarPreguntaEditada = async () => {
    if (!preguntaEnEdicion || !textoEditando.trim()) return;

    setGuardando(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('preguntas')
        .update({ 
          texto_pregunta: textoEditando.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', preguntaEnEdicion);

      if (updateError) throw updateError;

      // Actualizar el estado local
      setPreguntas(prev => prev.map(p => 
        p.id === preguntaEnEdicion 
          ? { ...p, texto_pregunta: textoEditando.trim() }
          : p
      ));

      // Limpiar estado de edición
      setPreguntaEnEdicion(null);
      setTextoEditando('');

      // Mostrar mensaje de éxito
      setMensajeExito('Pregunta actualizada exitosamente');
      setTimeout(() => setMensajeExito(null), 3000);

      console.log('✅ Pregunta actualizada exitosamente');

    } catch (error) {
      console.error('Error actualizando pregunta:', error);
      setError('Error al actualizar la pregunta');
    } finally {
      setGuardando(false);
    }
  };

  // Función para agregar nueva pregunta
  const agregarNuevaPregunta = async (subcategoriaId: number) => {
    if (!textoNuevaPregunta.trim()) {
      setError('El texto de la pregunta no puede estar vacío');
      return;
    }

    setAgregando(true);
    setError(null);

    try {
      // Obtener el siguiente orden para esta subcategoría
      const { data: ultimaPregunta, error: ordenError } = await supabase
        .from('preguntas')
        .select('orden')
        .eq('subcategoria_id', subcategoriaId)
        .order('orden', { ascending: false })
        .limit(1);

      if (ordenError) throw ordenError;

      const nuevoOrden = ultimaPregunta && ultimaPregunta.length > 0 
        ? ultimaPregunta[0].orden + 1 
        : 1;

      // Insertar nueva pregunta
      const { data: nuevaPregunta, error: insertError } = await supabase
        .from('preguntas')
        .insert({
          subcategoria_id: subcategoriaId,
          texto_pregunta: textoNuevaPregunta.trim(),
          orden: nuevoOrden,
          activo: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar el estado local
      setPreguntas(prev => [...prev, nuevaPregunta]);

      // Limpiar formulario
      setTextoNuevaPregunta('');
      setMostrandoFormulario(null);

      // Mostrar mensaje de éxito
      setMensajeExito('Nueva pregunta agregada exitosamente');
      setTimeout(() => setMensajeExito(null), 3000);

      console.log('✅ Nueva pregunta agregada exitosamente');

    } catch (error) {
      console.error('Error agregando nueva pregunta:', error);
      setError('Error al agregar la nueva pregunta');
    } finally {
      setAgregando(false);
    }
  };

  // Función para eliminar pregunta
  const eliminarPregunta = async (preguntaId: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta pregunta? Esta acción no se puede deshacer.')) {
      return;
    }

    setEliminando(preguntaId);
    setError(null);

    try {
      // Marcar como inactiva en lugar de eliminar físicamente
      const { error: updateError } = await supabase
        .from('preguntas')
        .update({ 
          activo: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', preguntaId);

      if (updateError) throw updateError;

      // Remover del estado local
      setPreguntas(prev => prev.filter(p => p.id !== preguntaId));

      setMensajeExito('Pregunta eliminada exitosamente');
      setTimeout(() => setMensajeExito(null), 3000);

      console.log('✅ Pregunta eliminada exitosamente');

    } catch (error) {
      console.error('Error eliminando pregunta:', error);
      setError('Error al eliminar la pregunta');
    } finally {
      setEliminando(null);
    }
  };

  // Función para agregar nueva categoría
  const agregarNuevaCategoria = async () => {
    if (!nuevaCategoriaNombre.trim()) {
      setError('El nombre de la categoría no puede estar vacío');
      return;
    }

    setAgregandoCategoria(true);
    setError(null);

    try {
      // Obtener el siguiente orden
      const { data: ultimaCategoria, error: ordenError } = await supabase
        .from('categorias')
        .select('orden')
        .order('orden', { ascending: false })
        .limit(1);

      if (ordenError) throw ordenError;

      const nuevoOrden = ultimaCategoria && ultimaCategoria.length > 0 
        ? ultimaCategoria[0].orden + 1 
        : 1;

      // Insertar nueva categoría
      const { data: nuevaCategoria, error: insertError } = await supabase
        .from('categorias')
        .insert({
          nombre: nuevaCategoriaNombre.trim(),
          orden: nuevoOrden,
          peso: 10, // Peso por defecto
          activo: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar estado local
      setCategorias(prev => [...prev, nuevaCategoria]);

      // Limpiar formulario
      setNuevaCategoriaNombre('');
      setMostrandoFormularioCategoria(null);

      setMensajeExito('Nueva categoría agregada exitosamente');
      setTimeout(() => setMensajeExito(null), 3000);

      console.log('✅ Nueva categoría agregada exitosamente');

    } catch (error) {
      console.error('Error agregando nueva categoría:', error);
      setError('Error al agregar la nueva categoría');
    } finally {
      setAgregandoCategoria(false);
    }
  };

  // Función para agregar nueva subcategoría
  const agregarNuevaSubcategoria = async () => {
    if (!nuevaSubcategoriaNombre.trim() || !categoriaSeleccionada) {
      setError('Debe completar todos los campos');
      return;
    }

    setAgregandoCategoria(true);
    setError(null);

    try {
      // Obtener el siguiente orden para esta categoría
      const { data: ultimaSubcategoria, error: ordenError } = await supabase
        .from('subcategorias')
        .select('orden')
        .eq('categoria_id', categoriaSeleccionada)
        .order('orden', { ascending: false })
        .limit(1);

      if (ordenError) throw ordenError;

      const nuevoOrden = ultimaSubcategoria && ultimaSubcategoria.length > 0 
        ? ultimaSubcategoria[0].orden + 1 
        : 1;

      // Insertar nueva subcategoría
      const { data: nuevaSubcategoria, error: insertError } = await supabase
        .from('subcategorias')
        .insert({
          nombre: nuevaSubcategoriaNombre.trim(),
          categoria_id: categoriaSeleccionada,
          orden: nuevoOrden,
          activo: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar estado local
      setSubcategorias(prev => [...prev, nuevaSubcategoria]);

      // Limpiar formulario
      setNuevaSubcategoriaNombre('');
      setCategoriaSeleccionada(null);
      setMostrandoFormularioCategoria(null);

      setMensajeExito('Nueva subcategoría agregada exitosamente');
      setTimeout(() => setMensajeExito(null), 3000);

      console.log('✅ Nueva subcategoría agregada exitosamente');

    } catch (error) {
      console.error('Error agregando nueva subcategoría:', error);
      setError('Error al agregar la nueva subcategoría');
    } finally {
      setAgregandoCategoria(false);
    }
  };

  // Organizar preguntas por categoría y subcategoría
  const organizarPreguntas = () => {
    const organizadas: { [categoriaId: number]: { categoria: Categoria, subcategorias: { [subcategoriaId: number]: { subcategoria: Subcategoria, preguntas: Pregunta[] } } } } = {};

    categorias.forEach(categoria => {
      organizadas[categoria.id] = {
        categoria,
        subcategorias: {}
      };

      const subcategoriasDeCategoria = subcategorias.filter(sub => sub.categoria_id === categoria.id);
      
      subcategoriasDeCategoria.forEach(subcategoria => {
        const preguntasDeSubcategoria = preguntas.filter(pregunta => pregunta.subcategoria_id === subcategoria.id);
        
        organizadas[categoria.id].subcategorias[subcategoria.id] = {
          subcategoria,
          preguntas: preguntasDeSubcategoria
        };
      });
    });

    return organizadas;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Cargando preguntas maestras...</p>
        </div>
      </div>
    );
  }

  const preguntasOrganizadas = organizarPreguntas();

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-6">
      {/* Header */}
      <div className="mb-8 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 Preguntas Maestras
            </h1>
            <p className="mt-2 text-gray-600">
              Gestiona las preguntas base que se utilizan en todas las auditorías
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/auditoria')}
          >
            ← Volver a Auditorías
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      {mensajeExito && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <strong className="font-bold">¡Éxito! </strong>
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Botones para agregar categorías/subcategorías */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              📁 Gestión de Categorías
            </h3>
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="text-sm px-3 py-2"
                onClick={() => setMostrandoFormularioCategoria('categoria')}
                disabled={mostrandoFormularioCategoria !== null}
              >
                ➕ Nueva Categoría
              </Button>
              <Button
                variant="secondary"
                className="text-sm px-3 py-2"
                onClick={() => setMostrandoFormularioCategoria('subcategoria')}
                disabled={mostrandoFormularioCategoria !== null}
              >
                ➕ Nueva Subcategoría
              </Button>
            </div>
          </div>

          {/* Formulario para nueva categoría */}
          {mostrandoFormularioCategoria === 'categoria' && (
            <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-3">
                📂 Agregar Nueva Categoría
              </h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={nuevaCategoriaNombre}
                  onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Nombre de la nueva categoría..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    className="text-xs px-3 py-1"
                    onClick={() => {
                      setMostrandoFormularioCategoria(null);
                      setNuevaCategoriaNombre('');
                    }}
                    disabled={agregandoCategoria}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="text-xs px-3 py-1"
                    onClick={agregarNuevaCategoria}
                    disabled={agregandoCategoria || !nuevaCategoriaNombre.trim()}
                  >
                    {agregandoCategoria ? 'Agregando...' : 'Agregar Categoría'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Formulario para nueva subcategoría */}
          {mostrandoFormularioCategoria === 'subcategoria' && (
            <div className="bg-green-50 p-4 rounded border-2 border-green-200">
              <h4 className="text-sm font-medium text-green-800 mb-3">
                📋 Agregar Nueva Subcategoría
              </h4>
              <div className="space-y-3">
                <select
                  value={categoriaSeleccionada || ''}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">Seleccione una categoría...</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={nuevaSubcategoriaNombre}
                  onChange={(e) => setNuevaSubcategoriaNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Nombre de la nueva subcategoría..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    className="text-xs px-3 py-1"
                    onClick={() => {
                      setMostrandoFormularioCategoria(null);
                      setNuevaSubcategoriaNombre('');
                      setCategoriaSeleccionada(null);
                    }}
                    disabled={agregandoCategoria}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    className="text-xs px-3 py-1"
                    onClick={agregarNuevaSubcategoria}
                    disabled={agregandoCategoria || !nuevaSubcategoriaNombre.trim() || !categoriaSeleccionada}
                  >
                    {agregandoCategoria ? 'Agregando...' : 'Agregar Subcategoría'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de preguntas organizadas */}
      <div className="space-y-6">
        {Object.values(preguntasOrganizadas).map(({ categoria, subcategorias }) => (
          <Card key={categoria.id}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📂 {categoria.nombre}
              </h2>
              
              <div className="space-y-4">
                {Object.values(subcategorias).map(({ subcategoria, preguntas: preguntasSubcat }) => (
                  <div key={subcategoria.id} className="border-l-4 border-blue-300 pl-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      📋 {subcategoria.nombre}
                    </h3>
                    
                    {preguntasSubcat.length > 0 ? (
                      <div className="space-y-2">
                        {preguntasSubcat.map((pregunta, index) => (
                          <div key={pregunta.id} className="bg-gray-50 p-3 rounded border">
                            {preguntaEnEdicion === pregunta.id ? (
                              // Modo edición
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <span className="text-sm text-gray-500 mt-2">
                                    {index + 1}.
                                  </span>
                                  <textarea
                                    value={textoEditando}
                                    onChange={(e) => setTextoEditando(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    rows={2}
                                    placeholder="Escriba el texto de la pregunta..."
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="secondary"
                                    className="text-xs px-3 py-1"
                                    onClick={cancelarEdicion}
                                    disabled={guardando}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="primary"
                                    className="text-xs px-3 py-1"
                                    onClick={guardarPreguntaEditada}
                                    disabled={guardando || !textoEditando.trim()}
                                  >
                                    {guardando ? 'Guardando...' : 'Guardar'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // Modo visualización
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <span className="text-sm text-gray-500 mr-2">
                                    {index + 1}.
                                  </span>
                                  <span className="text-gray-800">
                                    {pregunta.texto_pregunta}
                                  </span>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="secondary"
                                    className="text-xs px-2 py-1"
                                    title="Editar pregunta"
                                    onClick={() => iniciarEdicion(pregunta)}
                                    disabled={preguntaEnEdicion !== null}
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="text-xs px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    title="Eliminar pregunta"
                                    onClick={() => eliminarPregunta(pregunta.id)}
                                    disabled={preguntaEnEdicion !== null || eliminando === pregunta.id}
                                  >
                                    {eliminando === pregunta.id ? '⏳' : '🗑️'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No hay preguntas en esta subcategoría
                      </p>
                    )}

                    {/* Formulario para agregar nueva pregunta */}
                    {mostrandoFormulario === subcategoria.id ? (
                      <div className="bg-blue-50 p-4 rounded border-2 border-blue-200 mt-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          ➕ Agregar Nueva Pregunta
                        </h4>
                        <div className="space-y-3">
                          <textarea
                            value={textoNuevaPregunta}
                            onChange={(e) => setTextoNuevaPregunta(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={2}
                            placeholder="Escriba el texto de la nueva pregunta..."
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              className="text-xs px-3 py-1"
                              onClick={() => {
                                setMostrandoFormulario(null);
                                setTextoNuevaPregunta('');
                              }}
                              disabled={agregando}
                            >
                              Cancelar
                            </Button>
                            <Button
                              variant="primary"
                              className="text-xs px-3 py-1"
                              onClick={() => agregarNuevaPregunta(subcategoria.id)}
                              disabled={agregando || !textoNuevaPregunta.trim()}
                            >
                              {agregando ? 'Agregando...' : 'Agregar'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1"
                          onClick={() => setMostrandoFormulario(subcategoria.id)}
                          disabled={preguntaEnEdicion !== null || mostrandoFormulario !== null}
                        >
                          ➕ Agregar Pregunta
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {Object.keys(preguntasOrganizadas).length === 0 && (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">❓</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay preguntas maestras
          </h3>
          <p className="text-gray-500">
            No se encontraron preguntas maestras en el sistema
          </p>
        </Card>
      )}
    </div>
  );
};

export default PreguntasMaestras;