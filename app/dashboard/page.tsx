// @ts-nocheck
'use client'
// app/dashboard/page.tsx — Dashboard del alumno
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Perfil, Plan, Semana, Dia, Ejercicio, Peso } from '@/types/database'
import { SoporteChat } from '@/components/SoporteChat'

const TIPO_EMOJI: any  = { normal: '💪', circuito: '🔁', superserie: '⚡', entrada_en_calor: '🔥', vuelta_a_la_calma: '🧘' }
const TIPO_LABEL: any  = { normal: 'Normal', circuito: 'Circuito', superserie: 'Superserie', entrada_en_calor: 'Entrada en calor', vuelta_a_la_calma: 'Vuelta a la calma' }
const TIPO_COLOR: any  = { normal: '#3b82f6', circuito: '#22c55e', superserie: '#8b5cf6', entrada_en_calor: '#f97316', vuelta_a_la_calma: '#06b6d4' }

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [perfil, setPerfil]           = useState<Perfil | null>(null)
  const [plan, setPlan]               = useState<Plan | null>(null)
  const [semanas, setSemanas]         = useState<Semana[]>([])
  const [pesos, setPesos]             = useState<Peso[]>([])
  const [checkins, setCheckins]       = useState<string[]>([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState<'inicio' | 'plan' | 'progreso' | 'perfil' | 'ayuda'>('inicio')
  const [nuevoPeso, setNuevoPeso]     = useState('')
  const [showPesoModal, setShowPesoModal] = useState(false)
  const [diaActivo, setDiaActivo]     = useState<Dia | null>(null)
  const [toast, setToast]             = useState('')
  const [fotosProgreso, setFotosProgreso] = useState([])
  const [showFotoModal, setShowFotoModal] = useState(false)
  const [fotoUpload, setFotoUpload]   = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const fotoRef                       = useRef(null)
  const [ejActivo, setEjActivo]       = useState(null)
  const [seriesData, setSeriesData]   = useState({})
  const [showCaritas, setShowCaritas] = useState(false)
  const [diaTerminado, setDiaTerminado] = useState(null)
  const lastTap                       = useRef({})
  const [bloquesActivos, setBloquesActivos] = useState<any[]>([])
  const [ultimoPago, setUltimoPago]   = useState<any>(null)
  const [loadingPago, setLoadingPago] = useState(false)
  const [racha, setRacha]             = useState(0)

  // ✅ Estado del formulario de perfil editable
  const [editando, setEditando]       = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [formPerfil, setFormPerfil]   = useState({
    telefono: '', edad: '', sexo: '', objetivo: '', nivel: 'Principiante', restricciones: ''
  })

  const [brand, setBrand] = useState({
    name: 'Pulse',
    imageUrl: null as string | null,
    primaryColor: '#5B8CFF',
    isPro: false,
  })

  useEffect(() => { loadData() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // ✅ Ficha completa si tiene objetivo
  function fichaCompleta(p: any) {
    return !!(p?.objetivo && p.objetivo.trim().length > 0)
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
    if (!p) { router.push('/login'); return }
    if (p.rol === 'admin') { router.push('/admin'); return }
    setPerfil(p)

    // Inicializar form con datos actuales
    setFormPerfil({
      telefono: p.telefono || '',
      edad: p.edad ? String(p.edad) : '',
      sexo: p.sexo || '',
      objetivo: p.objetivo || '',
      nivel: p.nivel || 'Principiante',
      restricciones: p.restricciones || '',
    })

    // Si la ficha está incompleta, ir directamente al perfil
    if (!fichaCompleta(p)) {
      setTab('perfil')
      setEditando(true)
    }

    if (p.admin_id) {
      const { data: adminPerfil } = await supabase
        .from('perfiles')
        .select('plan, brand_name, brand_image_url, primary_color')
        .eq('id', p.admin_id)
        .single()
      if (adminPerfil) {
        const isPro = adminPerfil.plan === 'pro'
        setBrand({
          name: isPro && adminPerfil.brand_name ? adminPerfil.brand_name : 'Pulse',
          imageUrl: isPro && adminPerfil.brand_image_url ? adminPerfil.brand_image_url : null,
          primaryColor: isPro && adminPerfil.primary_color ? adminPerfil.primary_color : '#5B8CFF',
          isPro,
        })
      }
    }

    const { data: asig } = await supabase.from('asignaciones').select('plan_id').eq('alumno_id', user.id).eq('activo', true).single()
    if (asig) {
      const { data: planData } = await supabase.from('planes').select('*').eq('id', asig.plan_id).single()
      if (planData) {
        setPlan(planData)
        const { data: semsData } = await supabase.from('semanas').select(`*, dias(*, ejercicios(*), bloques(*, ejercicios(*)))`).eq('plan_id', planData.id).order('numero')
        setSemanas(semsData || [])
      }
    }
    const { data: pesosData } = await supabase.from('pesos').select('*').eq('alumno_id', user.id).order('fecha')
    setPesos(pesosData || [])
    const hoy = new Date().toISOString().split('T')[0]
    const { data: chkData } = await supabase.from('checkins').select('ejercicio_id').eq('alumno_id', user.id).eq('fecha', hoy)
    setCheckins((chkData || []).map(c => c.ejercicio_id).filter(Boolean))

    // ── Calcular racha ──
    const hace60 = new Date(); hace60.setDate(hace60.getDate() - 60)
    const { data: historial } = await supabase
      .from('checkins')
      .select('fecha')
      .eq('alumno_id', user.id)
      .gte('fecha', hace60.toISOString().split('T')[0])
      .order('fecha', { ascending: false })
    if (historial && historial.length > 0) {
      const diasConCheckin = [...new Set(historial.map((c: any) => c.fecha))]
      let streak = 0
      const today = new Date(); today.setHours(0,0,0,0)
      const ayer = new Date(today); ayer.setDate(ayer.getDate() - 1)
      const todayStr = today.toISOString().split('T')[0]
      const ayerStr = ayer.toISOString().split('T')[0]
      // La racha cuenta si tiene checkin hoy o ayer
      if (diasConCheckin.includes(todayStr) || diasConCheckin.includes(ayerStr)) {
        const startDate = diasConCheckin.includes(todayStr) ? today : ayer
        let cursor = new Date(startDate)
        while (true) {
          const cursorStr = cursor.toISOString().split('T')[0]
          if (diasConCheckin.includes(cursorStr)) {
            streak++
            cursor.setDate(cursor.getDate() - 1)
          } else { break }
        }
      }
      setRacha(streak)
    }

    setLoading(false)
    cargarFotosProgreso()
    const { data: pagoData } = await supabase.from('pagos').select('*').eq('alumno_id', user.id).order('fecha', { ascending: false }).limit(1).maybeSingle()
    setUltimoPago(pagoData)
  }

  // ✅ Guardar ficha del alumno
  async function guardarPerfil() {
    if (!formPerfil.objetivo || formPerfil.objetivo.trim().length < 3) {
      showToast('⚠️ El objetivo es obligatorio'); return
    }
    setSavingPerfil(true)
    const { error } = await supabase
      .from('perfiles')
      .update({
        telefono: formPerfil.telefono || null,
        edad: formPerfil.edad ? parseInt(formPerfil.edad) : null,
        sexo: formPerfil.sexo || null,
        objetivo: formPerfil.objetivo.trim(),
        nivel: formPerfil.nivel,
        restricciones: formPerfil.restricciones || null,
      })
      .eq('id', perfil!.id)

    setSavingPerfil(false)
    if (error) { showToast('⚠️ Error al guardar'); return }

    showToast('✅ Perfil actualizado')
    setEditando(false)
    loadData()
  }

  async function cargarFotosProgreso() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const { data } = await supabase.storage.from('fotos-progreso').list(user.id, { sortBy: { column: 'created_at', order: 'desc' } })
      if (!data) return
      const urls = data.map(f => {
        const { data: u } = supabase.storage.from('fotos-progreso').getPublicUrl(`${user.id}/${f.name}`)
        return { url: u.publicUrl, fecha: new Date(f.created_at).toLocaleDateString('es-AR') }
      })
      setFotosProgreso(urls)
    } catch(e) {}
  }

  async function cargarBloques(diaId: string) {
    const client = supabase as any
    const { data: bloques } = await client.from('bloques').select('*').eq('dia_id', diaId).order('orden', { ascending: true })
    if (!bloques || bloques.length === 0) { setBloquesActivos([]); return }
    const { data: ejercicios } = await client.from('ejercicios').select('*').in('bloque_id', bloques.map((b: any) => b.id)).order('orden', { ascending: true })
    setBloquesActivos(bloques.map((b: any) => ({ ...b, ejercicios: (ejercicios || []).filter((e: any) => e.bloque_id === b.id) })))
  }

  async function toggleCheckin(ejercicioId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const hoy = new Date().toISOString().split('T')[0]
    if (checkins.includes(ejercicioId)) {
      await supabase.from('checkins').delete().eq('alumno_id', user.id).eq('ejercicio_id', ejercicioId).eq('fecha', hoy)
      setCheckins(prev => prev.filter(id => id !== ejercicioId))
    } else {
      await supabase.from('checkins').insert({ alumno_id: user.id, ejercicio_id: ejercicioId, fecha: hoy })
      setCheckins(prev => [...prev, ejercicioId])
      showToast('✅ Ejercicio completado!')
    }
  }

  async function handleDoubleTap(ej) {
    const now = Date.now()
    const last = (lastTap.current)[ej.id] || 0
    if (now - last < 500) {
      setSeriesData(p => ({ ...p, [ej.id]: p[ej.id] || Array.from({length: ej.series || 3}, () => ({ peso: '', rpe: '', rir: '' })) }))
      setEjActivo(ej)
    } else {
      toggleCheckin(ej.id)
      const ejsDia = bloquesActivos.flatMap((b: any) => b.ejercicios || [])
      const nuevos = checkins.includes(ej.id) ? checkins.filter(id => id !== ej.id) : [...checkins, ej.id]
      if (ejsDia.length > 0 && ejsDia.every(e => nuevos.includes(e.id))) {
        setTimeout(() => { setDiaTerminado(diaActivo); setShowCaritas(true) }, 600)
        // ✅ Notificar al trainer
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u && diaActivo) {
          const { data: asig } = await supabase.from('asignaciones').select('plan_id').eq('alumno_id', u.id).eq('activo', true).single()
          const { data: planData } = asig ? await supabase.from('planes').select('nombre').eq('id', asig.plan_id).single() : { data: null }
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-trainer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              alumnoId: u.id,
              diaId: (diaActivo as any).id,
              diaNombre: `${(diaActivo as any).dia}${(diaActivo as any).tipo ? ' — ' + (diaActivo as any).tipo : ''}`,
              planNombre: planData?.nombre || '',
            }),
          }).catch(() => {}) // silencioso si falla
        }
      }
    }
    ;(lastTap.current)[ej.id] = now
  }

  function updateSerie(ejId, idx, campo, valor) {
    setSeriesData(p => { const s = [...(p[ejId] || [])]; s[idx] = { ...s[idx], [campo]: valor }; return { ...p, [ejId]: s } })
  }

  async function guardarSeries(ej) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const hoy = new Date().toISOString().split('T')[0]
    await supabase.from('checkins').upsert({ alumno_id: user.id, ejercicio_id: ej.id, fecha: hoy }, { onConflict: 'alumno_id,ejercicio_id,fecha' })
    if (!checkins.includes(ej.id)) setCheckins(p => [...p, ej.id])
    setEjActivo(null)
    showToast('✅ Series guardadas!')
  }

  async function guardarPeso() {
    const val = parseFloat(nuevoPeso)
    if (!val || val < 20 || val > 300) { showToast('⚠️ Ingresá un valor válido'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pesos').insert({ alumno_id: user.id, valor: val })
    setNuevoPeso('')
    setShowPesoModal(false)
    showToast('⚖️ Peso registrado!')
    loadData()
  }

  async function subirFotoProgreso() {
    if (!fotoUpload) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ts = Date.now(); const ext = fotoUpload.name.split('.').pop()
    const { data: uploadData, error } = await supabase.storage.from('fotos-progreso').upload(`${user.id}/${ts}.${ext}`, fotoUpload, { upsert: false })
    if (error) { showToast('⚠️ Error al subir la foto'); return }
    const { data: urlData } = supabase.storage.from('fotos-progreso').getPublicUrl(uploadData.path)
    setFotosProgreso(p => [{ url: urlData.publicUrl, fecha: new Date().toLocaleDateString('es-AR') }, ...p])
    setShowFotoModal(false); setFotoUpload(null); setFotoPreview(null)
    showToast('📸 Foto guardada!')
  }

  async function logout() { await supabase.auth.signOut(); router.push('/login') }

  async function handlePagar() {
    setLoadingPago(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('perfiles').select('admin_id').eq('id', user.id).single()
      if (!p?.admin_id) { showToast('⚠️ No tenés profe asignado'); setLoadingPago(false); return }
      const res = await fetch('/api/mp/crear-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumnoId: user.id, adminId: p.admin_id }),
      })
      const data = await res.json()
      if (!res.ok) { showToast('⚠️ ' + (data.error || 'Error al procesar')); setLoadingPago(false); return }
      window.location.href = data.init_point
    } catch {
      showToast('⚠️ Error inesperado')
      setLoadingPago(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#5B8CFF', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Cargando...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )

  const diasSemana1 = semanas[0]?.dias || []
  // ✅ Incluir ejercicios de bloques en el conteo
  function getEjsDia(dia: any): any[] {
    const sueltos = dia.ejercicios || []
    const deBloques = (dia.bloques || []).flatMap((b: any) => b.ejercicios || [])
    return [...sueltos, ...deBloques]
  }
  const completadosHoy = diasSemana1.flatMap(d => getEjsDia(d)).filter((e: Ejercicio) => checkins.includes(e.id)).length
  const totalEjs = diasSemana1.flatMap(d => getEjsDia(d)).length
  const ini = `${perfil?.nombre?.[0] || ''}${perfil?.apellido?.[0] || ''}`.toUpperCase()
  const pesoActual = pesos.length > 0 ? pesos[pesos.length - 1].valor : null
  const wine = brand.primaryColor

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f9fafb; }
        .d-root { min-height: 100vh; background: #f9fafb; max-width: 430px; margin: 0 auto; position: relative; font-family: 'DM Sans', sans-serif; }
        .d-section { padding-bottom: 90px; }
        .d-header { padding: 20px 20px 14px; border-bottom: 1px solid #f3f4f6; }
        .d-eyebrow { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
        .d-title { font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.3px; }
        .d-card { background: #fff; border-radius: 16px; border: 1px solid #f3f4f6; padding: 16px; }
        .d-input { width: 100%; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: 'DM Sans', sans-serif; color: #111827; outline: none; }
        .d-input:focus { border-color: ${wine}; }
        .d-btn-primary { width: 100%; background: ${wine}; color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; }
        .d-btn-ghost { background: transparent; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #374151; cursor: pointer; }
        .d-field-label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .d-animate { animation: slideUp .3s ease both; }
      `}</style>

      <div className="d-root">

        {toast && (
          <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap' }}>
            {toast}
          </div>
        )}

        {/* ── TAB INICIO ── */}
        {tab === 'inicio' && (
          <div className="d-section d-animate">
            <div style={{ padding: '32px 20px 20px', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500', marginBottom: '2px' }}>
                    {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: wine, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>{brand.name}</div>
                  <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: '26px', fontWeight: '900', color: '#111827', letterSpacing: '-0.3px' }}>
                    Hola, {perfil?.nombre} 👋
                  </div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0, overflow: 'hidden', border: `2px solid ${wine}30` }}>
                  {brand.imageUrl
                    ? <img src={brand.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : !brand.isPro
                      ? <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#5B8CFF"/><text x="14" y="20" textAnchor="middle" fontFamily="Georgia,serif" fontSize="17" fontWeight="700" fill="#000">P</text></svg>
                      : <span style={{ fontSize: 15 }}>{ini}</span>
                  }
                </div>
              </div>

              {/* Aviso ficha incompleta */}
              {!fichaCompleta(perfil) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📋</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>Completá tu ficha</div>
                    <div style={{ fontSize: 12, color: '#b45309' }}>Tu entrenadora necesita tus datos para personalizar tu plan.</div>
                  </div>
                  <button onClick={() => { setTab('perfil'); setEditando(true) }}
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    Completar →
                  </button>
                </div>
              )}

              {plan ? (
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 16px', border: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{plan.nombre}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: wine }}>{totalEjs > 0 ? Math.round(completadosHoy / totalEjs * 100) : 0}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: wine, borderRadius: 3, width: `${totalEjs > 0 ? Math.round(completadosHoy / totalEjs * 100) : 0}%`, transition: 'width .5s' }} />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '16px', border: '1px dashed #e5e7eb', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>Tu profesora está preparando tu plan</div>
                </div>
              )}
            </div>

            <div style={{ padding: '20px' }}>
              {/* ── Racha de adherencia ── */}
              {racha > 0 && (
                <div style={{ background: racha >= 7 ? '#fffbeb' : racha >= 3 ? '#fff7ed' : '#f9fafb', border: `1px solid ${racha >= 7 ? '#fde68a' : racha >= 3 ? '#fed7aa' : '#f3f4f6'}`, borderRadius: 16, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>
                    {racha >= 14 ? '🏆' : racha >= 7 ? '🔥' : racha >= 3 ? '⚡' : '✨'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{racha}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{racha === 1 ? 'día seguido' : 'días seguidos'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {racha >= 14 ? '¡Sos una máquina! Racha legendaria 🏆' :
                       racha >= 7  ? '¡Semana completa! Seguí así 🔥' :
                       racha >= 3  ? '¡Vas muy bien! No pares ahora ⚡' :
                       '¡Buen comienzo! Mañana seguís la racha'}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
                {[
                  { n: completadosHoy, label: 'Hoy', color: '#111827' },
                  { n: racha > 0 ? `${racha}🔥` : '—', label: 'Racha', color: racha >= 7 ? '#d97706' : racha >= 3 ? '#ea580c' : '#111827' },
                  { n: pesoActual ? `${pesoActual}kg` : '—', label: 'Peso', color: '#111827' },
                ].map(({ n, label, color }) => (
                  <div key={label} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>{n}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
                  </div>
                ))}
              </div>

              {diasSemana1.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Esta semana</div>
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden', marginBottom: 20 }}>
                    {diasSemana1.map((dia: any, i: number) => {
                      const ejsDia = getEjsDia(dia)
                      const doneCount = ejsDia.filter((e: Ejercicio) => checkins.includes(e.id)).length
                      const allDone = ejsDia.length > 0 && doneCount === ejsDia.length
                      return (
                        <div key={dia.id}
                          onClick={() => { setTab('plan'); setBloquesActivos([]); setDiaActivo(dia); cargarBloques(dia.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < diasSemana1.length - 1 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: allDone ? '#f0fdf4' : '#f9fafb', border: `1px solid ${allDone ? '#bbf7d0' : '#f3f4f6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                            {allDone ? '✅' : '▶️'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{dia.dia}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{dia.tipo || '—'}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#16a34a' : wine, background: allDone ? '#f0fdf4' : '#fdf2f5', borderRadius: 20, padding: '3px 10px' }}>
                            {allDone ? 'Hecho' : `${doneCount}/${ejsDia.length}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {perfil?.restricciones && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>📌</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Observación médica</div>
                    <div style={{ fontSize: 13, color: '#78350f' }}>{perfil.restricciones}</div>
                  </div>
                </div>
              )}

              {perfil?.precio_mensual && (
                <div style={{ marginTop: 16, background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Cuota mensual</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', fontFamily: 'Fraunces, Georgia, serif' }}>
                        ${Number(perfil.precio_mensual).toLocaleString('es-AR')} ARS
                      </div>
                      {ultimoPago?.estado === 'aprobado' && (
                        <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                          ✓ Pago confirmado — {new Date(ultimoPago.fecha).toLocaleDateString('es-AR')}
                        </div>
                      )}
                      {ultimoPago?.estado === 'pendiente' && (
                        <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>⏳ Pago pendiente</div>
                      )}
                    </div>
                    <button onClick={handlePagar} disabled={loadingPago || ultimoPago?.estado === 'aprobado'}
                      style={{ background: ultimoPago?.estado === 'aprobado' ? '#f0fdf4' : wine, color: ultimoPago?.estado === 'aprobado' ? '#16a34a' : '#fff', border: ultimoPago?.estado === 'aprobado' ? '1px solid #bbf7d0' : 'none', borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: ultimoPago?.estado === 'aprobado' ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: loadingPago ? 0.7 : 1, flexShrink: 0 }}>
                      {loadingPago ? 'Procesando...' : ultimoPago?.estado === 'aprobado' ? '✓ Pagado' : 'Pagar mes →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB PLAN ── */}
        {tab === 'plan' && !diaActivo && (
          <div className="d-section d-animate">
            <div className="d-header">
              <div className="d-eyebrow">Mi entrenamiento</div>
              <div className="d-title">Mi Plan</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {!plan ? (
                <div style={{ textAlign: 'center', padding: '56px 24px', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Tu profesora todavía no asignó un plan.</p>
                </div>
              ) : (
                <>
                  <div style={{ background: wine, borderRadius: 16, padding: '16px 18px', marginBottom: 20, color: '#fff' }}>
                    <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Plan activo</div>
                    <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{plan.nombre}</div>
                    <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>🎯 {plan.objetivo}</span>
                  </div>
                  {semanas.map((sem: any) => (
                    <div key={sem.id} style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: wine, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: wine, color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{sem.numero}</span>
                        Semana {sem.numero}
                      </div>
                      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                        {(sem.dias || []).map((dia: any, i: number) => {
                          const ejs = getEjsDia(dia)
                          const done = ejs.filter((e: Ejercicio) => checkins.includes(e.id)).length
                          const allDone = ejs.length > 0 && done === ejs.length
                          return (
                            <div key={dia.id}
                              onClick={() => { const fullDia = semanas.flatMap((s: any) => s.dias || []).find((d: any) => d.id === dia.id) || dia; setBloquesActivos([]); setDiaActivo(fullDia); cargarBloques(fullDia.id) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < (sem.dias || []).length - 1 ? '1px solid #f9fafb' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <div style={{ width: 40, height: 40, borderRadius: 12, background: allDone ? '#f0fdf4' : '#f9fafb', border: `1px solid ${allDone ? '#bbf7d0' : '#f3f4f6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                {allDone ? '✅' : '▶️'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{dia.dia}</div>
                                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{dia.tipo || '—'}</div>
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#16a34a' : wine, background: allDone ? '#f0fdf4' : '#fdf2f5', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
                                {allDone ? '✓ Hecho' : `${done}/${ejs.length}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB PLAN - Detalle día ── */}
        {tab === 'plan' && diaActivo && (
          <div className="d-section d-animate">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 40 }}>
              <button className="d-btn-ghost" onClick={() => setDiaActivo(null)}>← Volver</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{(diaActivo as any).dia}</div>
                {(diaActivo as any).tipo && <div style={{ fontSize: 11, color: '#9ca3af' }}>{(diaActivo as any).tipo}</div>}
              </div>
              <div style={{ width: 60 }} />
            </div>
            <div style={{ padding: '16px 20px' }}>
              {bloquesActivos.length > 0 ? bloquesActivos.map((bloque: any) => {
                const color = TIPO_COLOR[bloque.tipo] || wine
                const isCircuito = bloque.tipo === 'circuito' || bloque.tipo === 'superserie'
                return (
                  <div key={bloque.id} style={{ marginBottom: 16, borderRadius: 16, border: `1px solid ${color}25`, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ background: `${color}10`, padding: '10px 14px', borderBottom: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{TIPO_EMOJI[bloque.tipo] || '💪'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{bloque.nombre}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{TIPO_LABEL[bloque.tipo]}</div>
                        </div>
                      </div>
                      {isCircuito && bloque.rondas && (
                        <span style={{ background: `${color}20`, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700, color }}>🔁 {bloque.rondas} rondas</span>
                      )}
                    </div>
                    {bloque.descripcion && (
                      <div style={{ background: `${color}06`, padding: '8px 14px', fontSize: 12, color: '#6b7280', fontStyle: 'italic', borderBottom: `1px solid ${color}15` }}>
                        {bloque.descripcion}
                      </div>
                    )}
                    <div>
                      {(bloque.ejercicios || []).map((ej: any, i: number) => {
                        const done = checkins.includes(ej.id)
                        const series = seriesData[ej.id] || []
                        return (
                          <div key={ej.id} onClick={() => handleDoubleTap(ej)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderBottom: i < (bloque.ejercicios || []).length - 1 ? '1px solid #f9fafb' : 'none', background: done ? '#f0fdf4' : '#fff', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${done ? 'transparent' : '#e5e7eb'}`, background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, color: '#fff', marginTop: 2 }}>
                              {done ? '✓' : ''}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: done ? '#15803d' : '#111827' }}>{ej.nombre}</div>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6, fontStyle: 'italic' }}>Doble toque para registrar series</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {ej.series && <span style={{ background: '#fdf2f5', color: wine, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{ej.series} series</span>}
                                {ej.repeticiones && <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{ej.repeticiones} reps</span>}
                                {ej.carga && <span style={{ background: '#fffbeb', color: '#d97706', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>🏋️ {ej.carga}</span>}
                                {ej.descanso && ej.descanso !== '-' && <span style={{ background: '#f0f9ff', color: '#0284c7', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>⏱ {ej.descanso}</span>}
                              </div>
                              {ej.observaciones && <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 6 }}>💡 {ej.observaciones}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }) : (diaActivo as any).ejercicios?.length > 0 ? (
                (diaActivo as any).ejercicios.map((ej: Ejercicio, i: number) => {
                  const done = checkins.includes(ej.id)
                  return (
                    <div key={ej.id} onClick={() => handleDoubleTap(ej)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: done ? '#f0fdf4' : '#fff', borderRadius: 14, marginBottom: 8, border: `1px solid ${done ? '#bbf7d0' : '#f3f4f6'}`, cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${done ? 'transparent' : '#e5e7eb'}`, background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, marginTop: 2 }}>
                        {done ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: done ? '#15803d' : '#111827', marginBottom: 3 }}>{ej.nombre}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ background: '#fdf2f5', color: wine, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{ej.series} series</span>
                          <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{ej.repeticiones} reps</span>
                          {ej.carga && <span style={{ background: '#fffbeb', color: '#d97706', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>🏋️ {ej.carga}</span>}
                        </div>
                        {ej.observaciones && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>💡 {ej.observaciones}</div>}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Los ejercicios se cargarán pronto</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB PROGRESO ── */}
        {tab === 'progreso' && (
          <div className="d-section d-animate">
            <div className="d-header">
              <div className="d-eyebrow">Mi evolución</div>
              <div className="d-title">Progreso</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Fotos de progreso</div>
                <button onClick={() => setShowFotoModal(true)} style={{ background: wine, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Foto</button>
              </div>
              <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#9ca3af' }}>
                🔒 Solo vos y tu profesora pueden ver tus fotos
              </div>
              {fotosProgreso.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', marginBottom: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Todavía no subiste fotos</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
                  {fotosProgreso.map((f, i) => (
                    <div key={i} style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '1' }}>
                      <img src={f.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.5)', padding: '4px 6px', fontSize: 10, color: '#fff', textAlign: 'center' }}>{f.fecha}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Historial de peso</div>
                <button onClick={() => setShowPesoModal(true)} style={{ background: wine, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Registrar</button>
              </div>
              {pesos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>⚖️</div>
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Todavía no hay registros</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{pesos[pesos.length-1].valor}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>kg actual</div>
                    </div>
                    {pesos.length > 1 && (
                      <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: 14, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 900, lineHeight: 1, color: pesos[pesos.length-1].valor < pesos[0].valor ? '#16a34a' : '#dc2626' }}>
                          {pesos[pesos.length-1].valor < pesos[0].valor ? '-' : '+'}{Math.abs(+(pesos[pesos.length-1].valor - pesos[0].valor).toFixed(1))}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>kg diferencia</div>
                      </div>
                    )}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                    {[...pesos].reverse().map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < pesos.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>{new Date(p.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{p.valor} kg</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── TAB PERFIL — con formulario editable ── */}
        {tab === 'perfil' && (
          <div className="d-section d-animate">
            <div className="d-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="d-eyebrow">Mi cuenta</div>
                <div className="d-title">Perfil</div>
              </div>
              {!editando && (
                <button onClick={() => setEditando(true)}
                  style={{ background: wine + '15', color: wine, border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                  ✏️ Editar
                </button>
              )}
            </div>
            <div style={{ padding: '16px 20px' }}>

              {/* Card nombre */}
              <div style={{ background: wine, borderRadius: 20, padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#fff', flexShrink: 0 }}>{ini}</div>
                <div>
                  <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 900, color: '#fff' }}>{perfil?.nombre} {perfil?.apellido}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>DNI {perfil?.dni} · {perfil?.email}</div>
                </div>
              </div>

              {/* Ficha incompleta aviso */}
              {!fichaCompleta(perfil) && !editando && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#92400e' }}>
                  ⚠️ Tu ficha está incompleta. Completala para que tu entrenadora pueda personalizar tu plan.
                </div>
              )}

              {/* MODO LECTURA */}
              {!editando && (
                <>
                  {perfil?.objetivo && (
                    <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>🎯 Mi objetivo</div>
                      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{perfil.objetivo}</p>
                    </div>
                  )}
                  <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
                    {[['Teléfono', perfil?.telefono], ['Edad', perfil?.edad ? `${perfil.edad} años` : '—'], ['Sexo', perfil?.sexo], ['Nivel', perfil?.nivel], ['Restricciones', perfil?.restricciones || 'Ninguna']].map(([k, v], i, arr) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>{k}</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: v ? '#111827' : '#d1d5db', textAlign: 'right', maxWidth: '60%' }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* MODO EDICIÓN */}
              {editando && (
                <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
                  {!fichaCompleta(perfil) && (
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#0369a1' }}>
                      📋 Completá tus datos para que tu entrenadora pueda personalizar tu entrenamiento.
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label className="d-field-label">Objetivo *</label>
                    <textarea
                      value={formPerfil.objetivo}
                      onChange={e => setFormPerfil(p => ({ ...p, objetivo: e.target.value }))}
                      placeholder="Ej: bajar 5 kilos, ganar masa muscular, mejorar resistencia..."
                      style={{ width: '100%', background: '#f9fafb', border: `1.5px solid ${formPerfil.objetivo ? '#e5e7eb' : wine}`, borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#111827', outline: 'none', resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label className="d-field-label">Teléfono</label>
                      <input className="d-input" type="text" placeholder="11-0000-0000" value={formPerfil.telefono} onChange={e => setFormPerfil(p => ({ ...p, telefono: e.target.value }))} />
                    </div>
                    <div>
                      <label className="d-field-label">Edad</label>
                      <input className="d-input" type="number" placeholder="30" value={formPerfil.edad} onChange={e => setFormPerfil(p => ({ ...p, edad: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label className="d-field-label">Sexo</label>
                      <select className="d-input" value={formPerfil.sexo} onChange={e => setFormPerfil(p => ({ ...p, sexo: e.target.value }))}>
                        <option value="">—</option>
                        {['Femenino','Masculino','No binario','Prefiero no decir'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="d-field-label">Nivel</label>
                      <select className="d-input" value={formPerfil.nivel} onChange={e => setFormPerfil(p => ({ ...p, nivel: e.target.value }))}>
                        {['Principiante','Intermedio','Avanzado'].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="d-field-label">Restricciones médicas <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 11, color: '#9ca3af' }}>(opcional)</span></label>
                    <input className="d-input" type="text" placeholder="Ej: dolor de rodilla, hernia..." value={formPerfil.restricciones} onChange={e => setFormPerfil(p => ({ ...p, restricciones: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {fichaCompleta(perfil) && (
                      <button onClick={() => setEditando(false)}
                        style={{ flex: 1, background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 500, color: '#6b7280', fontFamily: 'inherit', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    )}
                    <button className="d-btn-primary" onClick={guardarPerfil} disabled={savingPerfil}
                      style={{ flex: 2, opacity: savingPerfil ? 0.7 : 1 }}>
                      {savingPerfil ? 'Guardando...' : 'Guardar ficha ✓'}
                    </button>
                  </div>
                </div>
              )}

              <button onClick={logout} style={{ width: '100%', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 500, color: '#6b7280', fontFamily: 'inherit', cursor: 'pointer' }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* ── TAB AYUDA ── */}
        {tab === 'ayuda' && (
          <div className="d-section d-animate" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
            <div className="d-header">
              <div className="d-eyebrow">Soporte</div>
              <div className="d-title">Ayuda</div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <SoporteChat userType="alumno" userName={perfil?.nombre} primaryColor={brand.primaryColor} />
            </div>
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #f3f4f6', display: 'flex', padding: '8px 0 20px', zIndex: 100 }}>
          {[
            { key: 'inicio', icon: '⊞', label: 'Inicio' },
            { key: 'plan',   icon: '▤', label: 'Mi Plan' },
            { key: 'progreso', icon: '↑', label: 'Progreso' },
            { key: 'ayuda',  icon: '?', label: 'Ayuda' },
            { key: 'perfil', icon: '◉', label: 'Perfil' },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => { setTab(key as any); if (key === 'plan') setDiaActivo(null); if (key === 'perfil') setEditando(false) }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', position: 'relative' }}>
              <span style={{ fontSize: 18, color: tab === key ? wine : '#d1d5db', transition: '.2s', fontWeight: 'bold' }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: tab === key ? wine : '#9ca3af' }}>{label}</span>
              {/* Punto rojo si ficha incompleta en perfil */}
              {key === 'perfil' && !fichaCompleta(perfil) && (
                <span style={{ position: 'absolute', top: 4, right: '50%', marginRight: -14, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '1.5px solid #fff' }} />
              )}
            </button>
          ))}
        </nav>

        {/* ── MODAL PESO ── */}
        {showPesoModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowPesoModal(false)}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: 28, width: '100%', maxWidth: 430 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 18 }}>Registrar peso</div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Peso actual (kg)</label>
              <input className="d-input" type="number" step="0.1" min="20" max="300" placeholder="Ej: 65.5" value={nuevoPeso} onChange={e => setNuevoPeso(e.target.value)} style={{ marginBottom: 16 }} />
              <button className="d-btn-primary" onClick={guardarPeso}>Guardar ✓</button>
            </div>
          </div>
        )}

        {/* ── MODAL SERIES ── */}
        {ejActivo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEjActivo(null)}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px', width: '100%', maxWidth: 430, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 900, color: '#111827' }}>{ejActivo.nombre}</div>
                <button onClick={() => setEjActivo(null)} style={{ background: '#f9fafb', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#6b7280' }}>✕</button>
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>{ejActivo.series} series · {ejActivo.repeticiones} reps {ejActivo.carga ? `· ${ejActivo.carga}` : ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div />
                {['⚖️ Peso', 'RPE', 'RIR'].map(l => (
                  <div key={l} style={{ fontSize: 10, fontWeight: 700, color: wine, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>{l}</div>
                ))}
              </div>
              {(seriesData[ejActivo.id] || Array.from({length: ejActivo.series}, () => ({peso:'',rpe:'',rir:''}))).map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>{i+1}</div>
                  {['peso','rpe','rir'].map(campo => (
                    <input key={campo} type="number"
                      placeholder={campo === 'peso' ? '0' : campo === 'rpe' ? '1-10' : '0'}
                      value={s[campo] || ''}
                      onChange={e => updateSerie(ejActivo.id, i, campo, e.target.value)}
                      style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 8px', fontSize: 14, textAlign: 'center', width: '100%', fontFamily: 'inherit', outline: 'none' }} />
                  ))}
                </div>
              ))}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginBottom: 16, marginTop: 8, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                <strong style={{ color: wine }}>RPE</strong> = esfuerzo percibido (1 fácil → 10 máximo) &nbsp;·&nbsp; <strong style={{ color: wine }}>RIR</strong> = reps que te quedaron
              </div>
              <button className="d-btn-primary" onClick={() => guardarSeries(ejActivo)}>Guardar series ✓</button>
            </div>
          </div>
        )}

        {/* ── MODAL FOTOS ── */}
        {showFotoModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowFotoModal(false)}>
            <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px', width: '100%', maxWidth: 430 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Foto de progreso</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 18 }}>🔒 Solo vos y tu profesora pueden verla</div>
              {fotoPreview ? (
                <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', maxHeight: 280 }}>
                  <img src={fotoPreview} style={{ width: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div onClick={() => fotoRef.current?.click()}
                  style={{ background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 14, padding: 40, textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Tocá para elegir una foto</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Desde tu galería o cámara</div>
                </div>
              )}
              <input ref={fotoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files[0]; if (!f) return
                  setFotoUpload(f)
                  const r = new FileReader(); r.onload = ev => setFotoPreview(ev.target.result); r.readAsDataURL(f)
                }} />
              {fotoPreview && (
                <button onClick={() => fotoRef.current?.click()} style={{ width: '100%', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 500, color: '#6b7280', fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10 }}>
                  Cambiar foto
                </button>
              )}
              <button className="d-btn-primary" onClick={subirFotoProgreso} disabled={!fotoUpload} style={{ opacity: fotoUpload ? 1 : 0.5 }}>
                Guardar foto ✓
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL CARITAS ── */}
        {showCaritas && diaTerminado && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px 24px', width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.15)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 900, color: '#111827', marginBottom: 6 }}>¡Día completado!</div>
              <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>Terminaste {diaTerminado.dia}. ¿Cómo te sentiste?</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
                {[{ emoji: '😫', label: 'Muy difícil' }, { emoji: '😓', label: 'Difícil' }, { emoji: '😊', label: 'Bien' }, { emoji: '💪', label: 'Fuerte' }, { emoji: '🔥', label: '¡Genial!' }].map(({ emoji, label }) => (
                  <div key={emoji} onClick={() => { showToast(`¡${label}! Seguí así 💪`); setShowCaritas(false) }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 12, cursor: 'pointer', border: '1.5px solid #f3f4f6', transition: '.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = wine)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#f3f4f6')}>
                    <span style={{ fontSize: 26 }}>{emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowCaritas(false)} style={{ width: '100%', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#6b7280', fontFamily: 'inherit', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
