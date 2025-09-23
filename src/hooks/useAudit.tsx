import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import { 
  Usuario, 
  Tienda, 
  AuditInfo, 
  ExtraNotes, 
  UploadedImages, 
  Categoria
} from '../types/audit';
import { initialCategories } from '../constants/auditCategories';
import { getCalificacionTotalTienda, getCategoriaPromedio, getSubcategoriaTotal } from '../utils/auditCalculations';

export const useAudit = () => {
  const { user } = useAuth();
  
  // Estados principales
  const [categories, setCategories] = useState<Categoria[]>(initialCategories);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosTienda, setUsuariosTienda] = useState<Usuario[]>([]);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentAuditId, setCurrentAuditId] = useState<number | null>(null);
  const [auditInfoSaved, setAuditInfoSaved] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Estado para los datos de la auditoría
  const [auditInfo, setAuditInfo] = useState<AuditInfo>({
    id_tienda: '',
    quienes_reciben: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  // Estado para las notas adicionales
  const [extraNotes, setExtraNotes] = useState<ExtraNotes>({
    personal: '',
    campanasTienda: '',
    conclusiones: ''
  });

  // Estado para imágenes del checklist final
  const [uploadedChecklistImages, setUploadedChecklistImages] = useState<UploadedImages>({});

  // Estado para manejar auditoría existente
  const [existingAudit, setExistingAudit] = useState<any>(null);
  const [showExistingAuditModal, setShowExistingAuditModal] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!currentUser) throw new Error('No hay usuario autenticado');

        // Cargar tiendas
        const { data: tiendasData, error: tiendasError } = await supabase
          .from('tiendas')
          .select('id_tienda, nombre')
          .order('nombre');
        
        if (tiendasError) throw tiendasError;
        setTiendas(tiendasData || []);

        // Cargar usuarios
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, id_usuario, nombre, rol, id_tienda')
          .order('nombre');

        if (usuariosError) throw usuariosError;
        setUsuarios((usuariosData || []).map(usuario => ({
          id: usuario.id,
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          rol: usuario.rol,
          id_tienda: usuario.id_tienda,
        })));
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError(err instanceof Error ? err.message : 'Error cargando datos iniciales');
      }
    };

    fetchData();
  }, []);

  // Actualizar usuarios de la tienda cuando se selecciona una tienda
  useEffect(() => {
    if (auditInfo.id_tienda) {
      const usuariosFiltrados = usuarios.filter(u => 
        u.id_tienda === parseInt(auditInfo.id_tienda)
      );
      setUsuariosTienda(usuariosFiltrados);
    } else {
      setUsuariosTienda([]);
    }
  }, [auditInfo.id_tienda, usuarios]);

  // Handlers
  const handleAuditInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAuditInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleExtraNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExtraNotes(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistImageChange = (label: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newImages: string[] = [];
    let loaded = 0;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          newImages.push(result);
        }
        loaded++;
        if (loaded === files.length) {
          setUploadedChecklistImages(prev => ({
            ...prev,
            [label]: [...(prev[label] || []), ...newImages]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCalificacionChange = (catId: number, subcatId: number, itemId: number, value: 0 | 100) => {
    setCategories(categories.map(cat =>
      cat.id === catId
        ? {
            ...cat,
            subcategorias: cat.subcategorias.map(subcat =>
              subcat.id === subcatId
                ? {
                    ...subcat,
                    items: subcat.items.map(item =>
                      item.id === itemId ? { ...item, calificacion: value } : item
                    )
                  }
                : subcat
            )
          }
        : cat
    ));
  };

  const handleNovedadChange = (catId: number, subcatId: number, itemId: number, value: string) => {
    setCategories(categories.map(cat =>
      cat.id === catId
        ? {
            ...cat,
            subcategorias: cat.subcategorias.map(subcat =>
              subcat.id === subcatId
                ? {
                    ...subcat,
                    items: subcat.items.map(item =>
                      item.id === itemId ? { ...item, novedad: value } : item
                    )
                  }
                : subcat
            )
          }
        : cat
    ));
  };

  const handleContinueExisting = () => {
    if (existingAudit) {
      setCurrentAuditId(Number(existingAudit.id_auditoria));
      setAuditInfoSaved(true);
      setShowExistingAuditModal(false);
    }
  };

  const handleCreateNewAuditForce = async () => {
    // Cerrar el modal primero
    setShowExistingAuditModal(false);
    
    // Forzar la creación de una nueva auditoría
    // Esta vez con un flag para indicar que debe crear una nueva
    await createNewAuditDirect();
  };

  const createNewAuditDirect = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const currentUser = user;
      
      // Generar ID formato: YYYYMMDD + ID_TIENDA + NUMERO_AUDITORIA_DEL_DIA
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const fechaStr = `${year}${month}${day}`;
      const tiendaId = parseInt(auditInfo.id_tienda);
      
      // Consultar cuántas auditorías ya existen hoy para esta tienda
      const { data: existingAudits, error: countError } = await supabase
        .from('auditorias')
        .select('id_auditoria')
        .eq('id_tienda', tiendaId)
        .eq('fecha', auditInfo.fecha);
      
      if (countError) {
        console.error('Error consultando auditorías existentes:', countError);
        throw countError;
      }
      
      // Número de auditoría del día (siguiente disponible)
      const numeroAuditoriaDelDia = (existingAudits?.length || 0) + 1;
      
      // Formato final: YYYYMMDD + TIENDA(2 dígitos) + NUMERO(2 dígitos)
      // Ejemplo: 20250923 + 01 + 01 = 2025092301001
      const auditId = parseInt(`${fechaStr}${tiendaId.toString().padStart(2, '0')}${numeroAuditoriaDelDia.toString().padStart(3, '0')}`);
      
      console.log('🚀 Creando auditoría con ID formato personalizado:', auditId, {
        fecha: fechaStr,
        tienda: tiendaId,
        numeroDelDia: numeroAuditoriaDelDia,
        auditInfo: {
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: currentUser.id,
          fecha: auditInfo.fecha,
          quienes_reciben: auditInfo.quienes_reciben
        }
      });
      
      // Insertar con ID generado por código
      const { data, error } = await supabase
        .from('auditorias')
        .insert({
          id_auditoria: auditId, // ID formato: YYYYMMDDTTAAA
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: currentUser.id,
          fecha: auditInfo.fecha,
          quienes_reciben: auditInfo.quienes_reciben,
          calificacion_total: 0,
          notas_personal: '',
          notas_campanas: '',
          notas_conclusiones: '',
          estado: 'en_progreso'
        })
        .select('id_auditoria')
        .single();

      console.log('📊 Respuesta de Supabase:', { data, error });

      if (error) throw error;
      if (!data) throw new Error('No se pudo crear la auditoría');

      if (data.id_auditoria) {        
        setCurrentAuditId(Number(data.id_auditoria));
        console.log('✅ Nueva auditoría creada con ID:', data.id_auditoria);
      } else {
        throw new Error('No se recibió un ID de auditoría válido');
      }
      setAuditInfoSaved(true);
    } catch (err) {
      console.error('Error creando nueva auditoría forzada:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la nueva auditoría');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuditInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      if (!user) throw new Error('Usuario no autenticado');
      
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) throw new Error('No hay usuario autenticado');

      // Verificar si ya existe una auditoría COMPLETADA para esta tienda en esta fecha
      // Solo mostramos el modal si hay una auditoría completada, no en progreso
      const { data: existingData, error: existingError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_tienda', parseInt(auditInfo.id_tienda))
        .eq('fecha', auditInfo.fecha)
        .eq('estado', 'completada') // Solo auditorías completadas
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingData) {
        setExistingAudit(existingData);
        setShowExistingAuditModal(true);
        setIsSaving(false);
        return;
      }

      // Generar ID personalizado para la auditoría
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const fechaStr = `${year}${month}${day}`;
      const tiendaId = parseInt(auditInfo.id_tienda);
      
      // Consultar cuántas auditorías ya existen hoy para esta tienda
      const { data: existingAudits, error: countError } = await supabase
        .from('auditorias')
        .select('id_auditoria')
        .eq('id_tienda', tiendaId)
        .eq('fecha', auditInfo.fecha);
      
      if (countError) {
        console.error('Error consultando auditorías existentes:', countError);
        throw countError;
      }
      
      // Número de auditoría del día (siguiente disponible)
      const numeroAuditoriaDelDia = (existingAudits?.length || 0) + 1;
      const auditId = parseInt(`${fechaStr}${tiendaId.toString().padStart(2, '0')}${numeroAuditoriaDelDia.toString().padStart(3, '0')}`);

      console.log('🚀 Creando auditoría con ID personalizado:', auditId, {
        fecha: fechaStr,
        tienda: tiendaId,
        numeroDelDia: numeroAuditoriaDelDia,
        auditInfo: {
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: currentUser.id,
          fecha: auditInfo.fecha,
          quienes_reciben: auditInfo.quienes_reciben
        }
      });
      
      // Insertar la nueva auditoría con ID específico
      const { data, error } = await supabase
        .from('auditorias')
        .insert({
          id_auditoria: auditId, // Especificar el ID generado
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: currentUser.id,
          fecha: auditInfo.fecha,
          quienes_reciben: auditInfo.quienes_reciben,
          calificacion_total: 0,
          notas_personal: '',
          notas_campanas: '',
          notas_conclusiones: '',
          estado: 'en_progreso'
        })
        .select('id_auditoria')
        .single();

      console.log('📊 Respuesta de Supabase:', { data, error });

      if (error) throw error;
      if (!data) throw new Error('No se pudo crear la auditoría');

      if (data.id_auditoria) {
        setCurrentAuditId(Number(data.id_auditoria));
      } else {
        throw new Error('No se recibió un ID de auditoría válido');
      }
      setAuditInfoSaved(true);
    } catch (err) {
      console.error('Error guardando información inicial:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la información inicial');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSave = async (): Promise<boolean> => {
    if (!currentAuditId) {
      setError('No se encontró una auditoría en progreso');
      return false;
    }

    setIsSaving(true);
    try {
      // Actualizar la auditoría principal
      const { error: updateError } = await supabase
        .from('auditorias')
        .update({
          calificacion_total: getCalificacionTotalTienda(categories),
          notas_personal: extraNotes.personal,
          notas_campanas: extraNotes.campanasTienda,
          notas_conclusiones: extraNotes.conclusiones,
          estado: 'completada'
        })
        .eq('id_auditoria', currentAuditId);

      if (updateError) throw updateError;

      // LIMPIAR registros duplicados SIMPLE Y DIRECTO
      console.log('🧹 Limpieza SIMPLE para auditoría:', currentAuditId);
      
      try {
        // Eliminar registros existentes directamente por ID de auditoría
        await supabase.from('auditoria_fotos').delete().eq('id_auditoria', Number(currentAuditId));
        await supabase.from('auditoria_categorias').delete().eq('id_auditoria', Number(currentAuditId));
        
        // Esperar que se propaguen los cambios
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('✅ Limpieza SIMPLE completada');
      } catch (error) {
        console.log('⚠️ Error en limpieza, continuando:', error);
      }

      // Generar IDs basados en el patrón: auditoria_id + índices
      const baseAuditId = currentAuditId.toString(); // "2025092301003"
      
      console.log('🔧 Generando categorías con patrón personalizado para auditoría:', baseAuditId);
      
      // Guardar categorías, subcategorías e items según la estructura correcta
      for (let catIndex = 0; catIndex < categories.length; catIndex++) {
        const categoria = categories[catIndex];
        
        // FILTRAR: Solo procesar categorías que tengan subcategorías con items válidos
        const subcategoriasValidas = categoria.subcategorias.filter(subcat => 
          subcat.items.some(item => item.calificacion !== null && item.calificacion !== undefined)
        );
        
        if (subcategoriasValidas.length === 0) {
          console.log('⚠️ Saltando categoría sin items válidos:', categoria.nombre);
          continue;
        }
        
        const promedioCat = getCategoriaPromedio(categoria);
        
        // ID categoría: baseAuditId + número de categoría (2 dígitos) simple
        // Ejemplo: "2025092301003" + "01" = 202509230100301
        const categoriaId = parseInt(baseAuditId + (catIndex + 1).toString().padStart(2, '0'));
        
        console.log('📁 Creando categoría simple:', {
          index: catIndex + 1,
          id: categoriaId,
          nombre: categoria.nombre,
          baseAuditId,
          subcategoriasValidas: subcategoriasValidas.length
        });
        
        // Insertar categoría con ID personalizado
        const { error: catError } = await supabase
          .from('auditoria_categorias')
          .insert({
            id_auditoria_categoria: categoriaId,
            id_auditoria: Number(currentAuditId),
            nombre_categoria: categoria.nombre,
            peso: categoria.peso,
            promedio: promedioCat
          });

        if (catError) {
          console.error('❌ Error al crear categoría:', catError);
          console.log('⚠️ Saltando categoría con error y continuando...');
          continue; // Continuar con la siguiente categoría en lugar de fallar todo
        }
        console.log('✅ Categoría creada:', categoriaId);

        // Insertar subcategorías (solo las que tienen items válidos)
        for (let subcatIndex = 0; subcatIndex < subcategoriasValidas.length; subcatIndex++) {
          const subcat = subcategoriasValidas[subcatIndex];
          
          // FILTRAR: Solo procesar items con calificación válida
          const itemsValidos = subcat.items.filter(item => 
            item.calificacion !== null && item.calificacion !== undefined
          );
          
          if (itemsValidos.length === 0) {
            console.log('⚠️ Saltando subcategoría sin items válidos:', subcat.nombre);
            continue;
          }
          
          const promedioSubcat = getSubcategoriaTotal(subcat);
          
          // ID subcategoría: categoriaId + número de subcategoría (2 dígitos) simple
          const subcatIndexStr = (subcatIndex + 1).toString().padStart(2, '0');
          const subcategoriaIdStr = categoriaId.toString() + subcatIndexStr;
          const subcategoriaId = subcategoriaIdStr; // Usar string directamente para evitar problemas BigInt
          
          console.log('📂 Creando subcategoría simple:', {
            index: subcatIndex + 1,
            indexStr: subcatIndexStr,
            categoriaIdStr: categoriaId.toString(),
            concatenado: subcategoriaIdStr,
            id: subcategoriaId,
            nombre: subcat.nombre,
            categoriaId,
            itemsValidos: itemsValidos.length
          });
          
          const { error: subcatError } = await supabase
            .from('auditoria_subcategorias')
            .insert({
              id_auditoria_subcategoria: subcategoriaId, // Usar string directamente
              id_auditoria_categoria: categoriaId,
              nombre_subcategoria: subcat.nombre,
              promedio: promedioSubcat
            });

          if (subcatError) {
            console.error('❌ Error al crear subcategoría:', subcatError);
            console.log('⚠️ Saltando subcategoría con error y continuando...');
            continue; // Continuar con la siguiente subcategoría en lugar de fallar todo
          }
          console.log('✅ Subcategoría creada:', subcategoriaId);

          // ESPERAR un momento para asegurar que la subcategoría esté disponible
          await new Promise(resolve => setTimeout(resolve, 50));
          
          console.log('✅ Subcategoría lista para items:', subcategoriaId);

          // Insertar items (solo los válidos)
          for (let itemIndex = 0; itemIndex < itemsValidos.length; itemIndex++) {
            const item = itemsValidos[itemIndex];
            
            // ID item: subcategoriaId + número de item (2 dígitos) simple
            const itemIndexStr = (itemIndex + 1).toString().padStart(2, '0');
            const itemIdStr = subcategoriaId.toString() + itemIndexStr;
            const itemId = itemIdStr; // Usar string directamente
            
            console.log('💾 Insertando item simple:', {
              index: itemIndex + 1,
              indexStr: itemIndexStr,
              subcategoriaIdStr: subcategoriaId,
              concatenado: itemIdStr,
              id: itemId,
              subcategoriaId: subcategoriaId,
              item: item.label,
              calificacion: item.calificacion,
              usuario: user?.id
            });
            
            try {
              const { error: itemError } = await supabase
                .from('auditoria_items')
                .insert({
                  id_auditoria_item: itemId,
                  id_auditoria_subcategoria: subcategoriaId,
                  item_label: item.label,
                  calificacion: item.calificacion,
                  novedad: item.novedad || ''
                });

              if (itemError) {
                console.error('❌ Error al crear item:', {
                  error: itemError,
                  itemId: itemId,
                  subcategoriaId: subcategoriaId,
                  itemLabel: item.label,
                  calificacion: item.calificacion
                });
                console.log('⚠️ Saltando item con error y continuando...');
                continue;
              } else {
                console.log('✅ Item creado exitosamente:', itemId);
              }
            } catch (error) {
              console.error('❌ Excepción al crear item:', error);
              console.log('⚠️ Saltando item con excepción y continuando...');
              continue;
            }
          }
        }
      }

      // Guardar fotos
      let fotoCounter = 1;
      const fotoPromises = Object.entries(uploadedChecklistImages).flatMap(([tipo, urls]) =>
        urls.map(url => {
          // Generar ID de foto: currentAuditId + contador (3 dígitos)
          const fotoId = parseInt(currentAuditId.toString() + fotoCounter.toString().padStart(3, '0'));
          fotoCounter++;
          
          return supabase
            .from('auditoria_fotos')
            .insert({
              id_auditoria_foto: fotoId,
              id_auditoria: Number(currentAuditId),
              tipo_foto: tipo,
              url_foto: url
            });
        })
      );

      const fotoResults = await Promise.all(fotoPromises);
      const fotoErrors = fotoResults.filter(result => result.error);
      
      if (fotoErrors.length > 0) {
        console.error('Errores al guardar fotos:', fotoErrors);
        throw new Error('Error al guardar algunas fotos');
      }

      // Mostrar mensaje de éxito
      setShowSuccessMessage(true);
      
      return true;
    } catch (err) {
      console.error('Error guardando auditoría completa:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la auditoría');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // Estados
    categories,
    usuarios,
    usuariosTienda,
    tiendas,
    error,
    isSaving,
    currentAuditId,
    auditInfoSaved,
    auditInfo,
    extraNotes,
    uploadedChecklistImages,
    existingAudit,
    showExistingAuditModal,
    showSuccessMessage,
    
    // Setters
    setError,
    setShowExistingAuditModal,
    setShowSuccessMessage,
    
    // Handlers
    handleAuditInfoChange,
    handleExtraNotesChange,
    handleChecklistImageChange,
    handleCalificacionChange,
    handleNovedadChange,
    handleContinueExisting,
    handleCreateNewAuditForce,
    handleAuditInfoSave,
    handleFinalSave,
    
    // Utilidades de cálculo
    getSubcategoriaTotal,
    getCategoriaPromedio,
    getCalificacionTotalTienda: () => getCalificacionTotalTienda(categories)
  };
};
