import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  try {
    const body = await req.json()
    const { dni } = body

    // Validar que el DNI tenga formato correcto (solo números, 7-12 dígitos)
    if (!dni || typeof dni !== 'string' || !/^\d{7,12}$/.test(dni)) {
      // Mismo mensaje genérico — no revela si el DNI existe o no
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // Usar service_role para bypasear RLS de forma segura server-side
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('perfiles')
      .select('email, rol') // ⚠️ Solo email y rol — nunca devuelve DNI ni id
      .eq('dni', dni)
      .single()

    if (error || !data?.email) {
      // Mismo mensaje genérico — no revela si el DNI existe o no
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    return new Response(JSON.stringify({ email: data.email, rol: data.rol }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})
