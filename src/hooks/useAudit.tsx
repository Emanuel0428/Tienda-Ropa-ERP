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

  const handleAuditInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      if (!user) throw new Error('Usuario no autenticado');
      
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) throw new Error('No hay usuario autenticado');

      // Verificar si ya existe una auditoría para esta tienda en esta fecha
      const { data: existingData, error: existingError } = await supabase
        .from('auditorias')
        .select()
        .eq('id_tienda', parseInt(auditInfo.id_tienda))
        .eq('fecha', auditInfo.fecha)
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
      const fecha = new Date(auditInfo.fecha);
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const año = fecha.getFullYear().toString();
      const tienda = auditInfo.id_tienda.padStart(2, '0');
      
      // Verificar si ya existe una auditoría con este formato base para determinar el intento
      const baseId = mes + año + tienda;
      let intento = 1;
      let auditId = parseInt(baseId + intento.toString().padStart(2, '0'));
      
      // Buscar si ya existe una auditoría con este ID
      while (true) {
        const { data: existingAuditId } = await supabase
          .from('auditorias')
          .select('id_auditoria')
          .eq('id_auditoria', auditId)
          .maybeSingle();
          
        if (!existingAuditId) break;
        intento++;
        auditId = parseInt(baseId + intento.toString().padStart(2, '0'));
      }

      // Insertar la nueva auditoría con ID personalizado
      const { data, error } = await supabase
        .from('auditorias')
        .insert({
          id_auditoria: auditId,
          id_tienda: parseInt(auditInfo.id_tienda),
          id_auditor: currentUser.id, // UUID de auth.users
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

      // Generar IDs personalizados basados en el ID de auditoría
      const baseAuditId = currentAuditId.toString(); // Ej: "920250201"
      
      // Guardar categorías, subcategorías e items según la estructura correcta
      for (let catIndex = 0; catIndex < categories.length; catIndex++) {
        const categoria = categories[catIndex];
        const promedioCat = getCategoriaPromedio(categoria);
        
        // Generar ID de categoría: baseAuditId + número de categoría (2 dígitos)
        const categoriaId = parseInt(baseAuditId + (catIndex + 1).toString().padStart(2, '0'));
        
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
          console.error('Error al crear categoría:', catError);
          throw catError;
        }

        // Insertar subcategorías
        for (let subcatIndex = 0; subcatIndex < categoria.subcategorias.length; subcatIndex++) {
          const subcat = categoria.subcategorias[subcatIndex];
          const promedioSubcat = getSubcategoriaTotal(subcat);
          
          // Generar ID de subcategoría: categoriaId + número de subcategoría (2 dígitos)
          const subcategoriaId = parseInt(categoriaId.toString() + (subcatIndex + 1).toString().padStart(2, '0'));
          
          const { error: subcatError } = await supabase
            .from('auditoria_subcategorias')
            .insert({
              id_auditoria_subcategoria: subcategoriaId,
              id_auditoria_categoria: categoriaId,
              nombre_subcategoria: subcat.nombre,
              promedio: promedioSubcat
            });

          if (subcatError) {
            console.error('Error al crear subcategoría:', subcatError);
            throw subcatError;
          }

          // Insertar items
          for (let itemIndex = 0; itemIndex < subcat.items.length; itemIndex++) {
            const item = subcat.items[itemIndex];
            if (item.calificacion !== null) {
              // Generar ID de item: subcategoriaId + número de item (2 dígitos)
              const itemId = parseInt(subcategoriaId.toString() + (itemIndex + 1).toString().padStart(2, '0'));
              
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
                console.error('Error al crear item:', itemError);
                throw itemError;
              }
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
    handleAuditInfoSave,
    handleFinalSave,
    
    // Utilidades de cálculo
    getSubcategoriaTotal,
    getCategoriaPromedio,
    getCalificacionTotalTienda: () => getCalificacionTotalTienda(categories)
  };
};
