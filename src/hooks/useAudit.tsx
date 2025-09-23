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
  const [currentStep, setCurrentStep] = useState(1);

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

  // Estados para manejar auditorías existentes
  const [existingAudits, setExistingAudits] = useState<any[]>([]);
  const [showAuditHistoryModal, setShowAuditHistoryModal] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar usuarios
        const { data: usuariosData } = await supabase.from('usuarios').select('*');
        if (usuariosData) setUsuarios(usuariosData);

        // Cargar tiendas
        const { data: tiendasData } = await supabase.from('tiendas').select('*');
        if (tiendasData) setTiendas(tiendasData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    fetchData();
  }, []);

  // Filtrar usuarios por tienda seleccionada
  useEffect(() => {
    if (auditInfo.id_tienda && usuarios.length > 0) {
      const usuariosFiltrados = usuarios.filter(usuario => 
        usuario.id_tienda === parseInt(auditInfo.id_tienda)
      );
      setUsuariosTienda(usuariosFiltrados);
    } else {
      setUsuariosTienda([]);
    }
  }, [auditInfo.id_tienda, usuarios]);

  // Handlers para formularios
  const handleAuditInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAuditInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleExtraNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExtraNotes(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistImageChange = (label: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedChecklistImages(prev => ({
            ...prev,
            [label]: [e.target!.result as string] // Guardar solo la URL como string[]
          }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedChecklistImages(prev => {
        const updated = { ...prev };
        delete updated[label];
        return updated;
      });
    }
  };

  // Handlers para calificaciones e items
  const handleCalificacionChange = (catId: number, subcatId: number, itemId: number, value: 0 | 100) => {
    setCategories(prevCategories => 
      prevCategories.map(cat => 
        cat.id === catId 
          ? {
              ...cat,
              subcategorias: cat.subcategorias.map(subcat => 
                subcat.id === subcatId 
                  ? {
                      ...subcat,
                      items: subcat.items.map(item => 
                        item.id === itemId 
                          ? { ...item, calificacion: value }
                          : item
                      )
                    }
                  : subcat
              )
            }
          : cat
      )
    );
  };

  const handleNovedadChange = (catId: number, subcatId: number, itemId: number, value: string) => {
    setCategories(prevCategories => 
      prevCategories.map(cat => 
        cat.id === catId 
          ? {
              ...cat,
              subcategorias: cat.subcategorias.map(subcat => 
                subcat.id === subcatId 
                  ? {
                      ...subcat,
                      items: subcat.items.map(item => 
                        item.id === itemId 
                          ? { ...item, novedad: value }
                          : item
                      )
                    }
                  : subcat
              )
            }
          : cat
      )
    );
  };

  // Función para cargar datos de auditoría existente
  const loadExistingAuditData = async (auditId: number) => {
    console.log('📊 Cargando datos de auditoría existente:', auditId);
    
    try {
      // Cargar información general de la auditoría
      const { data: auditData, error: auditError } = await supabase
        .from('auditoria')
        .select('*')
        .eq('id_auditoria', auditId)
        .single();

      if (auditError) {
        console.error('Error cargando información de auditoría:', auditError);
        return;
      }

      if (auditData) {
        setAuditInfo({
          id_tienda: auditData.id_tienda?.toString() || '',
          quienes_reciben: auditData.quienes_reciben || '',
          fecha: auditData.fecha_auditoria || new Date().toISOString().split('T')[0]
        });

        setExtraNotes({
          personal: auditData.notas_personal || '',
          campanasTienda: auditData.notas_campanas || '',
          conclusiones: auditData.conclusiones || ''
        });
      }

      // Cargar categorías existentes
      const { data: categoriasData } = await supabase
        .from('auditoria_categorias')
        .select('*')
        .eq('id_auditoria', auditId);

      if (categoriasData && categoriasData.length > 0) {
        // Cargar subcategorías existentes  
        const { data: subcategoriasData } = await supabase
          .from('auditoria_subcategorias')
          .select('*')
          .in('id_auditoria_categoria', categoriasData.map(c => c.id_auditoria_categoria));

        if (subcategoriasData && subcategoriasData.length > 0) {
          // Cargar items existentes
          const { data: itemsData } = await supabase
            .from('auditoria_items') 
            .select('*')
            .in('id_auditoria_subcategoria', subcategoriasData.map(s => s.id_auditoria_subcategoria));

          console.log('📋 Datos existentes cargados:', { 
            categorias: categoriasData.length,
            subcategorias: subcategoriasData.length, 
            items: itemsData?.length || 0
          });

          // Reconstruir el estado de categories con los datos existentes
          if (itemsData && itemsData.length > 0) {
            setCategories(prevCategories => 
              prevCategories.map(categoria => {
                const categoriaData = categoriasData.find(cd => cd.id_categoria_original === categoria.id);
                
                return {
                  ...categoria,
                  subcategorias: categoria.subcategorias.map(subcategoria => {
                    const subcategoriaData = subcategoriasData.find(sd => 
                      sd.id_auditoria_categoria === categoriaData?.id_auditoria_categoria &&
                      sd.id_subcategoria_original === subcategoria.id
                    );

                    return {
                      ...subcategoria,
                      items: subcategoria.items.map(item => {
                        const itemData = itemsData.find(id => 
                          id.id_auditoria_subcategoria === subcategoriaData?.id_auditoria_subcategoria &&
                          id.id_item_original === item.id
                        );

                        if (itemData) {
                          return {
                            ...item,
                            calificacion: itemData.calificacion as 0 | 100,
                            novedad: itemData.novedad || '',
                            accionCorrectiva: itemData.accion_correctiva || ''
                          };
                        }
                        return item;
                      })
                    };
                  })
                };
              })
            );
            console.log('✅ Estado de categorías actualizado con datos existentes');
          }
        }
      } else {
        console.log('📝 Auditoría vacía, listo para llenar datos');
      }

    } catch (error) {
      console.error('❌ Error cargando datos existentes:', error);
    }
  };

  // Funciones para manejar selección de auditorías
  const handleSelectAudit = async (selectedAudit: any) => {
    console.log('🎯 Auditoría seleccionada:', selectedAudit.id_auditoria);
    setCurrentAuditId(Number(selectedAudit.id_auditoria));
    await loadExistingAuditData(Number(selectedAudit.id_auditoria));
    setAuditInfoSaved(true);
    setCurrentStep(2); // Avanzar al paso de evaluación de categorías
    setShowAuditHistoryModal(false);
    
    // Mostrar mensaje de éxito
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleCreateNew = () => {
    console.log('🆕 Creando nueva auditoría');
    setShowAuditHistoryModal(false);
    // Continuar con el flujo normal de creación
    createNewAudit();
  };

  // Función para crear nueva auditoría con ID único
  const createNewAudit = async () => {
    if (!user?.id) {
      setError('Usuario no autenticado');
      setIsSaving(false);
      return;
    }

    try {
      // Generar ID único para nueva auditoría
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const fechaStr = `${year}${month}${day}`;
      const tiendaId = parseInt(auditInfo.id_tienda);
      
      // Buscar el próximo ID disponible que NO exista ya
      let numeroAuditoriaDelDia = 1;
      let auditId;
      let exists = true;
      
      console.log('🔍 Buscando próximo ID disponible para tienda', tiendaId, 'fecha', auditInfo.fecha);
      
      while (exists) {
        auditId = parseInt(`${fechaStr}${tiendaId.toString().padStart(2, '0')}${numeroAuditoriaDelDia.toString().padStart(3, '0')}`);
        
        // Verificar si este ID ya existe
        const { data: existingAudit } = await supabase
          .from('auditorias')
          .select('id_auditoria')
          .eq('id_auditoria', auditId)
          .single();
        
        if (!existingAudit) {
          exists = false;
          console.log('✅ ID disponible encontrado:', auditId);
        } else {
          numeroAuditoriaDelDia++;
          console.log('⚠️ ID', auditId, 'ya existe, probando siguiente...');
        }
      }

      console.log('🚀 Creando auditoría con ID único verificado:', auditId);

      // Crear nueva auditoría
      const { data, error } = await supabase
        .from('auditorias')
        .insert({
          id_auditoria: auditId,
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: user.id,
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

      if (error) throw error;
      if (!data) throw new Error('No se pudo crear la auditoría');

      if (data.id_auditoria) {        
        setCurrentAuditId(Number(data.id_auditoria));
        console.log('✅ Nueva auditoría creada con ID:', data.id_auditoria);
        setAuditInfoSaved(true);
        setCurrentStep(2); // Avanzar al siguiente paso
        setIsSaving(false);
        
        // Mostrar mensaje de éxito
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        throw new Error('No se recibió un ID de auditoría válido');
      }
    } catch (error) {
      console.error('❌ Error creando nueva auditoría:', error);
      setError('Error al crear la auditoría');
      setIsSaving(false);
    }
  };

  // Función principal para guardar información de auditoría
  const handleAuditInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    setError(null);

    try {
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar auditorías existentes para esta tienda (últimos 30 días)
      const { data: allAuditsData, error: auditsError } = await supabase
        .from('auditorias')
        .select('*')
        .eq('id_tienda', parseInt(auditInfo.id_tienda))
        .gte('fecha', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('fecha', { ascending: false })
        .order('id_auditoria', { ascending: false });

      if (auditsError) throw auditsError;

      if (allAuditsData && allAuditsData.length > 0) {
        // Mostrar historial de auditorías para que el usuario seleccione
        console.log('📋 Auditorías existentes encontradas:', allAuditsData.length);
        setExistingAudits(allAuditsData);
        setShowAuditHistoryModal(true);
        setIsSaving(false);
        return;
      }

      // Si no hay auditorías existentes, crear nueva directamente
      await createNewAudit();
      
    } catch (error) {
      console.error('❌ Error en handleAuditInfoSave:', error);
      setError('Error al procesar la información de auditoría');
      setIsSaving(false);
    }
  };

  // Función para guardar auditoría final con todas las calificaciones
  const handleFinalSave = async (): Promise<boolean> => {
    if (!currentAuditId) {
      setError('No hay una auditoría activa');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('💾 Iniciando guardado final de auditoría:', currentAuditId);

      // Calcular calificación total
      const calificacionTotal = getCalificacionTotalTienda(categories);

      // Actualizar información principal de auditoría
      const { error: updateError } = await supabase
        .from('auditorias')
        .update({
          calificacion_total: calificacionTotal,
          notas_personal: extraNotes.personal,
          notas_campanas: extraNotes.campanasTienda,
          notas_conclusiones: extraNotes.conclusiones,
          estado: 'completada'
        })
        .eq('id_auditoria', currentAuditId);

      if (updateError) throw updateError;

      console.log('🔧 Guardando categorías, subcategorías e items...');
      
      // Guardar categorías, subcategorías e items con IDs automáticos
      for (let catIndex = 0; catIndex < categories.length; catIndex++) {
        const categoria = categories[catIndex];
        
        // Filtrar subcategorías que tienen items con calificación
        const subcategoriasValidas = categoria.subcategorias.filter(subcat => 
          subcat.items.some(item => item.calificacion !== null && item.calificacion !== undefined)
        );
        
        if (subcategoriasValidas.length === 0) {
          console.log('⚠️ Saltando categoría sin items válidos:', categoria.nombre);
          continue;
        }
        
        const promedioCat = getCategoriaPromedio(categoria);
        
        console.log('📁 Creando categoría:', {
          index: catIndex + 1,
          nombre: categoria.nombre,
          subcategoriasValidas: subcategoriasValidas.length
        });
        
        // Insertar categoría con ID automático
        const { data: categoriaData, error: catError } = await supabase
          .from('auditoria_categorias')
          .insert({
            id_auditoria: Number(currentAuditId),
            nombre_categoria: categoria.nombre,
            peso: categoria.peso,
            promedio: promedioCat
          })
          .select('id_auditoria_categoria')
          .single();

        if (catError) {
          console.error('❌ Error al crear categoría:', catError);
          continue;
        }

        if (!categoriaData?.id_auditoria_categoria) {
          console.error('❌ No se recibió ID de categoría');
          continue;
        }

        const categoriaIdReal = categoriaData.id_auditoria_categoria;
        console.log('✅ Categoría creada con ID:', categoriaIdReal);

        // Procesar subcategorías
        for (let subcatIndex = 0; subcatIndex < subcategoriasValidas.length; subcatIndex++) {
          const subcat = subcategoriasValidas[subcatIndex];
          
          // Filtrar items válidos
          const itemsValidos = subcat.items.filter(item => 
            item.calificacion !== null && item.calificacion !== undefined
          );
          
          if (itemsValidos.length === 0) continue;
          
          const promedioSubcat = getSubcategoriaTotal(subcat);
          
          console.log('📂 Creando subcategoría:', {
            index: subcatIndex + 1,
            nombre: subcat.nombre,
            categoriaIdReal,
            itemsValidos: itemsValidos.length
          });
          
          // Insertar subcategoría con ID automático
          const { data: subcategoriaData, error: subcatError } = await supabase
            .from('auditoria_subcategorias')
            .insert({
              id_auditoria_categoria: categoriaIdReal,
              nombre_subcategoria: subcat.nombre,
              promedio: promedioSubcat
            })
            .select('id_auditoria_subcategoria')
            .single();

          if (subcatError) {
            console.error('❌ Error al crear subcategoría:', subcatError);
            continue;
          }

          if (!subcategoriaData?.id_auditoria_subcategoria) {
            console.error('❌ No se recibió ID de subcategoría');
            continue;
          }

          const subcategoriaIdReal = subcategoriaData.id_auditoria_subcategoria;
          console.log('✅ Subcategoría creada con ID:', subcategoriaIdReal);

          // Insertar items
          for (let itemIndex = 0; itemIndex < itemsValidos.length; itemIndex++) {
            const item = itemsValidos[itemIndex];
            
            console.log('💾 Insertando item:', {
              index: itemIndex + 1,
              subcategoriaIdReal,
              item: item.label,
              calificacion: item.calificacion
            });
            
            const { error: itemError } = await supabase
              .from('auditoria_items')
              .insert({
                id_auditoria_subcategoria: subcategoriaIdReal,
                item_label: item.label,
                calificacion: item.calificacion,
                novedad: item.novedad || ''
              });

            if (itemError) {
              console.error('❌ Error al crear item:', itemError);
              continue;
            } else {
              console.log('✅ Item creado exitosamente');
            }
          }
        }
      }

      // Guardar fotos del checklist (si las hay)
      let fotoCounter = 1;
      for (const [tipo, imageUrls] of Object.entries(uploadedChecklistImages)) {
        if (imageUrls && imageUrls.length > 0) {
          // Como ya tenemos las URLs de las imágenes, las guardamos directamente
          await supabase.from('auditoria_fotos').insert({
            id_auditoria_foto: parseInt(`${currentAuditId}${fotoCounter.toString().padStart(3, '0')}`),
            id_auditoria: currentAuditId,
            tipo_foto: tipo,
            url_foto: imageUrls[0] // Usar la primera URL
          });

          fotoCounter++;
        }
      }

      console.log('🎉 ¡Auditoría guardada exitosamente!');
      setShowSuccessMessage(true);
      setIsSaving(false);
      return true;

    } catch (error) {
      console.error('❌ Error en guardado final:', error);
      setError('Error al guardar la auditoría');
      setIsSaving(false);
      return false;
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
    showSuccessMessage,
    currentStep,
    auditInfo,
    extraNotes,
    uploadedChecklistImages,
    existingAudits,
    showAuditHistoryModal,
    setShowAuditHistoryModal,
    
    // Handlers
    handleAuditInfoChange,
    handleExtraNotesChange,
    handleChecklistImageChange,
    handleCalificacionChange,
    handleNovedadChange,
    handleSelectAudit,
    handleCreateNew,
    handleAuditInfoSave,
    handleFinalSave,
    
    // Setters adicionales
    setShowSuccessMessage,
    setCurrentStep,
    
    // Utilidades de cálculo
    getSubcategoriaTotal,
    getCategoriaPromedio,
    getCalificacionTotalTienda: () => getCalificacionTotalTienda(categories)
  };
};