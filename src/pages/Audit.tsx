import { supabase } from '../supabaseClient';
import { useState } from 'react';

// Tipos para los ítems y subcategorías
type Calificacion = 0 | 100 | null;
interface AuditItem {
  id: number;
  label: string;
  calificacion: Calificacion;
  novedad: string;
}
interface Subcategoria {
  id: number;
  nombre: string;
  items: AuditItem[];
}
interface Categoria {
  id: number;
  nombre: string;
  peso: number;
  subcategorias: Subcategoria[];
}

// Estructura con categorías principales y subcategorías
const initialCategories: Categoria[] = [
  {
    id: 1,
    nombre: 'ASEO',
    peso: 10,
    subcategorias: [
      {
        id: 1,
        nombre: 'ASEO LOCATIVO',
        items: [
          { id: 1, label: 'Antenas limpias', calificacion: null, novedad: '' },
          { id: 2, label: 'El baffle limpio (si aplica)', calificacion: null, novedad: '' },
          { id: 3, label: 'Punto de pago en orden, sin prendas, basura, todo en su lugar', calificacion: null, novedad: '' },
          { id: 4, label: 'Ventiladores limpios (Hace cuanto los limpiaron)', calificacion: null, novedad: '' },
          { id: 5, label: 'Vitrinas limpias (si aplica)', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'ASEO GENERAL TIENDA',
        items: [
          { id: 1, label: 'Maniquís limpios', calificacion: null, novedad: '' },
          { id: 2, label: 'Los módulos y frontales limpios', calificacion: null, novedad: '' },
          { id: 3, label: 'Aseo de andén y cortina (para las que aplique)', calificacion: null, novedad: '' },
          { id: 4, label: 'Tienda en general (barrido, trapeado piso y escaleras)', calificacion: null, novedad: '' },
          { id: 5, label: 'Los vestier sin ganchos, limpios (sillas y espejos)', calificacion: null, novedad: '' },
          { id: 6, label: 'Paredes limpias (del vestier, Punto de pago y tienda en general)', calificacion: null, novedad: '' },
          { id: 7, label: 'Baño limpio, con sus respectivos implementos de aseo', calificacion: null, novedad: '' },
          { id: 8, label: 'Basura acumulada, o la están sacando los días correspondientes', calificacion: null, novedad: '' },
          { id: 9, label: 'Bodega principal limpia', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 2,
    nombre: 'VISUAL',
    peso: 11,
    subcategorias: [
      {
        id: 1,
        nombre: 'PUBLICIDAD',
        items: [
          { id: 1, label: 'Campaña del mes montado toda su publicidad POP', calificacion: null, novedad: '' },
          { id: 2, label: 'Exhibición de la promoción (ubicación dentro de la tienda)', calificacion: null, novedad: '' },
          { id: 3, label: 'Exhibiciones nuevas colecciones', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'EXHIBICIONES',
        items: [
          { id: 1, label: 'Engamado de los modulos', calificacion: null, novedad: '' },
          { id: 2, label: 'Frontales organizados por talla y perfilados', calificacion: null, novedad: '' },
          { id: 3, label: 'Áreas y perimetrales organizadas y surtidas', calificacion: null, novedad: '' },
          { id: 4, label: 'Mesa de Bienvenida o muebles con su respectiva campaña', calificacion: null, novedad: '' },
          { id: 5, label: 'Prendas vaporizadas', calificacion: null, novedad: '' },
          { id: 6, label: 'Cuantas campañas hay activas', calificacion: null, novedad: '' },
          { id: 7, label: 'Qué % de participación tiene cada campaña', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 3,
        nombre: 'VISUAL GENERAL',
        items: [
          { id: 1, label: 'Maniquís vestidos (confirmar último cambio)', calificacion: null, novedad: '' },
          { id: 2, label: 'Música corporativa - Emisora con volumen adecuado', calificacion: null, novedad: '' },
          { id: 3, label: 'Prendas del piso con su respectivo pin', calificacion: null, novedad: '' },
          { id: 4, label: 'Prendas con averías o sucias en piso', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 3,
    nombre: 'BODEGA',
    peso: 11,
    subcategorias: [
      {
        id: 1,
        nombre: 'GESTIÓN DE BODEGA',
        items: [
          { id: 1, label: 'Bodega organizada por referencias, tallas y cajas rotuladas', calificacion: null, novedad: '' },
          { id: 2, label: 'Gestión de cajas nuevas sin organizar (Hace cuanto la tienen)', calificacion: null, novedad: '' },
          { id: 3, label: 'Última vez que llegó mercancía y cuántas cajas', calificacion: null, novedad: '' },
          { id: 4, label: 'Mercancía en caja organizada y separada', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'ORDEN DE BODEGA',
        items: [
          { id: 1, label: 'Bodega pequeña (si aplica) o bodega alterna - organizadas con rótulos', calificacion: null, novedad: '' },
          { id: 2, label: 'Están organizadas las cajas de averías, negativos rotuladas y separadas', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 4,
    nombre: 'DINERO E INVENTARIO',
    peso: 16,
    subcategorias: [
      {
        id: 1,
        nombre: 'DINERO',
        items: [
          { id: 1, label: 'Arqueo de caja general $100.000', calificacion: null, novedad: '' },
          { id: 2, label: 'Arqueo de caja menor físico vs bitácora', calificacion: null, novedad: '' },
          { id: 3, label: 'Arqueo de caja fuerte vs bitácora', calificacion: null, novedad: '' },
          { id: 4, label: 'Los sobrantes si están siendo reportados?', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'CONSIGNACIONES',
        items: [
          { id: 1, label: 'Sin el uniforme', calificacion: null, novedad: '' },
          { id: 2, label: 'Organizan y cuentan el dinero en bodega', calificacion: null, novedad: '' },
          { id: 3, label: 'Cumplen con el proceso de enviar foto como mínimo a la 1pm, 4pm y al momento del cierre', calificacion: null, novedad: '' },
          { id: 4, label: 'Cumplen el proceso de enviar foto cada que se consigna?', calificacion: null, novedad: '' },
          { id: 5, label: 'Consignan todos los días en bancolombia y davivienda?', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 3,
        nombre: 'INVENTARIO',
        items: [
          { id: 1, label: 'Están cumpliendo con la meta de aleatorios semanal? Cuánto llevan?', calificacion: null, novedad: '' },
          { id: 2, label: 'Cuantos faltantes tienen validados por la administradora en lo que va del mes', calificacion: null, novedad: '' },
          { id: 3, label: 'Están llenando a tiempo la planilla para su respectivo informe', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 5,
    nombre: 'CARPETAS Y TEMAS GENERALES',
    peso: 10,
    subcategorias: [
      {
        id: 1,
        nombre: 'ADMINISTRATIVAS',
        items: [
          { id: 1, label: 'Carpetas de cierre financiero y kardex organizado sin tachones', calificacion: null, novedad: '' },
          { id: 2, label: 'Kardex actualizado con la información diaria, cuántas prendas tienen?', calificacion: null, novedad: '' },
          { id: 3, label: 'Están reportando el kardex por los grupos?', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'GENERAL',
        items: [
          { id: 1, label: 'Están haciendo el arqueo de caja al medio día', calificacion: null, novedad: '' },
          { id: 2, label: 'Última visita del jefe de zona (está yendo mes a mes)', calificacion: null, novedad: '' },
          { id: 3, label: 'Última visita de la visual cada cuánto va?', calificacion: null, novedad: '' },
          { id: 4, label: 'Están cumpliendo con los horarios establecidos', calificacion: null, novedad: '' },
          { id: 5, label: 'Las antenas están funcionando, baking, luces, ventiladores etc.', calificacion: null, novedad: '' },
          { id: 6, label: 'Tienen todos las pestañas abiertas en el computador de acuerdo al check list', calificacion: null, novedad: '' },
          { id: 7, label: 'Están reportando apertura, cierre por el grupo de CHICAS', calificacion: null, novedad: '' },
          { id: 8, label: 'Están revisando los bolsos al momento de cada salida?', calificacion: null, novedad: '' },
          { id: 9, label: 'Bolsos, monederas o canguros dentro de la bodega?', calificacion: null, novedad: '' },
          { id: 10, label: 'El personal está debidamente presentado con los lineamientos de la marca y GMCO', calificacion: null, novedad: '' },
          { id: 11, label: 'Tienen la dotación completa? Hace cuánto se les cambió?', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 6,
    nombre: 'CELULAR Y FUNCIONES',
    peso: 12,
    subcategorias: [
      {
        id: 1,
        nombre: 'CELULAR PERSONAL',
        items: [
          { id: 1, label: 'Asesoras con sus celulares dentro de los bolsos en la bodega', calificacion: null, novedad: '' },
          { id: 2, label: 'La administradora con su celular personal solo para su uso estrictamente laboral', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'CORPORATIVO',
        items: [
          { id: 1, label: 'Están subiendo estados diarios y a todas las plataformas?', calificacion: null, novedad: '' },
          { id: 2, label: 'Uso del celular corporativo para temas laborales', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 7,
    nombre: 'CUMPLIMIENTO A PROCESOS COMERCIALES',
    peso: 14,
    subcategorias: [
      {
        id: 1,
        nombre: 'SALUDO',
        items: [
          { id: 1, label: 'Saludo de bienvenida al cliente (buenos días, buenas tardes, en qué podemos asesor@r)', calificacion: null, novedad: '' },
          { id: 2, label: 'Están ofreciendo la campaña/promo del mes', calificacion: null, novedad: '' },
          { id: 3, label: 'Están ofreciendo el crédito?', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'ASESORÍA',
        items: [
          { id: 1, label: 'Asesoran bien al cliente con actitud y diligencia y estratégicamente para hacer venta complementaria', calificacion: null, novedad: '' },
          { id: 2, label: 'Verificar que un cliente al pagar recaudo, le recuerden el cupo que tiene disponible, y las nuevas llegadas para que se antoje', calificacion: null, novedad: '' },
          { id: 3, label: 'Revisar que estén despidiendo bien al cliente y no descuidarlo hasta el momento de salir de la tienda', calificacion: null, novedad: '' },
          { id: 4, label: 'Amabilidad en el punto de pago y recordando el crédito al cierre de la tienda', calificacion: null, novedad: '' },
          { id: 5, label: 'Se ofrece venta complementaria y venta cruzada', calificacion: null, novedad: '' },
        ]
      }
    ]
  },
  {
    id: 8,
    nombre: 'INDICADORES',
    peso: 16,
    subcategorias: [
      {
        id: 1,
        nombre: 'CONOCIMIENTO',
        items: [
          { id: 1, label: 'Tienen claro el presupuesto diario tanto venta como en crédito y de cada una?', calificacion: null, novedad: '' },
          { id: 2, label: 'Tienen claro las comisiones semanales y concurso del mes', calificacion: null, novedad: '' },
          { id: 3, label: 'Saben cuánto llevan de comisiones que se han ganado hasta la fecha?', calificacion: null, novedad: '' },
          { id: 4, label: 'Tienen abierto y entienden el archivo de ESTADO SEMANAL', calificacion: null, novedad: '' },
          { id: 5, label: 'Tienen claro los indicadores enviados a inicio de mes por gerencia', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 2,
        nombre: 'RESULTADOS',
        items: [
          { id: 1, label: 'Vamos cumpliendo el presupuesto del mes?', calificacion: null, novedad: '' },
          { id: 2, label: 'Estamos en el Top 7 del concurso del mes?', calificacion: null, novedad: '' },
          { id: 3, label: 'Vamos cumpliendo con el presupuesto de crédito del mes?', calificacion: null, novedad: '' },
          { id: 4, label: 'Van cumpliendo el UPF?', calificacion: null, novedad: '' },
          { id: 5, label: 'Van cumpliendo el VPF?', calificacion: null, novedad: '' },
          { id: 6, label: 'Están llevando control en un cuaderno sobre los informes enviados por la marca y PPTOS', calificacion: null, novedad: '' },
        ]
      },
      {
        id: 3,
        nombre: 'MEDICIÓN REDES Y ESTADOS',
        items: [
          { id: 1, label: 'Si están subiendo estados al whatsapp', calificacion: null, novedad: '' },
          { id: 2, label: 'Tienen publicación diaria en Facebook e Instagram', calificacion: null, novedad: '' },
          { id: 3, label: 'Cuántos estados subidos al día en IG-FB', calificacion: null, novedad: '' },
          { id: 4, label: 'Gestión de respuestas en bandeja de mensajes de Whatsapp', calificacion: null, novedad: '' },
          { id: 5, label: 'Están siendo creativas al momento de subir estados y publicaciones', calificacion: null, novedad: '' },
          { id: 6, label: 'Gestión de respuestas en bandeja de mensajes de FB e IG y Whatsapp', calificacion: null, novedad: '' },
        ]
      }
    ]
  }
];

const Audit = () => {
  const [categories, setCategories] = useState(initialCategories);
  // Estado para navegación de pestañas
  const [step, setStep] = useState(1);

  // Estado para los cuadros de texto de la segunda pestaña
  const [extraNotes, setExtraNotes] = useState({
    personal: '',
    campanasTienda: '',
    locativos: '',
    conclusiones: ''
  });

  // Estado para imágenes del checklist final
  const checklistImages = [
    'Fachada',
    'Campaña y promociones',
    'General de la tienda por los lados',
    'Punto de pago',
    'Vestier',
    'Implementos de aseo',
    'Bodegas',
    'Personal de la tienda',
    'Libro verde y carpetas',
    'Cuaderno de seguimiento de pptos e informes de la marca'
  ];
  // Permitir múltiples imágenes por item
  const [uploadedChecklistImages, setUploadedChecklistImages] = useState<{[key: string]: string[]}>({});

  // Maneja cambios en los cuadros de texto
  const handleExtraNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setExtraNotes(prev => ({ ...prev, [name]: value }));
  };

  // Maneja subida de imágenes del checklist final
  const handleChecklistImageChange = (label: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages: string[] = [];
    let loaded = 0;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = (e.target && (e.target as FileReader).result) || null;
        if (result) {
          newImages.push(result as string);
        }
        loaded++;
        // Cuando todas las imágenes estén cargadas, actualiza el estado
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

  // Estado para datos de auditoría
  const [auditInfo, setAuditInfo] = useState({
    nombreAuditor: '',
    tienda: '',
    fecha: '',
    quienesReciben: ''
  });
  const [auditInfoSaved, setAuditInfoSaved] = useState(false);

  // Maneja cambios en el formulario de datos
  const handleAuditInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAuditInfo(prev => ({ ...prev, [name]: value }));
  };

  // Maneja guardar datos de auditoría
  const handleAuditInfoSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditInfoSaved(true);
  };


  // Cambia la calificación de un ítem (chulo = 100, x = 0)
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

  // Cambia la novedad de un ítem
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

  // Calcula el puntaje total de la subcategoría (promedio de chulos/x)
  const getSubcategoriaTotal = (subcat: Subcategoria) => {
    const calificados = subcat.items.filter(item => item.calificacion !== null);
    if (calificados.length === 0) return 0;
    const sum = calificados.reduce((acc, item) => acc + (item.calificacion || 0), 0);
    return sum / calificados.length;
  };


  // Calcula el promedio de las subcategorías para la categoría principal (escala 1-100)
  const getCategoriaPromedio = (cat: Categoria) => {
    if (!cat.subcategorias.length) return 0;
    const sum = cat.subcategorias.reduce((acc, subcat) => acc + getSubcategoriaTotal(subcat), 0);
    return sum / cat.subcategorias.length;
  };

  // Calificación total de la tienda (promedio ponderado de las categorías)
  const getCalificacionTotalTienda = () => {
    const totalPeso = categories.reduce((acc, cat) => acc + cat.peso, 0);
    if (totalPeso === 0) return 0;
    const sum = categories.reduce((acc, cat) => acc + (getCategoriaPromedio(cat) * cat.peso), 0);
    return sum / totalPeso;
  };

  return (
    <div className="p-6 mt-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auditoría de Tienda</h1>
  {!auditInfoSaved ? (
        <form className="bg-white border rounded-lg shadow-sm p-6 mb-8" onSubmit={handleAuditInfoSave}>
          <h2 className="text-lg font-bold mb-4 text-primary-600">Datos de la auditoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de quien realiza la auditoría</label>
              <input type="text" name="nombreAuditor" value={auditInfo.nombreAuditor} onChange={handleAuditInfoChange} required className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tienda</label>
              <input type="text" name="tienda" value={auditInfo.tienda} onChange={handleAuditInfoChange} required className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" name="fecha" value={auditInfo.fecha} onChange={handleAuditInfoChange} required className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quienes reciben la auditoría</label>
              <input type="text" name="quienesReciben" value={auditInfo.quienesReciben} onChange={handleAuditInfoChange} required className="w-full border rounded px-2 py-1" />
            </div>
          </div>
          <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded font-semibold">Guardar y continuar</button>
        </form>
      ) : (
        <>
          {/* Navegación de pasos */}
          <div className="flex gap-2 mb-6">
            <button className={`px-4 py-2 rounded font-semibold ${step === 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`} onClick={() => setStep(1)}>Auditoría</button>
            <button className={`px-4 py-2 rounded font-semibold ${step === 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`} onClick={() => setStep(2)}>Notas y conclusiones</button>
            <button className={`px-4 py-2 rounded font-semibold ${step === 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'}`} onClick={() => setStep(3)}>Checklist de imágenes</button>
          </div>

          {/* Paso 1: Auditoría */}
          {step === 1 && (
            <>
              <div className="mb-4">
                <span className="font-semibold text-lg">Calificación total de la tienda: </span>
                <span className="text-2xl font-bold text-primary-600">{getCalificacionTotalTienda().toFixed(2)} / 100</span>
              </div>
              <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                <h2 className="text-md font-bold text-primary-700 mb-2">Datos de la auditoría</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="font-semibold">Auditor:</span> {auditInfo.nombreAuditor}</div>
                  <div><span className="font-semibold">Tienda:</span> {auditInfo.tienda}</div>
                  <div><span className="font-semibold">Fecha:</span> {auditInfo.fecha}</div>
                  <div><span className="font-semibold">Quienes reciben:</span> {auditInfo.quienesReciben}</div>
                </div>
              </div>
              <p className="text-gray-600 mb-6">Checklist por categorías y subcategorías. Califica cada ítem con ✔️ o ❌, agrega novedades y revisa el puntaje total por subcategoría, el promedio de la categoría principal y la calificación total de la tienda.</p>
              {categories.map(cat => (
                <div key={cat.id} className="mb-10 border rounded-lg shadow-sm bg-white">
                  <div className="flex items-center justify-between bg-purple-100 px-4 py-2 rounded-t-lg">
                    <h2 className="text-lg font-bold text-purple-800">
                      {cat.nombre}
                      <span className="ml-3 text-sm font-semibold text-purple-600">(Peso: {cat.peso})</span>
                    </h2>
                    <div className="text-right">
                      <span className="font-semibold">Promedio categoría: </span>
                      <span className="text-xl font-bold text-primary-600">{getCategoriaPromedio(cat).toFixed(2)} / 100</span>
                    </div>
                  </div>
                  {cat.subcategorias.map(subcat => (
                    <div key={subcat.id} className="mb-6">
                      <div className="flex items-center justify-between bg-gray-100 px-3 py-1 rounded-t">
                        <h3 className="text-md font-semibold text-gray-700">{subcat.nombre}</h3>
                        <div className="text-right">
                          <span className="font-semibold">Total subcategoría: </span>
                            <span className="text-md font-bold text-primary-600">{getSubcategoriaTotal(subcat).toFixed(2)}</span>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Ítem</th>
                            <th className="p-2 text-center">Calificación</th>
                            <th className="p-2 text-center">Novedad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subcat.items.map(item => (
                            <tr key={item.id} className="border-b">
                              <td className="p-2">{item.label}</td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleCalificacionChange(cat.id, subcat.id, item.id, 100)}
                                    className={`px-2 py-1 rounded border ${item.calificacion === 100 ? 'bg-green-200 border-green-500' : 'bg-white border-gray-300'}`}
                                    title="Cumple"
                                  >
                                    ✔️
                                  </button>
                                  <button
                                    onClick={() => handleCalificacionChange(cat.id, subcat.id, item.id, 0)}
                                    className={`px-2 py-1 rounded border ${item.calificacion === 0 ? 'bg-red-200 border-red-500' : 'bg-white border-gray-300'}`}
                                    title="No cumple"
                                  >
                                    ❌
                                  </button>
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="text"
                                  value={item.novedad}
                                  onChange={e => handleNovedadChange(cat.id, subcat.id, item.id, e.target.value)}
                                  className="w-48 border rounded px-2 py-1"
                                  placeholder="Observaciones o novedades"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-end mt-6">
                <button className="bg-primary-600 text-white px-4 py-2 rounded font-semibold" onClick={() => setStep(2)}>Siguiente</button>
              </div>
            </>
          )}

          {/* Paso 2: Cuadros de texto */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-bold mb-4 text-primary-600">Notas y conclusiones</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal</label>
                  <textarea name="personal" value={extraNotes.personal} onChange={handleExtraNotesChange} rows={4} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campañas y tienda en general, temas locativos</label>
                  <textarea name="campanasTienda" value={extraNotes.campanasTienda} onChange={handleExtraNotesChange} rows={4} className="w-full border rounded px-2 py-1" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conclusiones</label>
                  <textarea name="conclusiones" value={extraNotes.conclusiones} onChange={handleExtraNotesChange} rows={4} className="w-full border rounded px-2 py-1" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="bg-primary-600 text-white px-4 py-2 rounded font-semibold" onClick={() => setStep(3)}>Siguiente</button>
              </div>
            </>
          )}

          {/* Paso 3: Checklist de imágenes */}
          {step === 3 && (
            <>
              <h2 className="text-lg font-bold mb-4 text-primary-600">Checklist de imágenes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {checklistImages.map(label => (
                  <div key={label} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={e => handleChecklistImageChange(label, e.target.files)}
                      className="mb-2"
                    />
                    {uploadedChecklistImages[label] && (
                      <div className="flex flex-wrap gap-2">
                        {uploadedChecklistImages[label].map((src, idx) => (
                          <img key={idx} src={src} alt={`${label} ${idx + 1}`} className="w-32 h-32 object-cover rounded border" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Audit;
