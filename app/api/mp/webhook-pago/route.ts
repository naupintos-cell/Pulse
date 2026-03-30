// @ts-nocheck
// app/api/mp/webhook-pago/route.ts — CON VERIFICACIÓN DE FIRMA HMAC
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createHmac } from 'crypto'

function verificarFirmaMP(req: NextRequest, urlParams: URLSearchParams): boolean {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET
    if (!secret) {
      console.warn('⚠️ MP_WEBHOOK_SECRET no configurado')
      return true
    }

    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    const dataId = urlParams.get('data.id') || urlParams.get('id')

    if (!xSignature || !xRequestId) { console.warn('Webhook sin firma'); return false }

    const parts: Record<string, string> = {}
    xSignature.split(',').forEach(part => {
      const [k, v] = part.split('=')
      if (k && v) parts[k.trim()] = v.trim()
    })

    const ts = parts['ts']
    const v1 = parts['v1']
    if (!ts || !v1) return false

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const expected = createHmac('sha256', secret).update(manifest).digest('hex')

    if (v1.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < v1.length; i++) diff |= v1.charCodeAt(i) ^ expected.charCodeAt(i)
    if (diff !== 0) { console.error('Firma inválida'); return false }
    if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts)) > 300) {
      console.error('Timestamp expirado'); return false
    }
    return true
  } catch (err) {
    console.error('Error verificando firma:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const urlParams = new URL(req.url).searchParams
    const rawBody = await req.text()

    if (!verificarFirmaMP(req, urlParams)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    let body: any
    try { body = JSON.parse(rawBody) }
    catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const { type, data } = body
    if (type !== 'payment') return NextResponse.json({ received: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ received: true })

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
    )
    if (!mpRes.ok) return NextResponse.json({ received: true })

    const payment = await mpRes.json()
    const externalRef = payment.external_reference
    if (!externalRef?.includes('|')) return NextResponse.json({ received: true })

    const [alumnoId, adminId] = externalRef.split('|')

    const supabase = createClient()
    const { data: pago } = await supabase
      .from('pagos')
      .select('id, estado')
      .eq('alumno_id', alumnoId)
      .eq('admin_id', adminId)
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!pago) return NextResponse.json({ received: true })

    const estado = payment.status === 'approved' ? 'aprobado'
      : payment.status === 'rejected' ? 'rechazado'
      : 'pendiente'

    await supabase
      .from('pagos')
      .update({ estado, mp_payment_id: String(paymentId) })
      .eq('id', pago.id)

    console.log(`Pago actualizado — estado: ${estado}`)
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', (error as Error).message)
    return NextResponse.json({ received: true })
  }
}
