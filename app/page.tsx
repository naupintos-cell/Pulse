// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import './landing.css'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecking(false); return }
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      if (perfil?.rol === 'admin') router.push('/admin')
      else router.push('/dashboard')
    }
    checkSession()
    const navbar = document.getElementById('l-navbar')
    const onScroll = () => navbar?.classList.toggle('scrolled', window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (checking) return
    const timer = setTimeout(() => {
      const reveals = document.querySelectorAll('.l-reveal')
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('visible'), i * 80)
            observer.unobserve(entry.target)
          }
        })
      }, { threshold: 0.08 })
      reveals.forEach(el => observer.observe(el))
    }, 100)
    return () => clearTimeout(timer)
  }, [checking])

  if (checking) return null

  // ── Analytics helper ──
  function track(event: string, params?: Record<string, any>) {
    try { sendGAEvent('event', event, params || {}) } catch(e) {}
  }

  return (
    <div className="lp">

      {/* NAV */}
      <nav id="l-navbar" className="lp-nav">
        <div className="lp-logo">PULSE<span>.</span></div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <a href="/login" className="lp-nav-login">Iniciar sesión</a>
          <a href="/register/admin" className="lp-nav-cta" onClick={() => track('cta_click', { location: 'nav' })}>Empezar gratis</a>
        </div>
      </nav>

      {/* HERO */}
      <div className="lp-hero-outer">
        <div className="lp-hero-wrap">
          <img
            className="lp-hero-photo"
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=85&auto=format&fit=crop&crop=center"
            alt="Trainer guiando a su atleta"
          />
          <div className="lp-hero-overlay" />
          <div className="lp-hero-badge">Para trainers personales</div>
          <div className="lp-hero-content">
            <div className="lp-hero-eyebrow">Pulse</div>
            <h1>
              Dejá de administrar.<br />
              Empezá a<br />
              <em>entrenar.</em>
            </h1>
            <p className="lp-hero-sub">
              Rutinas, seguimiento y cobros <strong>en una sola app</strong>.<br />
              Tus atletas entrenan. Vos lo sabés al instante.
            </p>
            <div className="lp-cta-group">
              <a href="/register/admin" className="lp-btn-main" onClick={() => track('cta_click', { location: 'hero' })}>Crear mi app gratis →</a>
              <a href="#como-funciona" className="lp-btn-ghost-dark">Ver cómo funciona</a>
            </div>
            <div className="lp-hero-note">Gratis para tus primeros 2 atletas · Sin tarjeta</div>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-stat-pill">
              <div className="lp-stat-n">10<span>min</span></div>
              <div className="lp-stat-l">Para estar operativo</div>
            </div>
            <div className="lp-stat-pill">
              <div className="lp-stat-n"><span>$0</span></div>
              <div className="lp-stat-l">Para empezar</div>
            </div>
            <div className="lp-stat-pill">
              <div className="lp-stat-n">0<span>wsp</span></div>
              <div className="lp-stat-l">Para mandar rutinas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ANTES / DESPUES */}
      <div className="lp-before-after" id="como-funciona">
        <div className="lp-ba-inner">
          <div className="lp-section-label" style={{ textAlign:'center', marginBottom:'12px' }}>El cambio real</div>
          <h2 className="lp-section-title" style={{ textAlign:'center', marginBottom:'8px' }}>
            Así era antes.<br /><em>Así es con Pulse.</em>
          </h2>
          <p className="lp-section-sub" style={{ textAlign:'center', margin:'0 auto 48px' }}>
            Sabemos exactamente cómo es tu día hoy.
          </p>
          <div className="lp-ba-grid">
            {[
              {
                before: '📱 Mandás la rutina por WhatsApp y rezás para que la encuentren',
                after:  'Tu atleta abre su app, ve su plan y marca cada ejercicio completo',
                icon: '📋'
              },
              {
                before: '😬 Cobrar se siente incómodo, perseguís transferencias semanas',
                after:  'Tu atleta ve un botón "Pagar mes" y vos recibís en Mercado Pago al instante',
                icon: '💳'
              },
              {
                before: '🤷 No sabés si tu atleta entrenó o no hasta que te escribe',
                after:  'Recibís una notificación cada vez que alguien completa su sesión del día',
                icon: '🔔'
              },
            ].map(({ before, after, icon }, i) => (
              <div key={i} className="lp-ba-card l-reveal">
                <div className="lp-ba-icon">{icon}</div>
                <div className="lp-ba-before">
                  <div className="lp-ba-label lp-ba-label-before">Antes</div>
                  <div className="lp-ba-text">{before}</div>
                </div>
                <div className="lp-ba-arrow">↓</div>
                <div className="lp-ba-after">
                  <div className="lp-ba-label lp-ba-label-after">Con Pulse</div>
                  <div className="lp-ba-text">{after}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DIFERENCIAL */}
      <div className="lp-pills-section">
        <div className="lp-pills-inner">
          <div className="lp-section-label" style={{ textAlign:'center', marginBottom:'12px' }}>Por qué Pulse</div>
          <h2 className="lp-section-title" style={{ textAlign:'center', marginBottom:'48px' }}>
            Lo que ningún otro<br /><em>tiene junto.</em>
          </h2>
          <div className="lp-pills-grid">
            {[
              {
                icon: '🔥',
                title: 'Racha de adherencia',
                desc: 'Tus atletas ven sus días consecutivos entrenados. Vuelven solos sin que vos hagas nada.'
              },
              {
                icon: '⚡',
                title: 'Alerta en tiempo real',
                desc: 'Recibís un email cada vez que un atleta completa su sesión. Sabés quién cumple y quién no.'
              },
              {
                icon: '🎨',
                title: 'Tu marca, no la nuestra',
                desc: 'Con PRO tu app lleva tu nombre y colores. Tus atletas ven tu marca, no Pulse.'
              },
              {
                icon: '💸',
                title: 'Cobros sin vergüenza',
                desc: 'Tus atletas pagan desde la app. El dinero va directo a tu Mercado Pago. Sin vuelto.'
              },
            ].map(({ icon, title, desc }, i) => (
              <div key={i} className="lp-pill-card l-reveal">
                <div className="lp-pill-icon">{icon}</div>
                <div className="lp-pill-title">{title}</div>
                <div className="lp-pill-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIOS */}
      <div className="lp-quote-section">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="lp-section-label" style={{ textAlign:'center', marginBottom:'12px', color:'rgba(91,140,255,0.8)' }}>Lo que dicen</div>
          <h2 className="lp-section-title" style={{ textAlign:'center', marginBottom:'48px', color:'#f0ede8' }}>
            Personas reales.<br /><em>Resultados reales.</em>
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'20px' }} className="lp-testi-grid">

            {/* Carito — Trainer */}
            <div className="lp-testi-card">
              <div className="lp-testi-stars">★★★★★</div>
              <p className="lp-testi-body">
                "Antes mandaba las rutinas por WhatsApp y nunca sabía si las hacían. Ahora cada atleta tiene su app, yo recibo una notificación cuando entrenan y los cobros se manejan solos. Me cambió la forma de trabajar."
              </p>
              <div className="lp-testi-foot">
                <div className="lp-testi-ava" style={{ background:'#e260a5' }}>CL</div>
                <div>
                  <div className="lp-testi-name">Carolina L.</div>
                  <div className="lp-testi-role">Trainer personal · Buenos Aires</div>
                </div>
              </div>
            </div>

            {/* Sofi — Atleta */}
            <div className="lp-testi-card">
              <div className="lp-testi-stars">★★★★★</div>
              <p className="lp-testi-body">
                "La comunicación con mi profe mejoró muchísimo. Antes era todo por chat, ahora tengo mi rutina en la app, marco lo que hago y ella lo ve al instante. Nos enfocamos en entrenar, no en coordinarnos."
              </p>
              <div className="lp-testi-foot">
                <div className="lp-testi-ava" style={{ background:'#5B8CFF' }}>S</div>
                <div>
                  <div className="lp-testi-name">Sofía</div>
                  <div className="lp-testi-role">Atleta · Buenos Aires</div>
                </div>
              </div>
            </div>

            {/* Nahue — Trainer nuevo */}
            <div className="lp-testi-card">
              <div className="lp-testi-stars">★★★★★</div>
              <p className="lp-testi-body">
                "Me sorprendió lo fácil que fue empezar. En 10 minutos tenía mis primeros atletas cargados y el plan asignado. No necesité ayuda de nadie."
              </p>
              <div className="lp-testi-foot">
                <div className="lp-testi-ava" style={{ background:'#16a34a' }}>NP</div>
                <div>
                  <div className="lp-testi-name">Nahuel P.</div>
                  <div className="lp-testi-role">Trainer · Buenos Aires</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="lp-pricing" id="precios">
        <div className="lp-pricing-inner">
          <div className="lp-section-label" style={{ textAlign:'center', marginBottom:'12px' }}>Sin sorpresas</div>
          <h2 className="lp-section-title" style={{ textAlign:'center', marginBottom:'8px' }}>
            Empezá gratis.<br /><em>Crecé cuando estés listo.</em>
          </h2>
          <p style={{ fontSize:'14px', color:'#6b7280', textAlign:'center', marginBottom:'48px' }}>
            Sin contratos. Sin letras chicas.
          </p>
          <div className="lp-pricing-grid">
            <div className="lp-price-card">
              <div className="lp-price-label">Free</div>
              <div className="lp-price-n">$0</div>
              <div className="lp-price-period">Para siempre</div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Hasta 2 atletas</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>App para cada atleta</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Rutinas y planes</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Cobros (comisión 8%)</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot muted">—</span><span style={{ color:'#9ca3af' }}>Branding propio</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot muted">—</span><span style={{ color:'#9ca3af' }}>Comisión reducida</span></div>
              <a href="/register/admin" className="lp-price-cta free" onClick={() => track('cta_click', { location: 'pricing_free' })}>Empezar gratis</a>
            </div>
            <div className="lp-price-card pro">
              <div style={{ display:'inline-block', background:'#5B8CFF', color:'#fff', fontSize:'10px', fontWeight:'700', padding:'4px 12px', borderRadius:'20px', marginBottom:'12px', letterSpacing:'0.06em' }}>MÁS ELEGIDO</div>
              <div className="lp-price-label">Pro</div>
              <div className="lp-price-n">$25.000</div>
              <div className="lp-price-period">ARS / mes</div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span><strong>Atletas ilimitados</strong></span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>App con tu logo y colores</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Nombre de marca propio</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Cobros (comisión 5%)</span></div>
              <div className="lp-price-feat"><span className="lp-pf-dot">✓</span><span>Soporte prioritario</span></div>
              <div style={{ fontSize:'12px', color:'#3b5bdb', marginTop:'8px', fontWeight:'600' }}>Menos de lo que ganás con una clase extra.</div>
              <a href="/register/admin?plan=pro" className="lp-price-cta pro" onClick={() => track('cta_click', { location: 'pricing_pro' })}>Activar Pro →</a>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="lp-final">
        <h2>Tu negocio más ordenado.<br /><em>Desde hoy.</em></h2>
        <div className="lp-final-sub">En 10 minutos tenés tu primer atleta adentro y tu primer plan cargado.</div>
        <a href="/register/admin" className="lp-btn-main" style={{ fontSize:'16px', padding:'16px 40px' }} onClick={() => track('cta_click', { location: 'final_cta' })}>Crear mi app gratis →</a>
        <div className="lp-final-note">Gratis para tus primeros 2 atletas · Sin tarjeta · Sin contrato</div>
      </div>

      {/* FOOTER */}
      <div className="lp-footer-eco">
        <div className="lp-footer-eco-in">
          <div className="lp-eco-mark">
            <a href="https://getpulseapp.lat/" target="_blank" rel="noopener" className="lp-eco-item lp-eco-pulse">PULSE<span className="lp-eco-dot lp-eco-dot-pulse">.</span></a>
            <a href="https://getcreceapp.com/" target="_blank" rel="noopener" className="lp-eco-item">CRECE<span className="lp-eco-dot lp-eco-dot-crece">.</span></a>
            <span className="lp-eco-item lp-eco-watch">WATCH<span className="lp-eco-dot lp-eco-dot-watch">.</span></span>
            <span className="lp-eco-item lp-eco-closer">CLOSER<span className="lp-eco-dot lp-eco-dot-closer">.</span></span>
            <a href="https://getsignalatam.lat/" target="_blank" rel="noopener" className="lp-eco-item">SIGNAL<span className="lp-eco-dot lp-eco-dot-signal">.</span></a>
          </div>
          <div className="lp-foot-links">
            <a href="https://kairo.lat/" target="_blank" rel="noopener" className="lp-foot-kairo">Built by <strong>KAIRO</strong> · Make it simple</a>
            <a href="/privacidad">Privacidad</a>
          </div>
        </div>
      </div>

    </div>
  )
}
