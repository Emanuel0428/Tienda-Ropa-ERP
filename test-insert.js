// Test básico para insertar en auditorías
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uxaptaqlitjadihvyivp.supabase.co'
const supabaseKey = 'tu-anon-key-aquí' // Reemplaza con tu clave

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('🧪 Probando insert básico...')
  
  const testId = Math.floor(Date.now() / 1000)
  
  try {
    const { data, error } = await supabase
      .from('auditorias')
      .insert({
        id_auditoria: testId,
        id_tienda: 1,
        id_auditor: '03bf4ba5-4ddc-44ee-b3fa-684336bf283a',
        fecha: '2025-09-23',
        quienes_reciben: 'test',
        estado: 'en_progreso'
      })
      .select()
    
    console.log('✅ Resultado:', { data, error })
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testInsert()