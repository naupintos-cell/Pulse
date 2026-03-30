// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { adminId, email, nombre, descuento } = await req.json()

    if (!adminId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'MP no configurado' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpulseapp.lat'

    // Precio base en ARS
    const precioBase = 25000
    const precioFinal = descuento ? Math.round(precioBase * (1 - descuento / 100)) : precioBase

    const reason = descuento
      ? `Pulse PRO — Plan mensual (${descuento}% OFF)`
      : 'Pulse PRO — Plan mensual'

    // No mandamos payer_email — MP lo pide en el checkout directamente
    // Evita el error "Cannot operate between different countries"
    const subscriptionData = {
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: precioFinal,
        currency_id: 'ARS',
      },
      back_url: `${appUrl}/admin/upgrade/success`,
      external_reference: adminId,
    }

    console.log('Creando suscripción MP:', JSON.stringify(subscriptionData))

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscriptionData),
    })

    const mpData = await mpResponse.json()
    console.log('MP Response:', JSON.stringify(mpData))

    if (!mpResponse.ok) {
      console.error('MP Error:', mpData)
      return NextResponse.json(
        { error: mpData.message || 'Error al crear suscripción' },
        { status: 400 }
      )
    }

    // Guardar subscription_id en Supabase
    const supabase = createClient()
    await supabase
      .from('perfiles')
      .update({
        mp_subscription_id: mpData.id,
        plan_updated_at: new Date().toISOString(),
      })
      .eq('id', adminId)

    return NextResponse.json({
      init_point: mpData.init_point,
      subscription_id: mpData.id,
      precio_final: precioFinal,
      descuento: descuento || 0,
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
