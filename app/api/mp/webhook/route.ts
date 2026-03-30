// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('MP Webhook received:', JSON.stringify(body))

    const { type, data } = body

    if (type !== 'subscription_preapproval') {
      return NextResponse.json({ received: true })
    }

    const subscriptionId = data?.id
    if (!subscriptionId) {
      return NextResponse.json({ received: true })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${subscriptionId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!mpResponse.ok) {
      console.error('Error consultando MP:', await mpResponse.text())
      return NextResponse.json({ received: true })
    }

    const subscription = await mpResponse.json()
    console.log('Subscription status:', subscription.status, 'external_ref:', subscription.external_reference)

    const supabase = createClient()
    const adminId = subscription.external_reference

    if (!adminId) {
      return NextResponse.json({ received: true })
    }

    if (subscription.status === 'authorized') {
      await supabase
        .from('perfiles')
        .update({
          plan: 'pro',
          mp_subscription_id: subscriptionId,
          plan_updated_at: new Date().toISOString(),
        })
        .eq('id', adminId)

      console.log(`✅ Plan PRO activado para admin: ${adminId}`)
    } else if (
      subscription.status === 'cancelled' ||
      subscription.status === 'paused'
    ) {
      await supabase
        .from('perfiles')
        .update({
          plan: 'free',
          plan_updated_at: new Date().toISOString(),
        })
        .eq('id', adminId)

      console.log(`⚠️ Plan bajado a FREE para admin: ${adminId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true })
  }
}
