// @ts-nocheck
// app/api/mp/crear-pago/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const COMISION_FREE = 0.08
const COMISION_PRO  = 0.05

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { alumnoId, adminId } = await req.json()
    if (!alumnoId || !adminId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // ── 1. VERIFICAR AUTH — client anon del alumno ──
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (user.id !== alumnoId) {
      console.error(`Intento no autorizado: user ${user.id} como alumno ${alumnoId}`)
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
    }

    // ── 2. LEER DATOS — service role ──
    const db = getServiceClient()

    const { data: alumno } = await db
      .from('perfiles')
      .select('email, precio_mensual, admin_id')
      .eq('id', alumnoId)
      .eq('rol', 'alumno')
      .single()

    if (!alumno) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
    if (alumno.admin_id !== adminId) {
      console.error(`adminId manipulado: alumno ${alumnoId} → admin real ${alumno.admin_id}`)
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
    }
    if (!alumno.precio_mensual) return NextResponse.json({ error: 'Precio no definido' }, { status: 400 })

    const { data: admin } = await db
      .from('perfiles')
      .select('plan, cobros_activos, brand_name, mp_cobros_user_id')
      .eq('id', adminId)
      .eq('rol', 'admin')
      .single()

    if (!admin) return NextResponse.json({ error: 'Admin no encontrado' }, { status: 404 })
    if (!admin.cobros_activos) return NextResponse.json({ error: 'Cobros no activos' }, { status: 400 })
    if (!admin.mp_cobros_user_id) return NextResponse.json({ error: 'MP no conectado' }, { status: 400 })

    // ── 3. LEER TOKEN DESDE VAULT (encriptado) ──
    const { data: tokenRow } = await db
      .from('mp_tokens')
      .select('secret_id')
      .eq('admin_id', adminId)
      .single()

    if (!tokenRow?.secret_id) {
      return NextResponse.json({ error: 'Token MP no encontrado' }, { status: 400 })
    }

    const { data: secrets } = await db
      .from('vault.decrypted_secrets')
      .select('decrypted_secret')
      .eq('id', tokenRow.secret_id)
      .single()

    if (!secrets?.decrypted_secret) {
      return NextResponse.json({ error: 'No se pudo leer el token MP' }, { status: 500 })
    }

    const mpAccessToken = secrets.decrypted_secret

    // ── 4. CREAR PREFERENCIA EN MP ──
    const monto = alumno.precio_mensual
    const comisionPct = admin.plan === 'pro' ? COMISION_PRO : COMISION_FREE
    const comisionMonto = Math.round(monto * comisionPct)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpulseapp.lat'

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify({
        items: [{ title: `Cuota mensual — ${admin.brand_name || 'Pulse'}`, quantity: 1, unit_price: monto, currency_id: 'ARS' }],
        payer: { email: alumno.email },
        marketplace_fee: comisionMonto,
        back_urls: {
          success: `${appUrl}/dashboard?pago=ok`,
          failure: `${appUrl}/dashboard?pago=error`,
          pending: `${appUrl}/dashboard?pago=pendiente`,
        },
        auto_return: 'approved',
        external_reference: `${alumnoId}|${adminId}`,
        notification_url: `${appUrl}/api/mp/webhook-pago`,
      }),
    })

    const mpData = await mpRes.json()
    if (!mpRes.ok) return NextResponse.json({ error: mpData.message || 'Error MP' }, { status: 400 })

    // ── 5. REGISTRAR PAGO ──
    await db.from('pagos').insert({
      alumno_id: alumnoId,
      admin_id: adminId,
      monto,
      monto_neto: monto - comisionMonto,
      comision_pulse: comisionMonto,
      mp_preference_id: mpData.id,
      estado: 'pendiente',
    })

    return NextResponse.json({
      init_point: mpData.init_point,
      monto,
      comision: comisionMonto,
      monto_neto: monto - comisionMonto,
    })

  } catch (error) {
    console.error('Error crear-pago:', (error as Error).message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
