import { Categoria } from '../types/audit';

export const initialCategories: Categoria[] = [
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

export const checklistImages = [
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
