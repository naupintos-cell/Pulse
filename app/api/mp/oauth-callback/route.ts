// @ts-nocheck
// app/api/mp/oauth-callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpulseapp.lat'

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
  }

  try {
    // ── 1. VALIDAR STATE ──
    let adminId: string
    let ts: number
    try {
      const decoded = JSON.parse(atob(state))
      adminId = decoded.adminId
      ts = decoded.ts
    } catch {
      return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
    }

    if (!adminId) return NextResponse.redirect(`${appUrl}/admin?cobros=error`)

    // Verificar que el state no expiró (30 minutos)
    if (Date.now() - ts > 30 * 60 * 1000) {
      return NextResponse.redirect(`${appUrl}/admin?cobros=expired`)
    }

    // ── 2. VERIFICAR QUE EL ADMIN EXISTE ──
    const db = getServiceClient()
    const { data: adminPerfil } = await db
      .from('perfiles')
      .select('id, rol')
      .eq('id', adminId)
      .eq('rol', 'admin')
      .single()

    if (!adminPerfil) {
      console.error(`OAuth callback: admin no encontrado ${adminId}`)
      return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
    }

    // ── 3. INTERCAMBIAR CODE POR TOKEN EN MP ──
    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_secret: process.env.MP_ACCESS_TOKEN,
        client_id: process.env.NEXT_PUBLIC_MP_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${appUrl}/api/mp/oauth-callback`,
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.access_token) {
      console.error('OAuth MP error:', res.status)
      return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
    }

    // ── 4. GUARDAR TOKEN EN VAULT (encriptado) ──
    // Verificar si ya existe un token para este admin
    const { data: existingToken } = await db
      .from('mp_tokens')
      .select('secret_id')
      .eq('admin_id', adminId)
      .single()

    if (existingToken?.secret_id) {
      // Actualizar secret existente en Vault
      await db.rpc('vault.update_secret', {
        secret_id: existingToken.secret_id,
        new_secret: data.access_token,
      })
    } else {
      // Crear nuevo secret en Vault
      const { data: secretId } = await db.rpc('vault.create_secret', {
        secret: data.access_token,
        name: `mp_token_${adminId}`,
      })

      // Guardar referencia en mp_tokens
      await db.from('mp_tokens').upsert({
        admin_id: adminId,
        secret_id: secretId,
      })
    }

    // ── 5. ACTUALIZAR PERFIL sin el token (solo metadatos) ──
    const { error: updateError } = await db
      .from('perfiles')
      .update({
        mp_cobros_user_id: String(data.user_id),
        cobros_activos: true,
      })
      .eq('id', adminId)
      .eq('rol', 'admin')

    if (updateError) {
      console.error('Error actualizando perfil MP:', updateError.message)
      return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
    }

    return NextResponse.redirect(`${appUrl}/admin?cobros=ok`)

  } catch (error) {
    console.error('OAuth callback error:', (error as Error).message)
    return NextResponse.redirect(`${appUrl}/admin?cobros=error`)
  }
}
