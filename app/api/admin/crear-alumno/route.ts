// @ts-nocheck
// app/api/admin/crear-alumno/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, apellido, dni, email, password, adminId } = body

    // ── 1. VALIDACIÓN — solo campos mínimos ──
    if (!nombre?.trim() || !apellido?.trim()) {
      return NextResponse.json({ error: 'Nombre y apellido son obligatorios' }, { status: 400 })
    }
    if (!dni || !/^\d{7,8}$/.test(dni.trim())) {
      return NextResponse.json({ error: 'DNI inválido — debe tener 7 u 8 dígitos' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }
    if (!adminId) {
      return NextResponse.json({ error: 'adminId requerido' }, { status: 400 })
    }

    // ── 2. VERIFICAR AUTH ──
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (user.id !== adminId) {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
    }

    const { data: adminPerfil } = await supabase
      .from('perfiles')
      .select('id, rol, plan')
      .eq('id', adminId)
      .eq('rol', 'admin')
      .single()

    if (!adminPerfil) {
      return NextResponse.json({ error: 'Admin no encontrado' }, { status: 403 })
    }

    // ── 3. VERIFICAR LÍMITE DE ALUMNOS ──
    const { count } = await supabase
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', adminId)
      .eq('rol', 'alumno')

    const limite = adminPerfil.plan === 'pro' ? Infinity : 2
    if ((count || 0) >= limite) {
      return NextResponse.json({
        error: 'Límite de 2 alumnos en plan FREE. Actualizá a PRO para agregar más.'
      }, { status: 403 })
    }

    // ── 4. VERIFICAR DNI ÚNICO ──
    const { data: dniExistente } = await supabase
      .from('perfiles')
      .select('id')
      .eq('dni', dni.trim())
      .maybeSingle()

    if (dniExistente) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese DNI' }, { status: 409 })
    }

    // ── 5. CREAR USUARIO ──
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (createError) {
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // ── 6. CREAR PERFIL — solo datos mínimos, el alumno completa el resto ──
    const { error: perfilError } = await adminSupabase
      .from('perfiles')
      .insert({
        id: newUser.user!.id,
        rol: 'alumno',
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.trim(),
        admin_id: adminId,
        nivel: 'Principiante',
      })

    if (perfilError) {
      await adminSupabase.auth.admin.deleteUser(newUser.user!.id)
      return NextResponse.json({ error: 'Error creando perfil' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId: newUser.user!.id })

  } catch (error) {
    console.error('Error crear-alumno:', (error as Error).message)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
