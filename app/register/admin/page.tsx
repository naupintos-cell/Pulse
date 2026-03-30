// @ts-nocheck
'use client'

import { useState, Suspense } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan')
  const isPro = planParam === 'pro'
  const supabase = createClient()

  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', email: '', password: '', codigo: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [descuento, setDescuento] = useState<number | null>(null)

  function track(event: string, params?: Record<string, any>) {
    try { sendGAEvent('event', event, params || {}) } catch(e) {}
  }

  // Evento cuando llega a la página de registro
  useState(() => {
    track('register_start', { plan: isPro ? 'pro' : 'free' })
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  async function validarCodigo(codigo: string) {
    if (!codigo || codigo.length < 3) { setDescuento(null); return }
    const { data } = await supabase
      .from('codigos_invitacion')
      .select('descuento_porcentaje, usado, tipo')
      .eq('codigo', codigo.toUpperCase())
      .eq('tipo', 'descuento')
      .maybeSingle()
    if (data && !data.usado && data.descuento_porcentaje) {
      setDescuento(data.descuento_porcentaje)
    } else {
      setDescuento(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!form.dni || !/^\d{7,12}$/.test(form.dni)) {
        throw new Error('DNI inválido — solo números, sin puntos')
      }

      const { data: dniExiste } = await supabase
        .from('perfiles')
        .select('id')
        .eq('dni', form.dni)
        .maybeSingle()

      if (dniExiste) throw new Error('Ya existe una cuenta con ese DNI')

      let codigoId = null
      if (isPro && form.codigo) {
        const { data: codigoData } = await supabase
          .from('codigos_invitacion')
          .select('id, usado, descuento_porcentaje, tipo')
          .eq('codigo', form.codigo.toUpperCase())
          .eq('tipo', 'descuento')
          .maybeSingle()

        if (!codigoData) throw new Error('Código de descuento inválido')
        if (codigoData.usado) throw new Error('Este código ya fue utilizado')
        codigoId = codigoData.id
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { nombre: form.nombre, apellido: form.apellido } },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('No se pudo crear el usuario')

      const { error: profileError } = await supabase
        .from('perfiles')
        .upsert({
          id: authData.user.id,
          nombre: form.nombre,
          apellido: form.apellido,
          dni: form.dni,
          email: form.email,
          rol: 'admin',
          plan: 'free',
          primary_color: '#5B8CFF',
          secondary_color: '#4A74D9',
        })

      if (profileError) throw new Error('Error al guardar el perfil')

      if (codigoId) {
        await supabase
          .from('codigos_invitacion')
          .update({ usado: true, usado_por: authData.user.id })
          .eq('id', codigoId)
      }

      setSuccess(true)
      // Analytics — registro completado
      track('register_complete', {
        plan: isPro ? 'pro' : 'free',
        used_code: !!form.codigo,
      })
      setTimeout(() => {
        if (isPro) {
          const params = descuento ? `?descuento=${descuento}` : ''
          router.push(`/login?next=/admin/upgrade${params}`)
        } else {
          router.push('/login')
        }
      }, 2500)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.root}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div style={styles.title}>¡Cuenta creada!</div>
          <div style={styles.sub}>{isPro ? 'Redirigiendo para activar tu plan PRO...' : 'Redirigiendo al login...'}</div>
        </div>
      </div>
    )
  }

  const precioBase = 25000
  const precioFinal = descuento ? Math.round(precioBase * (1 - descuento / 100)) : precioBase

  return (
    <div style={styles.root}>
      <div style={styles.card}>

        <div style={styles.brand}>
          <div style={styles.logo}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#5B8CFF"/>
              <text x="16" y="22" textAnchor="middle" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#000000">P</text>
            </svg>
          </div>
          {isPro && <div style={styles.proBadge}>Plan PRO</div>}
          <div style={styles.title}>{isPro ? 'Crear cuenta PRO' : 'Registro de profesora'}</div>
          <div style={styles.sub}>{isPro ? 'Profesionalizá tu negocio sin límites' : 'Gratis para siempre, hasta 2 alumnos'}</div>
        </div>

        {/* Comparación de planes */}
        {isPro ? (
          <div style={{ background: '#EEF4FF', border: '1px solid #C7D9FF', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3B5BDB', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              ✦ Qué incluye el plan PRO
            </div>
            {[
              'Alumnos ilimitados',
              'App con tu logo y colores',
              'Nombre de marca propio',
              'Cobros con comisión reducida (5%)',
              'Soporte prioritario',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#3B5BDB', fontWeight: 700, fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 13, color: '#1e3a8a' }}>{item}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #C7D9FF', marginTop: 10, paddingTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#3B5BDB' }}>Precio mensual</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#3B5BDB' }}>${precioBase.toLocaleString('es-AR')}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>ARS/mes</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#F5F2EE', border: '1px solid #E6E0DA', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6B6259', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              Qué incluye el plan FREE
            </div>
            {[
              'Hasta 2 alumnos',
              'Constructor de rutinas completo',
              'App del alumno (marca Pulse)',
              'Cobros con comisión 8%',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ color: '#5B8CFF', fontWeight: 700, fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 13, color: '#374151' }}>{item}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E6E0DA', marginTop: 10, paddingTop: 10 }}>
              <a href="/register/admin?plan=pro" style={{ fontSize: 13, color: '#5B8CFF', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                ¿Querés más de 2 alumnos? Activá el plan PRO →
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={styles.label}>Nombre</label>
              <input style={styles.input} name="nombre" placeholder="María" value={form.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label style={styles.label}>Apellido</label>
              <input style={styles.input} name="apellido" placeholder="García" value={form.apellido} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <label style={styles.label}>DNI</label>
            <input
              style={styles.input}
              name="dni"
              placeholder="Sin puntos ni guiones"
              value={form.dni}
              onChange={e => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })}
              required
              maxLength={12}
            />
          </div>

          <div>
            <label style={styles.label}>Email</label>
            <input style={styles.input} name="email" type="email" placeholder="profe@email.com" value={form.email} onChange={handleChange} required />
          </div>

          <div>
            <label style={styles.label}>Contraseña</label>
            <input style={styles.input} name="password" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          {isPro && (
            <>
              <hr style={{ border: 'none', borderTop: '1px dashed #E0D8D0', margin: '4px 0' }} />
              <div>
                <label style={styles.label}>
                  Código de descuento{' '}
                  <span style={{ textTransform: 'none', fontWeight: 400, fontSize: 11, color: '#9E9188' }}>(opcional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, paddingRight: descuento ? 120 : 16 }}
                    name="codigo"
                    placeholder="Ej: PROMO20"
                    value={form.codigo}
                    onChange={e => { handleChange(e); validarCodigo(e.target.value) }}
                  />
                  {descuento && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {descuento}% OFF ✓
                    </div>
                  )}
                </div>
                {descuento && (
                  <div style={{ marginTop: 10, background: '#EEF4FF', border: '1px solid #C7D9FF', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#3B5BDB' }}>Precio con descuento</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 13, color: '#9E9188', textDecoration: 'line-through' }}>${precioBase.toLocaleString('es-AR')} ARS</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#3B5BDB' }}>${Number(precioFinal).toLocaleString('es-AR')} ARS</span>
                      <span style={{ fontSize: 11, color: '#9E9188' }}>/mes</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <div style={styles.error}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.cta, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando cuenta...' : isPro ? 'Crear cuenta y activar PRO →' : 'Crear cuenta gratis →'}
          </button>

        </form>

        <div style={styles.back}>
          ¿Ya tenés cuenta? <a href="/login" style={{ color: '#5B8CFF', fontWeight: 500, textDecoration: 'none' }}>Iniciá sesión</a>
        </div>

      </div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100vh', background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'DM Sans', sans-serif" },
  card: { background: '#ffffff', borderRadius: 24, padding: '48px 40px 40px', width: '100%', maxWidth: 420, border: '1px solid #E6E0DA', boxShadow: '0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)', position: 'relative' as const },
  brand: { textAlign: 'center' as const, marginBottom: 20 },
  logo: { width: 56, height: 56, borderRadius: 16, background: '#5B8CFF18', border: '1.5px solid #E6E0DA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  proBadge: { display: 'inline-block', background: '#5B8CFF', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' as const },
  title: { fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 900, color: '#1C1714', marginBottom: 4 },
  sub: { fontSize: 13.5, color: '#9E9188' },
  label: { display: 'block', fontSize: 11.5, fontWeight: 600, color: '#6B6259', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 6 },
  input: { width: '100%', background: '#FFFFFF', border: '1.5px solid #D8D0C8', borderRadius: 12, padding: '13px 16px', fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: '#1C1714', outline: 'none', boxSizing: 'border-box' as const },
  error: { background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 10, padding: '11px 14px', color: '#C53030', fontSize: 13.5, fontWeight: 500 },
  cta: { width: '100%', background: '#5B8CFF', color: '#ffffff', border: 'none', borderRadius: 13, padding: 15, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', boxShadow: '0 2px 8px #5B8CFF35', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  back: { textAlign: 'center' as const, marginTop: 18, fontSize: 13.5, color: '#9E9188' },
}

export default function RegisterAdminPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E0D8D0', borderTopColor: '#5B8CFF', borderRadius: '50%' }} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
