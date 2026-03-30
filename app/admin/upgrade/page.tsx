// @ts-nocheck
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function UpgradeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const descuentoParam = searchParams.get('descuento')
  const descuento = descuentoParam ? parseInt(descuentoParam) : 0

  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  useEffect(() => {
    async function loadPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre, email, plan, primary_color, secondary_color')
        .eq('id', user.id)
        .single()

      if (!data) { router.push('/login'); return }
      if (data.plan === 'pro') { router.push('/admin'); return }

      setPerfil(data)
      setLoadingPerfil(false)
    }
    loadPerfil()
  }, [])

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/mp/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: perfil.id,
          email: perfil.email,
          nombre: perfil.nombre,
          descuento,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar')

      window.location.href = data.init_point
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  if (loadingPerfil) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E0D8D0', borderTopColor: '#5B8CFF', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const precioBase = 25000
  const precioFinal = descuento ? Math.round(precioBase * (1 - descuento / 100)) : precioBase

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

        .u-root {
          min-height: 100vh;
          background: #F5F2EE;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'DM Sans', sans-serif;
        }
        .u-wrap { width: 100%; max-width: 580px; animation: slideUp .45s cubic-bezier(.22,.68,0,1.2) both; }
        .u-header { text-align: center; margin-bottom: 36px; }
        .u-title { font-family: 'Fraunces', Georgia, serif; font-size: 32px; font-weight: 900; color: #1C1714; margin-bottom: 8px; letter-spacing: -0.5px; }
        .u-sub { font-size: 15px; color: #9E9188; }
        .u-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        @media (max-width: 500px) { .u-plans { grid-template-columns: 1fr; } }
        .u-card { background: #ffffff; border-radius: 20px; padding: 28px 24px; border: 1px solid #E6E0DA; position: relative; }
        .u-card.pro { border: 2px solid #5B8CFF; box-shadow: 0 4px 24px #5B8CFF20; }
        .u-card.pro::before { content: ''; position: absolute; top: 0; left: 32px; right: 32px; height: 2.5px; background: linear-gradient(90deg, #5B8CFF, #4A74D9); border-radius: 0 0 6px 6px; }
        .u-badge { display: inline-block; background: #5B8CFF; color: white; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.05em; margin-bottom: 12px; text-transform: uppercase; }
        .u-discount-badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-left: 6px; }
        .u-plan-name { font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 900; color: #1C1714; margin-bottom: 6px; }
        .u-price { font-size: 36px; font-weight: 700; color: #1C1714; margin-bottom: 2px; line-height: 1; }
        .u-price-original { font-size: 16px; color: #9E9188; text-decoration: line-through; margin-bottom: 2px; }
        .u-price-sub { font-size: 12px; color: #9E9188; margin-bottom: 20px; }
        .u-divider { border: none; border-top: 1px solid #F0EBE5; margin: 16px 0; }
        .u-feature { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; font-size: 13.5px; color: #3C3430; }
        .u-check { width: 16px; height: 16px; border-radius: 50%; background: #5B8CFF18; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; font-size: 9px; color: #5B8CFF; font-weight: 700; }
        .u-check.gray { background: #F0EBE5; color: #BDB5AD; }
        .u-cta { width: 100%; background: #5B8CFF; color: white; border: none; border-radius: 13px; padding: 15px; font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: opacity .15s, transform .12s; box-shadow: 0 2px 8px #5B8CFF35; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 20px; }
        .u-cta:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .u-cta:disabled { opacity: .6; cursor: not-allowed; }
        .u-cta-free { width: 100%; background: transparent; color: #9E9188; border: 1px solid #E0D8D0; border-radius: 13px; padding: 14px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: background .15s; margin-top: 20px; }
        .u-cta-free:hover { background: #F0EBE5; }
        .u-spinner { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,.4); border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; }
        .u-error { background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 10px; padding: 12px 16px; color: #C53030; font-size: 13.5px; text-align: center; margin-bottom: 16px; }
        .u-guarantee { text-align: center; font-size: 12.5px; color: #BDB5AD; margin-top: 16px; }
        .u-back { text-align: center; margin-top: 20px; }
        .u-back a { font-size: 13.5px; color: #9E9188; text-decoration: none; border-bottom: 1px solid #E0D8D0; }
      `}</style>

      <div className="u-root">
        <div className="u-wrap">

          <div className="u-header">
            <div className="u-title">Elegí tu plan</div>
            <div className="u-sub">
              {descuento ? `Tenés un ${descuento}% de descuento aplicado 🎉` : 'Empezá gratis. Crecé cuando estés lista.'}
            </div>
          </div>

          {error && <div className="u-error">⚠️ {error}</div>}

          <div className="u-plans">

            {/* FREE */}
            <div className="u-card">
              <div className="u-plan-name">Free</div>
              <div className="u-price">$0</div>
              <div className="u-price-sub">Para siempre</div>
              <hr className="u-divider" />
              {['Hasta 2 alumnos', 'Rutinas básicas', 'App del alumno', 'Seguimiento de asistencia'].map(f => (
                <div key={f} className="u-feature"><div className="u-check">✓</div><span>{f}</span></div>
              ))}
              {['Branding propio', 'Alumnos ilimitados', 'Comisión reducida en cobros'].map(f => (
                <div key={f} className="u-feature" style={{ opacity: 0.4 }}><div className="u-check gray">✕</div><span>{f}</span></div>
              ))}
              <button className="u-cta-free" onClick={() => router.push('/admin')}>
                Continuar gratis
              </button>
            </div>

            {/* PRO */}
            <div className="u-card pro">
              <div className="u-badge">
                Recomendado
                {descuento > 0 && <span className="u-discount-badge">{descuento}% OFF</span>}
              </div>
              <div className="u-plan-name">Pro</div>
              {descuento > 0 && (
                <div className="u-price-original">${precioBase.toLocaleString('es-AR')} ARS</div>
              )}
              <div className="u-price">${Number(precioFinal).toLocaleString('es-AR')} <span style={{ fontSize: 16, fontWeight: 400, color: '#9E9188' }}>ARS</span></div>
              <div className="u-price-sub">por mes · se renueva automáticamente</div>
              <hr className="u-divider" />
              {[
                'Todo lo de Free',
                'Alumnos ilimitados',
                'Branding 100% tuyo — logo y colores',
                'Cobrá a tus alumnos desde la app',
                'Comisión reducida 5% (vs 8% en Free)',
                'Soporte prioritario',
              ].map(f => (
                <div key={f} className="u-feature"><div className="u-check">✓</div><span>{f}</span></div>
              ))}
              <button className="u-cta" onClick={handleUpgrade} disabled={loading}>
                {loading ? <><div className="u-spinner" /> Procesando...</> : 'Activar PRO →'}
              </button>
            </div>

          </div>

          <div className="u-guarantee">
            🔒 Pago seguro con Mercado Pago · Cancelá cuando quieras
          </div>

          <div className="u-back">
            <a href="/admin">← Volver al dashboard</a>
          </div>

        </div>
      </div>
    </>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F5F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E0D8D0', borderTopColor: '#5B8CFF', borderRadius: '50%' }} />
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  )
}
