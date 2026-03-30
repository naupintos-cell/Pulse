// @ts-nocheck
'use client'
// app/admin/page.tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Perfil, Plan, Asignacion } from '@/types/database'
import { RoutineDayEditor } from '@/components/routines/RoutineDayEditor'
import { SoporteChat } from '@/components/SoporteChat'
import { useBrand, applyBrandCSS } from '@/hooks/useBrand'

type Tab = 'dashboard' | 'alumnos' | 'ficha' | 'planes' | 'builder' | 'ayuda'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const { brand, loadBrand } = useBrand()

  const [tab, setTab]               = useState<Tab>('dashboard')
  const [loading, setLoading]       = useState(true)
  const [admin, setAdmin]           = useState<Perfil | null>(null)
  const [alumnos, setAlumnos]       = useState<Perfil[]>([])
  const [planes, setPlanes]         = useState<Plan[]>([])
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [alumnoActivo, setAlumnoActivo] = useState<Perfil | null>(null)
  const [searchQ, setSearchQ]       = useState('')
  const [toast, setToast]           = useState('')
  const [bp, setBp] = useState<any>(null)
  // ✅ Modal simplificado — solo 5 campos
  const [showAddAlumno, setShowAddAlumno] = useState(false)
  const [newA, setNewA] = useState({ nombre:'', apellido:'', dni:'', email:'', password:'' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [diaEditorActivo, setDiaEditorActivo] = useState<{id: string, nombre: string, numero: number} | null>(null)
  const [bloquesConteo, setBloquesConteo] = useState<Record<string, number>>({})
  const [savingPrecio, setSavingPrecio] = useState(false)
  const [precioInput, setPrecioInput] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autosaveTimer = useRef<any>(null)

  // ── WIZARD ONBOARDING ──
  const [showWizard, setShowWizard]         = useState(false)
  const [wizardStep, setWizardStep]         = useState(1)
  const [wizardLoading, setWizardLoading]   = useState(false)
  const [wizardAlumno, setWizardAlumno]     = useState({ nombre:'', apellido:'', dni:'', email:'', password:'' })
  const [wizardAlumnoId, setWizardAlumnoId] = useState<string | null>(null)
  const [wizardPlan, setWizardPlan]         = useState<any>(null)
  const [wizardError, setWizardError]       = useState('')
  const [confetti, setConfetti]             = useState(false)

  useEffect(() => { loadData() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function track(event: string, params?: Record<string, any>) {
    try { sendGAEvent('event', event, params || {}) } catch(e) {}
  }

  const autosavePlan = useCallback(async (planData: any) => {
    if (!planData.nombre || planData.nombre.trim().length < 2) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        if (planData.id) {
          await supabase.from("planes").update({ nombre: planData.nombre, objetivo: planData.objetivo }).eq("id", planData.id)
        } else {
          const { data: newPlan } = await supabase.from("planes").insert({ nombre: planData.nombre, objetivo: planData.objetivo, admin_id: admin!.id }).select().single()
          if (newPlan) {
            const semanaPromises = planData.semanas.map(async (sem: any) => {
              const { data: semData } = await supabase.from("semanas").insert({ plan_id: newPlan.id, numero: sem.numero }).select().single()
              return { ...sem, id: semData!.id }
            })
            const semsConId = await Promise.all(semanaPromises)
            setBp((prev: any) => ({ ...prev, id: newPlan.id, semanas: semsConId }))
          }
        }
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch (e) { setSaveStatus("idle") }
    }, 1000)
  }, [admin, supabase])

  // ✅ Guarda el plan silenciosamente en DB cuando se agrega el primer día
  // Así el trainer puede agregar ejercicios sin hacer click en Guardar primero
  async function guardarPlanSilencioso(currentBp: any, semId: string, dia: string, orden: number): Promise<{planId: string, semId: string, diaId: string} | null> {
    try {
      let planId = currentBp.id
      let semanaId = semId

      // 1. Si el plan no existe, crearlo
      if (!planId) {
        const nombre = currentBp.nombre?.trim() || 'Nuevo plan'
        const { data: newPlan } = await supabase
          .from('planes')
          .insert({ nombre, objetivo: currentBp.objetivo, admin_id: admin!.id })
          .select().single()
        if (!newPlan) return null
        planId = newPlan.id
      }

      // 2. Si la semana no existe, crearla
      if (!semanaId || semanaId.startsWith('tmp')) {
        const semNum = currentBp.semanas.find((s: any) => s.id === semId)?.numero || 1
        const { data: newSem } = await supabase
          .from('semanas')
          .insert({ plan_id: planId, numero: semNum })
          .select().single()
        if (!newSem) return null
        semanaId = newSem.id
      }

      // 3. Crear el día
      const { data: newDia } = await supabase
        .from('dias')
        .insert({ semana_id: semanaId, dia, tipo: '', orden })
        .select().single()
      if (!newDia) return null

      return { planId, semId: semanaId, diaId: newDia.id }
    } catch(e) {
      return null
    }
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', user.id).single() as any
    if (!p || p.rol !== 'admin') { router.push('/dashboard'); return }
    setAdmin(p)
    loadBrand(p.id)
    // ✅ Mostrar wizard si es primera vez
    if (!p.onboarding_completo) {
      setWizardPlan({ id: null, nombre: '', objetivo: 'Bajar de peso', semanas: [{ id: 'tmp-sem-1', numero: 1, dias: [] }], asignados: [] })
      setShowWizard(true)
    }
    const { data: as } = await supabase.from('perfiles').select('*').eq('rol', 'alumno').eq('admin_id', p.id).order('nombre')
    setAlumnos(as || [])
    const { data: ps } = await supabase
      .from('planes')
      .select(`id, nombre, objetivo, created_at, semanas(id, numero, dias(id, dia, tipo, orden, ejercicios(id, nombre, series, repeticiones, carga, descanso, rpe, rir, observaciones)))`)
      .eq('admin_id', p.id)
      .order('created_at', { ascending: false })
    setPlanes(ps || [])
    const planIds = (ps || []).map((plan: any) => plan.id)
    if (planIds.length > 0) {
      const { data: asigs } = await supabase.from('asignaciones').select('*').eq('activo', true).in('plan_id', planIds)
      setAsignaciones(asigs || [])
    } else {
      setAsignaciones([])
    }
    setLoading(false)
  }

  function getPlanAlumno(alumnoId: string) {
    const asig = asignaciones.find(a => a.alumno_id === alumnoId)
    return asig ? planes.find(p => p.id === asig.plan_id) : null
  }

  // ✅ Ficha completa = tiene objetivo cargado
  function fichaCompleta(alumno: any) {
    return !!(alumno.objetivo && alumno.objetivo.trim().length > 0)
  }

  async function asignarPlan(alumnoId: string, planId: string | null) {
    await supabase.from('asignaciones').delete().eq('alumno_id', alumnoId)
    if (planId) await supabase.from('asignaciones').insert({ alumno_id: alumnoId, plan_id: planId, activo: true })
    await loadData()
    showToast(planId ? '✅ Plan asignado' : '✅ Plan removido')
  }

  async function crearAlumno() {
    if (!newA.nombre || !newA.apellido || !newA.dni || !newA.email) {
      showToast('⚠️ Completá nombre, apellido, DNI y email'); return
    }
    if (!/^\d{7,8}$/.test(newA.dni)) { showToast('⚠️ DNI inválido'); return }
    if (!newA.password || newA.password.length < 6) {
      showToast('⚠️ La contraseña debe tener al menos 6 caracteres'); return
    }
    const res = await fetch('/api/admin/crear-alumno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newA, adminId: admin!.id })
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 403 && data.error?.includes('Límite')) {
        showToast('⚠️ Límite de 2 alumnos en plan FREE')
        setTimeout(() => router.push('/admin/upgrade'), 1500)
        return
      }
      showToast('⚠️ ' + data.error)
      return
    }
    setShowAddAlumno(false)
    setNewA({ nombre:'', apellido:'', dni:'', email:'', password:'' })
    showToast('✅ Alumno/a creado/a — pedile que complete su ficha')
    // Analytics
    track('athlete_created', { total_athletes: alumnos.length + 1, is_first: alumnos.length === 0 })
    if (alumnos.length === 0) track('first_athlete_created')
    loadData()
  }

  // ── WIZARD FUNCTIONS ──
  function wizardUid() { return 'tmp-' + Date.now().toString(36) + Math.random().toString(36).slice(2) }

  async function wizardCrearAtleta() {
    setWizardError('')
    const { nombre, apellido, dni, email, password } = wizardAlumno
    if (!nombre || !apellido || !dni || !email || !password) {
      setWizardError('Completá todos los campos'); return
    }
    if (!/^\d{7,8}$/.test(dni)) { setWizardError('DNI inválido — 7 u 8 dígitos'); return }
    if (password.length < 6) { setWizardError('La contraseña debe tener al menos 6 caracteres'); return }
    setWizardLoading(true)
    const res = await fetch('/api/admin/crear-alumno', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...wizardAlumno, adminId: admin!.id })
    })
    const data = await res.json()
    setWizardLoading(false)
    if (!res.ok) { setWizardError(data.error || 'Error al crear el atleta'); return }
    setWizardAlumnoId(data.userId)
    setWizardPlan((p: any) => ({ ...p, asignados: [data.userId] }))
    setWizardStep(2)
  }

  async function wizardGuardarPlan() {
    setWizardError('')
    if (!wizardPlan.nombre) { setWizardError('Poné un nombre al plan'); return }
    const totalDias = wizardPlan.semanas.reduce((a: number, s: any) => a + s.dias.length, 0)
    if (!totalDias) { setWizardError('Seleccioná al menos 1 día de entrenamiento'); return }
    setWizardLoading(true)
    // Crear plan
    const { data: newPlan } = await supabase.from('planes').insert({ nombre: wizardPlan.nombre, objetivo: wizardPlan.objetivo, admin_id: admin!.id }).select().single()
    if (!newPlan) { setWizardError('Error al crear el plan'); setWizardLoading(false); return }
    // Crear semanas y días (ejercicios se agregan después via bloques)
    for (const sem of wizardPlan.semanas) {
      const { data: semData } = await supabase.from('semanas').insert({ plan_id: newPlan.id, numero: sem.numero }).select().single()
      if (!semData) continue
      for (const dia of sem.dias) {
        await supabase.from('dias').insert({ semana_id: semData.id, dia: dia.dia, tipo: dia.tipo || '', orden: dia.orden || 0 })
      }
    }
    // Asignar al atleta del paso 1
    if (wizardAlumnoId) {
      await supabase.from('asignaciones').insert({ alumno_id: wizardAlumnoId, plan_id: newPlan.id, activo: true })
    }
    setWizardLoading(false)
    setWizardStep(3)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3500)
  }

  async function wizardFinalizar() {
    await supabase.from('perfiles').update({ onboarding_completo: true }).eq('id', admin!.id)
    // Analytics
    track('onboarding_complete', {
      created_athlete: !!wizardAlumnoId,
      created_plan: !!wizardPlan?.nombre,
    })
    setShowWizard(false)
    setWizardStep(1)
    loadData()
  }

  async function wizardOmitirPlan() {
    setWizardStep(3)
    setConfetti(true)
    setTimeout(() => setConfetti(false), 3500)
  }

  async function guardarPlan() {
    if (!bp.nombre) { showToast('⚠️ El plan necesita un nombre'); return }
    const totalDias = bp.semanas.reduce((a: number, s: any) => a + s.dias.length, 0)
    if (!totalDias) { showToast('⚠️ Agregá al menos 1 día de entrenamiento'); return }
    let planId = bp.id
    if (planId) {
      await supabase.from('planes').update({ nombre: bp.nombre, objetivo: bp.objetivo }).eq('id', planId)
      const semanaIds = bp.semanas.map((s: any) => s.id).filter((id: string) => id && !id.startsWith('tmp'))
      const diaIds = bp.semanas.flatMap((s: any) => s.dias.map((d: any) => d.id)).filter((id: string) => id && !id.startsWith('tmp'))
      const ejIds = bp.semanas.flatMap((s: any) => s.dias.flatMap((d: any) => d.ejercicios.map((e: any) => e.id))).filter((id: string) => id && !id.startsWith('tmp'))
      const { data: semsActuales } = await supabase.from('semanas').select('id').eq('plan_id', planId)
      for (const sem of (semsActuales || [])) { if (!semanaIds.includes(sem.id)) await supabase.from('semanas').delete().eq('id', sem.id) }
      const { data: diasActuales } = await supabase.from('dias').select('id, semana_id').in('semana_id', semanaIds.length ? semanaIds : ['none'])
      for (const dia of (diasActuales || [])) { if (!diaIds.includes(dia.id)) await supabase.from('dias').delete().eq('id', dia.id) }
      if (diaIds.length > 0) {
        const { data: ejsActuales } = await supabase.from('ejercicios').select('id').in('dia_id', diaIds).is('bloque_id', null)
        for (const ej of (ejsActuales || [])) { if (!ejIds.includes(ej.id)) await supabase.from('ejercicios').delete().eq('id', ej.id) }
      }
      for (const sem of bp.semanas) {
        let semId = sem.id
        if (semId && !semId.startsWith('tmp')) { await supabase.from('semanas').update({ numero: sem.numero }).eq('id', semId) }
        else { const { data: newSem } = await supabase.from('semanas').insert({ plan_id: planId, numero: sem.numero }).select().single(); semId = newSem!.id }
        for (const dia of sem.dias) {
          let diaId = dia.id
          if (diaId && !diaId.startsWith('tmp')) { await supabase.from('dias').update({ dia: dia.dia, tipo: dia.tipo, orden: dia.orden || 0 }).eq('id', diaId) }
          else { const { data: newDia } = await supabase.from('dias').insert({ semana_id: semId, dia: dia.dia, tipo: dia.tipo, orden: dia.orden || 0 }).select().single(); diaId = newDia!.id }
          for (let i = 0; i < dia.ejercicios.length; i++) {
            const ej = dia.ejercicios[i]
            if (ej.id && !ej.id.startsWith('tmp')) await supabase.from('ejercicios').update({ nombre: ej.nombre, series: ej.series, repeticiones: ej.repeticiones, carga: ej.carga, descanso: ej.descanso, rpe: ej.rpe || null, rir: ej.rir || null, observaciones: ej.observaciones, orden: i }).eq('id', ej.id)
            else await supabase.from('ejercicios').insert({ dia_id: diaId, nombre: ej.nombre, series: ej.series, repeticiones: ej.repeticiones, carga: ej.carga, descanso: ej.descanso, rpe: ej.rpe || null, rir: ej.rir || null, observaciones: ej.observaciones, orden: i })
          }
        }
      }
    } else {
      const { data: newPlan } = await supabase.from('planes').insert({ nombre: bp.nombre, objetivo: bp.objetivo, admin_id: admin!.id }).select().single()
      planId = newPlan!.id
      for (const sem of bp.semanas) {
        const { data: semData } = await supabase.from('semanas').insert({ plan_id: planId, numero: sem.numero }).select().single()
        for (const dia of sem.dias) {
          const { data: diaData } = await supabase.from('dias').insert({ semana_id: semData!.id, dia: dia.dia, tipo: dia.tipo, orden: dia.orden || 0 }).select().single()
          for (let i = 0; i < dia.ejercicios.length; i++) {
            const ej = dia.ejercicios[i]
            await supabase.from('ejercicios').insert({ dia_id: diaData!.id, nombre: ej.nombre, series: ej.series, repeticiones: ej.repeticiones, carga: ej.carga, descanso: ej.descanso, rpe: ej.rpe || null, rir: ej.rir || null, observaciones: ej.observaciones, orden: i })
          }
        }
      }
    }
    for (const alumnoId of bp.asignados || []) {
      await supabase.from('asignaciones').delete().eq('alumno_id', alumnoId)
      await supabase.from('asignaciones').insert({ alumno_id: alumnoId, plan_id: planId, activo: true })
    }
    setBp(null)
    showToast('✅ Plan guardado exitosamente')
    // Analytics
    track('plan_saved', { is_new: !bp.id, plan_name: bp.nombre })
    loadData()
    setTab('planes')
  }

  async function eliminarPlan(planId: string) {
    if (!confirm('¿Eliminar este plan? Los alumnos asignados quedarán sin plan.')) return
    await supabase.from('planes').delete().eq('id', planId)
    showToast('🗑 Plan eliminado')
    loadData()
  }

  async function logout() { await supabase.auth.signOut(); router.push('/login') }

  async function cargarConteosBloques(planId: string) {
    try {
      const { data } = await (supabase as any).from('bloques').select('id, dia_id')
      if (!data) return
      const conteo: Record<string, number> = {}
      data.forEach((b: any) => { conteo[b.dia_id] = (conteo[b.dia_id] || 0) + 1 })
      setBloquesConteo(conteo)
    } catch(e) {}
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none" style={{ display: 'block', margin: '0 auto 20px' }}>
          <circle cx="16" cy="16" r="16" fill="#5B8CFF"/>
          <text x="16" y="22" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#000">P</text>
        </svg>
        <div style={{ width: '48px', height: '2px', background: '#f3f4f6', borderRadius: '2px', margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: '-40%', height: '100%', width: '40%', background: '#5B8CFF', borderRadius: '2px', animation: 'pload 1.2s ease-in-out infinite' }} />
        </div>
        <style>{'@keyframes pload { 0% { left: -40%; } 100% { left: 110%; } }'}</style>
      </div>
    </div>
  )

  const wine = brand.primaryColor || '#5B8CFF'
  const wineLight = wine + '15'
  const wineMid = wine + '25'
  const filtrados = alumnos.filter(a => `${a.nombre} ${a.apellido} ${a.dni}`.toLowerCase().includes(searchQ.toLowerCase()))
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

  const NAV_ITEMS = [
    { key: 'dashboard', icon: '▦', label: 'Inicio' },
    { key: 'alumnos',   icon: '◉', label: 'Alumnos' },
    { key: 'planes',    icon: '☰', label: 'Planes' },
    { key: 'ayuda',     icon: '?', label: 'Ayuda' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', background: '#f9fafb' }}>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 299 }} />}

      {toast && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: wine, color: '#fff', padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', zIndex: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>{toast}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .admin-sidebar { display: flex; }
        .admin-bottom-nav { display: none; }
        @media (max-width: 768px) {
          .admin-sidebar { transform: translateX(-100%); position: fixed !important; z-index: 300; transition: transform .3s ease; top: 0; height: 100vh !important; }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-main { padding-bottom: 72px !important; }
          .admin-main > div { padding: 16px 14px !important; }
          .stats-grid-dash { grid-template-columns: 1fr 1fr !important; }
          .grid-2-col { grid-template-columns: 1fr !important; }
          .admin-bottom-nav { display: flex !important; }
        }
        .page-eyebrow { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
        .page-title { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 0; }
        .card { background: #ffffff; border-radius: 16px; padding: 20px; border: 1px solid #f3f4f6; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .badge-green { background: #dcfce7; color: #16a34a; }
        .badge-amber { background: #fef3c7; color: #d97706; }
        .badge-rose { background: ${wineLight}; color: ${wine}; }
        .badge-gray { background: #f3f4f6; color: #6b7280; }
        .btn-wine { background: ${wine}; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity .15s; display: inline-flex; align-items: center; gap: 6px; }
        .btn-wine:hover { opacity: .88; }
        .btn-ghost { background: transparent; border: 1px solid #e5e7eb; border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; color: #374151; display: inline-flex; align-items: center; gap: 6px; transition: border-color .15s; }
        .btn-ghost:hover { border-color: ${wine}; color: ${wine}; }
        .btn-danger { background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: #dc2626; transition: background .15s; }
        .btn-danger:hover { background: #fee2e2; }
        .field-label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
        .input-field { background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 14px; color: #111827; outline: none; width: 100%; font-family: inherit; transition: border-color .15s; }
        .input-field:focus { border-color: ${wine}; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className={sidebarOpen ? 'admin-sidebar open' : 'admin-sidebar'} style={{ background: '#ffffff', borderRight: '1px solid #f3f4f6', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', width: '240px', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: `1px solid ${wineMid}`, background: wineLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {brand.brandImageUrl
                ? <img src={brand.brandImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill={wine}/><text x="16" y="22" textAnchor="middle" fontFamily="Georgia,serif" fontSize="18" fontWeight="700" fill="#fff">P</text></svg>
              }
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', lineHeight: '1.2' }}>{brand.brandName}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>Panel de entrenamiento</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 10px 8px', flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 10px', marginBottom: '6px' }}>Gestión</div>
          {NAV_ITEMS.map(({ key, icon, label }) => (
            <button key={key} onClick={() => { setTab(key as Tab); setSidebarOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all .15s', fontSize: '14px', fontWeight: tab === key ? '600' : '500', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit', marginBottom: '2px', background: tab === key ? wineLight : 'transparent', color: tab === key ? wine : '#6b7280' }}
              onMouseEnter={e => { if (tab !== key) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (tab !== key) e.currentTarget.style.background = 'transparent' }}>
              <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', opacity: tab === key ? 1 : 0.5 }}>{icon}</span>
              {label}
              {tab === key && <span style={{ marginLeft: 'auto', width: '5px', height: '5px', borderRadius: '50%', background: wine }} />}
            </button>
          ))}
          <button onClick={() => router.push('/admin/branding')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all .15s', fontSize: '14px', fontWeight: '500', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit', marginBottom: '2px', background: 'transparent', color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', opacity: 0.5 }}>◈</span>
            Mi marca
          </button>
        </div>
        <div style={{ padding: '14px 10px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: '#f9fafb' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#fff', flexShrink: 0 }}>
              {`${admin?.nombre?.[0] || ''}${admin?.apellido?.[0] || ''}`.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.nombre} {admin?.apellido}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Profesora</div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '16px', padding: '4px', borderRadius: '6px', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = wine)}
              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
              title="Cerrar sesión">⏏</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="admin-main" style={{ overflowY: 'auto', background: '#f9fafb', flex: 1, minWidth: 0 }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (() => {
          const sinPlan = alumnos.filter(a => !getPlanAlumno(a.id))
          const conPlan = alumnos.filter(a => !!getPlanAlumno(a.id))
          const sinFicha = alumnos.filter(a => !fichaCompleta(a))
          const accionPrioritaria = sinPlan[0] || null

          let insight = ''
          if (sinPlan.length === 0 && alumnos.length === 0) insight = 'Todavía no tenés alumnos. Empezá creando el primero.'
          else if (sinPlan.length === 0) insight = '¡Todos tus alumnos tienen plan activo!'
          else if (sinPlan.length === 1) insight = `${sinPlan[0].nombre} todavía no tiene un plan asignado.`
          else insight = `${sinPlan.length} alumnos sin plan. Asignales uno para que puedan entrenar.`

          return (
            <div style={{ padding: '28px 32px', maxWidth: '900px' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: wine, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{brand.brandName}</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px', marginBottom: '6px' }}>Hola, {admin?.nombre} 👋</div>
                <div style={{ fontSize: '14px', color: sinPlan.length > 0 ? '#d97706' : '#16a34a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{sinPlan.length > 0 ? '⚠️' : '✅'}</span>{insight}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }} className="stats-grid-dash">
                {[
                  { n: alumnos.length, label: 'Alumnos', color: '#111827', bg: '#fff', action: () => setTab('alumnos') },
                  { n: conPlan.length, label: 'Con plan', color: '#16a34a', bg: '#f0fdf4', action: () => setTab('alumnos') },
                  { n: sinPlan.length, label: 'Sin plan', color: sinPlan.length > 0 ? '#dc2626' : '#9ca3af', bg: sinPlan.length > 0 ? '#fef2f2' : '#fff', action: () => setTab('alumnos') },
                  { n: planes.length, label: 'Planes', color: '#111827', bg: '#fff', action: () => setTab('planes') },
                ].map(({ n, label, color, bg, action }) => (
                  <div key={label} onClick={action} style={{ background: bg, borderRadius: '14px', padding: '16px 14px', border: '1px solid #f3f4f6', cursor: 'pointer', transition: 'box-shadow .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.06)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ fontSize: '30px', fontWeight: '800', color, lineHeight: 1, marginBottom: '4px', letterSpacing: '-1px' }}>{n}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* ✅ Alerta fichas incompletas */}
              {sinFicha.length > 0 && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>📋</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1' }}>
                      {sinFicha.length === 1
                        ? `${sinFicha[0].nombre} todavía no completó su ficha`
                        : `${sinFicha.length} alumnos no completaron su ficha`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '2px' }}>
                      Pediles que ingresen a su app y completen sus datos desde Perfil
                    </div>
                  </div>
                </div>
              )}

              {sinPlan.length > 0 && accionPrioritaria && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⚡</div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '2px' }}>Acción prioritaria</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Asignar plan a {accionPrioritaria?.nombre} {accionPrioritaria?.apellido}</div>
                    </div>
                  </div>
                  <button onClick={() => { setAlumnoActivo(accionPrioritaria); setTab('ficha') }} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Ver perfil →</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                  { label: '+ Alumno', icon: '👤', action: () => setShowAddAlumno(true) },
                  { label: '+ Plan', icon: '📋', action: () => { setBp({ id: null, nombre: '', objetivo: 'Bajar de peso', semanas: [{ id: 'tmp-' + uid(), numero: 1, dias: [] }], asignados: [] }); setTab('builder') } },
                  { label: 'Ver planes', icon: '📊', action: () => setTab('planes') },
                ].map(({ label, icon, action }) => (
                  <button key={label} onClick={action}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '9px 14px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = wine)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Alumnos</div>
                <button onClick={() => setTab('alumnos')} style={{ fontSize: '12px', fontWeight: '600', color: wine, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Ver todos →</button>
              </div>

              {sinPlan.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Sin plan ({sinPlan.length})</div>
                  <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                    {sinPlan.map((a, i) => (
                      <div key={a.id} onClick={() => { setAlumnoActivo(a); setTab('ficha') }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: i < sinPlan.length - 1 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#dc2626', flexShrink: 0 }}>{`${a.nombre[0]}${a.apellido[0]}`.toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {a.nombre} {a.apellido}
                            {!fichaCompleta(a) && <span style={{ fontSize: '9px', fontWeight: '700', background: '#f0f9ff', color: '#0284c7', borderRadius: '20px', padding: '2px 7px' }}>Ficha incompleta</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{a.objetivo || 'Sin objetivo cargado'}</div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: '#dc2626', background: '#fef2f2', borderRadius: '20px', padding: '3px 10px', flexShrink: 0 }}>Sin plan</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conPlan.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Activos ({conPlan.length})</div>
                  <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                    {conPlan.map((a, i) => {
                      const plan = getPlanAlumno(a.id)
                      return (
                        <div key={a.id} onClick={() => { setAlumnoActivo(a); setTab('ficha'); const planA = asignaciones.find(x => x.alumno_id === a.id); if (planA) cargarConteosBloques(planA.plan_id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderBottom: i < conPlan.length - 1 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#fff', flexShrink: 0 }}>{`${a.nombre[0]}${a.apellido[0]}`.toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {a.nombre} {a.apellido}
                              {!fichaCompleta(a) && <span style={{ fontSize: '9px', fontWeight: '700', background: '#f0f9ff', color: '#0284c7', borderRadius: '20px', padding: '2px 7px' }}>Ficha incompleta</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{a.objetivo || 'Sin objetivo cargado'}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a', background: '#f0fdf4', borderRadius: '20px', padding: '3px 10px', flexShrink: 0, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {plan?.nombre}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ALUMNOS */}
        {tab === 'alumnos' && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ marginBottom: '20px' }}><div className="page-eyebrow">Gestión</div><div className="page-title">Alumnos/as</div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <input type="text" placeholder="🔍 Buscar..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '9px 14px', fontSize: '14px', outline: 'none', maxWidth: '260px', fontFamily: 'inherit', width: '100%' }} />
              <button className="btn-wine" onClick={() => setShowAddAlumno(true)}>+ Nuevo alumno/a</button>
            </div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
              {filtrados.map((a, i) => {
                const plan = getPlanAlumno(a.id)
                return (
                  <div key={a.id} onClick={() => { setAlumnoActivo(a); setTab('ficha'); const planA = asignaciones.find(x => x.alumno_id === a.id); if (planA) cargarConteosBloques(planA.plan_id) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < filtrados.length - 1 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', color: '#fff', flexShrink: 0 }}>{`${a.nombre[0]}${a.apellido[0]}`.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {a.nombre} {a.apellido}
                        {!fichaCompleta(a) && <span style={{ fontSize: '9px', fontWeight: '700', background: '#f0f9ff', color: '#0284c7', borderRadius: '20px', padding: '2px 7px' }}>Ficha incompleta</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>DNI {a.dni} · {a.objetivo || 'Sin objetivo'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className={`badge ${plan ? 'badge-green' : 'badge-amber'}`}>{plan ? `✓ ${plan.nombre}` : 'Sin plan'}</span>
                      <select value={getPlanAlumno(a.id)?.id || ''} onChange={e => { e.stopPropagation(); asignarPlan(a.id, e.target.value || null) }}
                        onClick={e => e.stopPropagation()}
                        style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '7px', padding: '4px 8px', fontSize: '11px', color: '#374151', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <option value="">Sin plan</option>
                        {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                )
              })}
              {!filtrados.length && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No se encontraron alumnos</div>}
            </div>
          </div>
        )}

        {/* FICHA ALUMNO */}
        {tab === 'ficha' && alumnoActivo && (() => {
          const planActivo = getPlanAlumno(alumnoActivo.id)
          return (
            <div style={{ padding: '24px 28px', maxWidth: '860px' }}>
              <button className="btn-ghost" style={{ marginBottom: '16px', fontSize: '13px' }} onClick={() => setTab('alumnos')}>← Volver</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px', color: '#fff', flexShrink: 0 }}>{`${alumnoActivo.nombre[0]}${alumnoActivo.apellido[0]}`.toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.4px' }}>{alumnoActivo.nombre} {alumnoActivo.apellido}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span className="badge badge-rose">{alumnoActivo.nivel || 'Sin nivel'}</span>
                    {planActivo && <span className="badge badge-green">✓ {planActivo.nombre}</span>}
                    {!planActivo && <span className="badge badge-amber">Sin plan</span>}
                    {!fichaCompleta(alumnoActivo) && <span className="badge badge-gray">📋 Ficha incompleta</span>}
                  </div>
                </div>
              </div>

              {/* Aviso ficha incompleta */}
              {!fichaCompleta(alumnoActivo) && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>📋</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '2px' }}>Ficha incompleta</div>
                    <div style={{ fontSize: '12px', color: '#0284c7' }}>
                      {alumnoActivo.nombre} todavía no completó sus datos. Pedile que ingrese a su app y vaya a Perfil → Completar ficha.
                    </div>
                  </div>
                </div>
              )}

              <div className="card" style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Datos personales</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }} className="grid-2-col">
                  {[['DNI', alumnoActivo.dni || '—'], ['Edad', alumnoActivo.edad ? `${alumnoActivo.edad} años` : '—'], ['Teléfono', alumnoActivo.telefono || '—'], ['Sexo', alumnoActivo.sexo || '—']].map(([l, v]) => (
                    <div key={l} style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>{l}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: v === '—' ? '#d1d5db' : '#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {alumnoActivo.objetivo ? (
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>Objetivo</div>
                    <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5' }}>{alumnoActivo.objetivo}</div>
                  </div>
                ) : (
                  <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 14px', marginTop: '10px', border: '1px dashed #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Sin objetivo — el alumno lo completará desde su perfil</div>
                  </div>
                )}
                {alumnoActivo.restricciones && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '3px' }}>⚠️ Restricciones</div>
                    <div style={{ fontSize: '14px', color: '#111827' }}>{alumnoActivo.restricciones}</div>
                  </div>
                )}
              </div>

              {/* Plan */}
              <div className="card" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>Plan de entrenamiento</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {planActivo && (
                      <button className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => {
                        const plan = planActivo as any
                        const asigAlumnos = alumnos.filter(a => getPlanAlumno(a.id)?.id === plan.id)
                        const semanas = (plan.semanas || []).map((s: any) => ({ id: s.id, numero: s.numero, dias: (s.dias || []).map((d: any) => ({ id: d.id, dia: d.dia, tipo: d.tipo || '', orden: d.orden || 0, ejercicios: (d.ejercicios || []).map((e: any) => ({ id: e.id, nombre: e.nombre, series: e.series, repeticiones: e.repeticiones, carga: e.carga || '', descanso: e.descanso || '', rpe: e.rpe || '', rir: e.rir || '', observaciones: e.observaciones || '' })) })) }))
                        setBp({ id: plan.id, nombre: plan.nombre, objetivo: plan.objetivo, semanas, asignados: asigAlumnos.map((a: any) => a.id) })
                        cargarConteosBloques(plan.id)
                        setTab('builder')
                      }}>✏️ Editar</button>
                    )}
                    <button className="btn-wine" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => { setBp({ id: null, nombre: '', objetivo: 'Bajar de peso', semanas: [{ id: 'tmp-' + uid(), numero: 1, dias: [] }], asignados: [alumnoActivo.id] }); setTab('builder') }}>+ Nuevo</button>
                  </div>
                </div>
                <select value={planActivo?.id || ''} onChange={e => asignarPlan(alumnoActivo.id, e.target.value || null)}
                  style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#111827', outline: 'none', width: '100%', fontFamily: 'inherit', marginBottom: planActivo ? '14px' : '0' }}>
                  <option value="">Sin plan asignado</option>
                  {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {planActivo && (() => {
                  const p = planActivo as any
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        <span className="badge badge-rose">🎯 {p.objetivo}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{(p.semanas || []).length} semana{(p.semanas || []).length !== 1 ? 's' : ''}</span>
                      </div>
                      {(p.semanas || []).map((sem: any) => (
                        <div key={sem.id} style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: wine, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ background: wine, color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>{sem.numero}</span>
                            Semana {sem.numero}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
                            {(sem.dias || []).map((dia: any) => (
                              <div key={dia.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', transition: '.15s' }}
                                onClick={() => { cargarConteosBloques(p.id); setDiaEditorActivo({ id: dia.id, nombre: dia.tipo || dia.dia, numero: dia.orden + 1 }) }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = wine)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}>
                                <div style={{ fontWeight: '700', fontSize: '12px', color: wine, marginBottom: '2px' }}>{dia.dia}</div>
                                {dia.tipo && <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{dia.tipo}</div>}
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{bloquesConteo[dia.id] > 0 ? `🧱 ${bloquesConteo[dia.id]} bloques` : `${(dia.ejercicios || []).length} ejercicios`}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Cobros */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>💳 Cobros</div>
                  {!admin?.cobros_activos && <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f9fafb', borderRadius: '20px', padding: '2px 10px', border: '1px solid #f3f4f6' }}>Opcional</span>}
                </div>
                {!admin?.cobros_activos ? (
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px dashed #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#374151', fontWeight: '600', marginBottom: '6px' }}>Cobrá desde la app del alumno</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px', lineHeight: '1.5' }}>Tu alumno verá un botón "Pagar mes" en su app y pagará directo a vos via Mercado Pago.</div>
                    <button onClick={async () => {
                      const clientId = process.env.NEXT_PUBLIC_MP_CLIENT_ID || ''
                      const redirectUri = encodeURIComponent(`${window.location.origin}/api/mp/oauth-callback`)
                      const state = btoa(JSON.stringify({ adminId: admin!.id, ts: Date.now() }))
                      window.location.href = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${state}&redirect_uri=${redirectUri}`
                    }} style={{ background: '#009ee3', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      💳 Conectar Mercado Pago
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>MP conectado</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>· comisión {admin?.plan === 'pro' ? '5%' : '8%'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" placeholder="Precio mensual (ARS)" value={precioInput[alumnoActivo.id] ?? (alumnoActivo as any).precio_mensual ?? ''}
                        onChange={e => setPrecioInput(p => ({ ...p, [alumnoActivo.id]: e.target.value }))}
                        style={{ flex: 1, background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#111827', outline: 'none', fontFamily: 'inherit' }} />
                      <button disabled={savingPrecio} onClick={async () => {
                        const precio = parseFloat(precioInput[alumnoActivo.id])
                        if (!precio || precio < 100) { showToast('⚠️ Ingresá un precio válido'); return }
                        setSavingPrecio(true)
                        await supabase.from('perfiles').update({ precio_mensual: precio }).eq('id', alumnoActivo.id)
                        setSavingPrecio(false)
                        showToast('✅ Precio guardado')
                      }} style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', opacity: savingPrecio ? 0.6 : 1 }}>
                        {savingPrecio ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* PLANES */}
        {tab === 'planes' && !bp && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ marginBottom: '20px' }}><div className="page-eyebrow">Gestión</div><div className="page-title">Planes</div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>{planes.length} plan{planes.length !== 1 ? 'es' : ''}</div>
              <button className="btn-wine" onClick={() => { setBp({ id: null, nombre: '', objetivo: 'Bajar de peso', semanas: [{ id: 'tmp-' + uid(), numero: 1, dias: [] }], asignados: [] }); setTab('builder') }}>+ Crear plan</button>
            </div>
            {!planes.length ? (
              <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: wine, marginBottom: '10px' }}>Ningún plan todavía</div>
                <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Creá el primer plan y asignalo a tus alumnos</p>
                <button className="btn-wine" onClick={() => { setBp({ id: null, nombre: '', objetivo: 'Bajar de peso', semanas: [{ id: 'tmp-' + uid(), numero: 1, dias: [] }], asignados: [] }); setTab('builder') }}>+ Crear primer plan</button>
              </div>
            ) : planes.map(plan => {
              const asigAlumnos = alumnos.filter(a => getPlanAlumno(a.id)?.id === plan.id)
              const totalDias = (plan as any).semanas?.reduce((a: number, s: any) => a + (s.dias?.length || 0), 0) || 0
              const totalEjs = (plan as any).semanas?.reduce((a: number, s: any) => a + (s.dias || []).reduce((b: number, d: any) => b + (d.ejercicios?.length || 0), 0), 0) || 0
              return (
                <div key={plan.id} className="card" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: wine, marginBottom: '6px', letterSpacing: '-0.3px' }}>{plan.nombre}</div>
                      <span className="badge badge-rose">🎯 {plan.objetivo}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-ghost" style={{ fontSize: '13px', padding: '7px 12px' }} onClick={() => {
                        const semanas = ((plan as any).semanas || []).map((s: any) => ({ id: s.id, numero: s.numero, dias: (s.dias || []).map((d: any) => ({ id: d.id, dia: d.dia, tipo: d.tipo || '', orden: d.orden || 0, ejercicios: (d.ejercicios || []).map((e: any) => ({ id: e.id, nombre: e.nombre, series: e.series, repeticiones: e.repeticiones, carga: e.carga || '', descanso: e.descanso || '', rpe: e.rpe || '', rir: e.rir || '', observaciones: e.observaciones || '' })) })) }))
                        setBp({ id: plan.id, nombre: plan.nombre, objetivo: plan.objetivo, semanas, asignados: asigAlumnos.map(a => a.id) })
                        setTab('builder')
                        cargarConteosBloques(plan.id)
                      }}>✏️ Editar</button>
                      <button className="btn-danger" style={{ fontSize: '13px', padding: '7px 12px' }} onClick={() => eliminarPlan(plan.id)}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[[(plan as any).semanas?.length || 0, 'Semanas'], [totalDias, 'Días'], [totalEjs, 'Ejercicios']].map(([n, l]) => (
                      <div key={l} style={{ background: wineLight, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: wine }}>{n}</div>
                        <div style={{ fontSize: '11px', color: wine, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>Asignado a</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {asigAlumnos.length ? asigAlumnos.map(a => (
                      <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: wineLight, borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '600', color: wine }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: wine, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '7px', fontWeight: '800' }}>{`${a.nombre[0]}${a.apellido[0]}`.toUpperCase()}</span>
                        {a.nombre} {a.apellido}
                      </span>
                    )) : <span style={{ color: '#9ca3af', fontSize: '13px' }}>Ningún alumno/a</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* BUILDER */}
        {tab === 'builder' && bp && (
          <div style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <button className="btn-ghost" style={{ marginBottom: '8px', fontSize: '13px' }} onClick={() => { setBp(null); setTab('planes') }}>← Volver</button>
                <div className="page-title">{bp.id ? 'Editar plan' : 'Nuevo plan'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {saveStatus !== 'idle' && <span style={{ fontSize: '12px', color: saveStatus === 'saving' ? '#9ca3af' : '#16a34a', fontWeight: '500' }}>{saveStatus === 'saving' ? '⏳ Guardando...' : '✓ Guardado'}</span>}
                <button className="btn-wine" style={{ fontSize: '15px', padding: '12px 24px' }} onClick={guardarPlan}>💾 Guardar</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px' }}>1</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>Datos del plan</div>
            </div>
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="grid-2-col">
                <div>
                  <label className="field-label">Nombre del plan *</label>
                  <input className="input-field" type="text" placeholder="Ej: Plan Fuerza 8 semanas" value={bp.nombre} onChange={e => { const newBp = { ...bp, nombre: e.target.value }; setBp(newBp); autosavePlan(newBp) }} />
                  {!bp.nombre && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>💡 Podés elegir los días ahora y escribir el nombre después</div>}
                </div>
                <div>
                  <label className="field-label">Objetivo</label>
                  <select className="input-field" value={['Bajar de peso','Ganar masa muscular','Salud general','Rendimiento deportivo','Rehabilitación','Flexibilidad'].includes(bp.objetivo) ? bp.objetivo : 'Otro'} onChange={e => { const newBp = { ...bp, objetivo: e.target.value === 'Otro' ? '' : e.target.value }; setBp(newBp); autosavePlan(newBp) }}>
                    {['Bajar de peso','Ganar masa muscular','Salud general','Rendimiento deportivo','Rehabilitación','Flexibilidad','Otro'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px' }}>2</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>Semanas y ejercicios</div>
            </div>
            {bp.semanas.map((sem: any, si: number) => (
              <div key={sem.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '18px', marginBottom: '14px', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: wine }}>Semana {sem.numero}</span>
                    <span className="badge badge-rose">{sem.dias.length} día{sem.dias.length !== 1 ? 's' : ''}</span>
                  </div>
                  {si > 0 && <button className="btn-danger" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setBp((p: any) => ({ ...p, semanas: p.semanas.filter((_: any, i: number) => i !== si).map((s: any, i: number) => ({ ...s, numero: i + 1 })) }))}>Eliminar</button>}
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Días de entrenamiento</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => {
                      const ya = sem.dias.find((x: any) => x.dia === d)
                      return (
                        <button key={d} onClick={async () => {
                          if (ya) {
                            // Eliminar día — si existe en DB, borrarlo
                            if (ya.id && !ya.id.startsWith('tmp') && bp.id) {
                              await supabase.from('dias').delete().eq('id', ya.id)
                            }
                            setBp((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.filter((x: any) => x.dia !== d) } : s) }))
                          } else {
                            // ✅ Guardar silencioso — crea plan+semana+día en DB automáticamente
                            // así el botón de bloques aparece de inmediato sin click en Guardar
                            const orden = sem.dias.length
                            if (bp.id && sem.id && !sem.id.startsWith('tmp')) {
                              // Plan y semana ya existen, solo crear el día
                              const { data: newDia } = await supabase.from('dias').insert({ semana_id: sem.id, dia: d, tipo: '', orden }).select().single()
                              if (newDia) {
                                setBp((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: [...s.dias, { id: newDia.id, dia: d, tipo: '', orden, ejercicios: [] }] } : s) }))
                                return
                              }
                            } else {
                              // Plan o semana no existen — guardado silencioso completo
                              const resultado = await guardarPlanSilencioso(bp, sem.id, d, orden)
                              if (resultado) {
                                setSaveStatus('saved')
                                setTimeout(() => setSaveStatus('idle'), 2000)
                                setBp((p: any) => ({
                                  ...p,
                                  id: resultado.planId,
                                  nombre: p.nombre || 'Nuevo plan',
                                  semanas: p.semanas.map((s: any) => s.id === sem.id
                                    ? { ...s, id: resultado.semId, dias: [...s.dias, { id: resultado.diaId, dia: d, tipo: '', orden, ejercicios: [] }] }
                                    : s
                                  )
                                }))
                                return
                              }
                              // Fallback si falla el guardado — id temporal con prefijo tmp-
                              setBp((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: [...s.dias, { id: 'tmp-' + uid(), dia: d, tipo: '', orden, ejercicios: [] }] } : s) }))
                            }
                          }
                        }} style={{ padding: '7px 13px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: '1.5px solid', transition: '.15s', fontFamily: 'inherit', background: ya ? wine : '#fff', color: ya ? '#fff' : '#9ca3af', borderColor: ya ? wine : '#e5e7eb' }}>
                          {d.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {sem.dias.map((dia: any) => (
                  <div key={dia.id} style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: wine }}>{dia.dia}</span>
                      <button className="btn-danger" style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => setBp((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.filter((x: any) => x.id !== dia.id) } : s) }))}>✕</button>
                    </div>
                    <input style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 11px', fontSize: '13px', color: '#111827', outline: 'none', width: '100%', fontFamily: 'inherit', marginBottom: '10px' }}
                      type="text" placeholder="Nombre de la sesión (ej: Pecho, Cardio...)" value={dia.tipo}
                      onChange={e => setBp((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.map((x: any) => x.id === dia.id ? { ...x, tipo: e.target.value } : x) } : s) }))} />
                    {/* ✅ Solo bloques — ejercicios sueltos eliminados */}
                    {bp.id && dia.id && !dia.id.startsWith('tmp') ? (
                      <button style={{ width: '100%', padding: '11px', borderRadius: '10px', border: `1.5px solid ${wine}`, background: wineLight, color: wine, fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => setDiaEditorActivo({ id: dia.id, nombre: dia.tipo || dia.dia, numero: dia.orden + 1 })}>
                        🧱 Agregar ejercicios a {dia.dia}
                        {bloquesConteo[dia.id] > 0 && <span style={{ background: wine, color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>{bloquesConteo[dia.id]} bloques</span>}
                      </button>
                    ) : (
                      <div style={{ background: '#fff', border: '1px dashed #e5e7eb', borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                        💡 Guardá el plan para agregar ejercicios a este día
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* ✅ FIX: Botón agregar semana — persiste en DB si el plan ya existe */}
            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: '24px' }}
              onClick={async () => {
                const nuevoNumero = bp.semanas.length + 1

                if (bp.id) {
                  // Plan ya existe en DB → crear la semana directamente y usar su id real
                  const { data: newSem } = await supabase
                    .from('semanas')
                    .insert({ plan_id: bp.id, numero: nuevoNumero })
                    .select()
                    .single()

                  if (newSem) {
                    setBp((p: any) => ({
                      ...p,
                      semanas: [...p.semanas, { id: newSem.id, numero: nuevoNumero, dias: [] }]
                    }))
                    return
                  }
                }

                // Plan nuevo (sin id todavía) → id temporal con prefijo tmp-
                setBp((p: any) => ({
                  ...p,
                  semanas: [...p.semanas, { id: 'tmp-' + uid(), numero: nuevoNumero, dias: [] }]
                }))
              }}>
              + Agregar semana {bp.semanas.length + 1}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '13px' }}>3</div>
              <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>Asignar alumnos/as</div>
            </div>
            <div className="card" style={{ marginBottom: '24px' }}>
              {alumnos.map(a => {
                const sel = bp.asignados.includes(a.id)
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => setBp((p: any) => ({ ...p, asignados: sel ? p.asignados.filter((id: string) => id !== a.id) : [...p.asignados, a.id] }))}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: '2px solid', borderColor: sel ? wine : '#e5e7eb', background: sel ? wine : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', flexShrink: 0 }}>{sel ? '✓' : ''}</div>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: '#fff', flexShrink: 0 }}>{`${a.nombre[0]}${a.apellido[0]}`.toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{a.nombre} {a.apellido}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{a.objetivo || 'Sin objetivo'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn-wine" style={{ width: '100%', fontSize: '16px', padding: '15px' }} onClick={guardarPlan}>💾 Guardar plan</button>
          </div>
        )}

        {/* AYUDA */}
        {tab === 'ayuda' && (
          <div style={{ height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f3f4f6', background: '#fff' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px' }}>Soporte</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.4px' }}>Ayuda</div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <SoporteChat userType="admin" userName={admin?.nombre} primaryColor={wine} />
            </div>
          </div>
        )}

      </main>

      {/* ── BOTTOM NAV MOBILE ── */}
      <nav className="admin-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#ffffff', borderTop: '1px solid #f3f4f6', height: '64px', alignItems: 'stretch', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        {[
          { key: 'dashboard', icon: '▦', label: 'Inicio' },
          { key: 'alumnos',   icon: '◉', label: 'Alumnos' },
          { key: 'planes',    icon: '☰', label: 'Planes' },
          { key: 'ayuda',     icon: '?', label: 'Ayuda' },
        ].map(({ key, icon, label }) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: tab === key ? wine : '#9ca3af', borderTop: tab === key ? `2px solid ${wine}` : '2px solid transparent', transition: 'color .15s' }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: '10px', fontWeight: tab === key ? '700' : '500' }}>{label}</span>
          </button>
        ))}
        <button onClick={() => router.push('/admin/branding')}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#9ca3af', borderTop: '2px solid transparent' }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>◈</span>
          <span style={{ fontSize: '10px', fontWeight: '500' }}>Marca</span>
        </button>
      </nav>

      {/* MODAL EDITOR DE BLOQUES */}
      {diaEditorActivo && (
        <div onClick={() => setDiaEditorActivo(null)} style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#0F172A', borderRadius: '20px 20px 0 0', border: '1px solid rgba(51,65,85,0.8)', borderBottom: 'none', boxShadow: '0 -8px 48px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(51,65,85,0.5)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🧱</div>
                <div>
                  <div style={{ color: '#F1F5F9', fontWeight: '700', fontSize: '15px' }}>Bloques</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{diaEditorActivo.nombre}</div>
                </div>
              </div>
              <button onClick={() => { setDiaEditorActivo(null); if (bp?.id) cargarConteosBloques(bp.id) }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.6)', background: 'rgba(30,41,59,0.8)', cursor: 'pointer', color: '#64748B', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
              <RoutineDayEditor diaId={diaEditorActivo.id} diaNombre={diaEditorActivo.nombre} diaNumero={diaEditorActivo.numero} onAgregarEjercicio={() => showToast('💡 Guardá el plan primero')} />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL WIZARD ONBOARDING ── */}
      {showWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}>

            {/* Confetti animado */}
            {confetti && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '24px', zIndex: 10 }}>
                <style>{`
                  @keyframes confetti-fall {
                    0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
                  }
                  .confetti-piece { position: absolute; width: 10px; height: 10px; border-radius: 2px; animation: confetti-fall 3s ease-in forwards; }
                `}</style>
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="confetti-piece" style={{ left: `${Math.random() * 100}%`, top: '-10px', background: ['#5B8CFF','#e260a5','#16a34a','#f59e0b','#8b5cf6'][i % 5], animationDelay: `${Math.random() * 1.5}s`, width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px` }} />
                ))}
              </div>
            )}

            {/* Header con steps */}
            <div style={{ padding: '28px 28px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: wine, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Configuración inicial</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.4px' }}>
                    {wizardStep === 1 && 'Tu primer atleta'}
                    {wizardStep === 2 && 'Su primer plan'}
                    {wizardStep === 3 && '¡Todo listo! 🎉'}
                  </div>
                </div>
                {/* Steps indicador */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[1,2,3].map(s => (
                    <div key={s} style={{ width: s === wizardStep ? '24px' : '8px', height: '8px', borderRadius: '4px', background: s <= wizardStep ? wine : '#e5e7eb', transition: 'all .3s' }} />
                  ))}
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: wine, borderRadius: '2px', width: `${((wizardStep - 1) / 2) * 100}%`, transition: 'width .5s ease' }} />
              </div>
            </div>

            <div style={{ padding: '0 28px 28px' }}>

              {/* ── PASO 1: Crear atleta ── */}
              {wizardStep === 1 && (
                <div>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#0369a1', lineHeight: '1.5' }}>
                    👋 Empecemos agregando a tu primer atleta. Solo los datos básicos — el resto lo completa desde su app.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    {[['nombre','Nombre *','María'],['apellido','Apellido *','García']].map(([k,l,ph]) => (
                      <div key={k}>
                        <label className="field-label">{l}</label>
                        <input className="input-field" type="text" placeholder={ph}
                          value={(wizardAlumno as any)[k]}
                          onChange={e => setWizardAlumno(p => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label">DNI *</label>
                    <input className="input-field" type="text" placeholder="Sin puntos ni guiones"
                      value={wizardAlumno.dni}
                      onChange={e => setWizardAlumno(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                      maxLength={8} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="field-label">Email *</label>
                    <input className="input-field" type="email" placeholder="atleta@email.com"
                      value={wizardAlumno.email}
                      onChange={e => setWizardAlumno(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label className="field-label">Contraseña inicial *</label>
                    <input className="input-field" type="password" placeholder="Mínimo 6 caracteres"
                      value={wizardAlumno.password}
                      onChange={e => setWizardAlumno(p => ({ ...p, password: e.target.value }))} />
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>El atleta puede cambiarla desde su perfil.</div>
                  </div>
                  {wizardError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>
                      ⚠️ {wizardError}
                    </div>
                  )}
                  <button className="btn-wine" style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '14px', opacity: wizardLoading ? 0.7 : 1 }}
                    onClick={wizardCrearAtleta} disabled={wizardLoading}>
                    {wizardLoading ? 'Creando atleta...' : 'Continuar — Crear plan →'}
                  </button>
                  <button onClick={wizardFinalizar} style={{ width: '100%', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '13px', marginTop: '10px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                    Omitir por ahora, ir al panel
                  </button>
                </div>
              )}

              {/* ── PASO 2: Crear plan ── */}
              {wizardStep === 2 && wizardPlan && (
                <div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#15803d', lineHeight: '1.5' }}>
                    ✅ <strong>{wizardAlumno.nombre}</strong> fue creado/a. Ahora armá su primer plan de entrenamiento.
                  </div>

                  {/* Datos del plan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }} className="grid-2-col">
                    <div>
                      <label className="field-label">Nombre del plan *</label>
                      <input className="input-field" type="text" placeholder="Ej: Plan Fuerza 8 semanas"
                        value={wizardPlan.nombre}
                        onChange={e => setWizardPlan((p: any) => ({ ...p, nombre: e.target.value }))} />
                    </div>
                    <div>
                      <label className="field-label">Objetivo</label>
                      <select className="input-field" value={wizardPlan.objetivo}
                        onChange={e => setWizardPlan((p: any) => ({ ...p, objetivo: e.target.value }))}>
                        {['Bajar de peso','Ganar masa muscular','Salud general','Rendimiento deportivo','Rehabilitación','Flexibilidad'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Semanas */}
                  {wizardPlan.semanas.map((sem: any, si: number) => (
                    <div key={sem.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '16px', marginBottom: '12px', background: '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: wine }}>Semana {sem.numero}</span>
                        {si > 0 && <button className="btn-danger" style={{ fontSize: '11px', padding: '5px 9px' }}
                          onClick={() => setWizardPlan((p: any) => ({ ...p, semanas: p.semanas.filter((_: any, i: number) => i !== si).map((s: any, i: number) => ({ ...s, numero: i + 1 })) }))}>Eliminar</button>}
                      </div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: '8px' }}>Días</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                        {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => {
                          const ya = sem.dias.find((x: any) => x.dia === d)
                          return (
                            <button key={d} onClick={() => {
                              if (ya) {
                                setWizardPlan((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.filter((x: any) => x.dia !== d) } : s) }))
                              } else {
                                setWizardPlan((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: [...s.dias, { id: wizardUid(), dia: d, tipo: '', orden: s.dias.length, ejercicios: [] }] } : s) }))
                              }
                            }} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', background: ya ? wine : '#fff', color: ya ? '#fff' : '#9ca3af', borderColor: ya ? wine : '#e5e7eb' }}>
                              {d.slice(0, 3)}
                            </button>
                          )
                        })}
                      </div>
                      {sem.dias.map((dia: any) => (
                        <div key={dia.id} style={{ background: '#fff', borderRadius: '12px', padding: '12px', marginBottom: '8px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: wineLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px', color: wine, flexShrink: 0 }}>{dia.dia.slice(0,3)}</span>
                            <input style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#111827', outline: 'none', width: '100%', fontFamily: 'inherit' }}
                              type="text" placeholder="Nombre de la sesión (ej: Pecho, Cardio...)" value={dia.tipo}
                              onChange={e => setWizardPlan((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.map((x: any) => x.id === dia.id ? { ...x, tipo: e.target.value } : x) } : s) }))} />
                          </div>
                          <button className="btn-danger" style={{ fontSize: '10px', padding: '4px 8px', flexShrink: 0 }}
                            onClick={() => setWizardPlan((p: any) => ({ ...p, semanas: p.semanas.map((s: any) => s.id === sem.id ? { ...s, dias: s.dias.filter((x: any) => x.id !== dia.id) } : s) }))}>✕</button>
                        </div>
                      ))}
                      {/* Aviso ejercicios después */}
                      {sem.dias.length > 0 && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>🧱</span>
                          <span>Los ejercicios de cada día los agregás desde el panel una vez guardado el plan.</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
                    onClick={() => setWizardPlan((p: any) => ({ ...p, semanas: [...p.semanas, { id: wizardUid(), numero: p.semanas.length + 1, dias: [] }] }))}>
                    + Agregar semana {wizardPlan.semanas.length + 1}
                  </button>

                  {wizardError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>
                      ⚠️ {wizardError}
                    </div>
                  )}
                  <button className="btn-wine" style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '14px', opacity: wizardLoading ? 0.7 : 1 }}
                    onClick={wizardGuardarPlan} disabled={wizardLoading}>
                    {wizardLoading ? 'Guardando plan...' : 'Guardar plan y continuar →'}
                  </button>
                  <button onClick={wizardOmitirPlan} style={{ width: '100%', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '13px', marginTop: '10px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
                    Omitir este paso por ahora
                  </button>
                </div>
              )}

              {/* ── PASO 3: Éxito ── */}
              {wizardStep === 3 && (
                <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px', lineHeight: 1 }}>🎉</div>
                  <div style={{ fontFamily: 'inherit', fontSize: '22px', fontWeight: '800', color: '#111827', marginBottom: '8px', letterSpacing: '-0.4px' }}>
                    ¡Ya estás listo/a!
                  </div>
                  <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '28px', lineHeight: '1.6' }}>
                    {wizardAlumnoId && wizardPlan?.nombre ? (
                      <>Creaste a <strong style={{ color: '#111827' }}>{wizardAlumno.nombre} {wizardAlumno.apellido}</strong> con el plan <strong style={{ color: wine }}>{wizardPlan.nombre}</strong>.<br />Ya puede ingresar a su app y empezar a entrenar.</>
                    ) : wizardAlumnoId ? (
                      <>Creaste a <strong style={{ color: '#111827' }}>{wizardAlumno.nombre} {wizardAlumno.apellido}</strong>.<br />Podés asignarle un plan desde el panel en cualquier momento.</>
                    ) : (
                      <>Tu panel está listo. Podés agregar atletas y planes cuando quieras.</>
                    )}
                  </div>
                  {/* Resumen visual */}
                  {wizardAlumnoId && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <div style={{ background: wineLight, borderRadius: '12px', padding: '12px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: wine }}>1</div>
                        <div style={{ fontSize: '11px', color: wine, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.06em' }}>Atleta</div>
                      </div>
                      {wizardPlan?.nombre && (
                        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>1</div>
                          <div style={{ fontSize: '11px', color: '#16a34a', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.06em' }}>Plan</div>
                        </div>
                      )}
                    </div>
                  )}
                  <button className="btn-wine" style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '15px' }}
                    onClick={wizardFinalizar}>
                    Ir a mi panel →
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL AGREGAR ALUMNO — simplificado a 5 campos */}
      {showAddAlumno && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowAddAlumno(false)}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', letterSpacing: '-0.4px' }}>Nuevo alumno/a</div>
              <button onClick={() => setShowAddAlumno(false)} style={{ background: '#f9fafb', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#6b7280', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Aviso */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#0369a1' }}>
              📋 Solo los datos esenciales para el acceso. El alumno completará su ficha desde la app.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              {[['nombre','Nombre *','Ej: María'],['apellido','Apellido *','Ej: García']].map(([k,l,ph]) => (
                <div key={k}>
                  <label className="field-label">{l}</label>
                  <input className="input-field" type="text" placeholder={ph} value={(newA as any)[k]} onChange={e => setNewA(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="field-label">DNI *</label>
              <input className="input-field" type="text" placeholder="Sin puntos ni guiones" value={newA.dni}
                onChange={e => setNewA(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                maxLength={8} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label className="field-label">Email *</label>
              <input className="input-field" type="email" placeholder="alumno@email.com" value={newA.email} onChange={e => setNewA(p => ({ ...p, email: e.target.value }))} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="field-label">Contraseña inicial *</label>
              <input className="input-field" type="password" placeholder="Mínimo 6 caracteres" value={newA.password} onChange={e => setNewA(p => ({ ...p, password: e.target.value }))} />
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>El alumno puede cambiarla desde su perfil.</div>
            </div>

            <button className="btn-wine" style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '14px' }} onClick={crearAlumno}>
              Crear alumno/a ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
