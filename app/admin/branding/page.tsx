// app/admin/branding/page.tsx
// @ts-nocheck
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useBrand, applyBrandCSS } from '@/hooks/useBrand'

export default function BrandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [ready, setReady] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    brandName: 'Pulse',
    primaryColor: '#5B8CFF',
    secondaryColor: '#4A74D9',
    brandImageUrl: null as string | null,
  })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const { saveBrand, uploadBrandImage, loadBrand } = useBrand()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setAdminId(user.id)
      const { data } = await (supabase as any)
        .from('perfiles')
        .select('plan, brand_name, brand_image_url, primary_color, secondary_color')
        .eq('id', user.id)
        .single()
      if (data) {
        const pro = data.plan === 'pro'
        setIsPro(pro)
        setForm({
          brandName:      data.brand_name      || 'Pulse',
          primaryColor:   data.primary_color   || '#5B8CFF',
          secondaryColor: data.secondary_color || '#4A74D9',
          brandImageUrl:  data.brand_image_url || null,
        })
        setPreviewImage(data.brand_image_url || null)
      }
      setReady(true)
    }
    init()
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !adminId) return
    const reader = new FileReader()
    reader.onload = ev => setPreviewImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    setUploading(true)
    const url = await uploadBrandImage(file, adminId)
    setUploading(false)
    if (url) { setForm(p => ({ ...p, brandImageUrl: url })); showToast('✅ Imagen subida') }
    else showToast('⚠️ Solo PNG/JPG/WebP hasta 2MB')
  }

  async function handleSave() {
    if (!adminId) return
    setSaving(true)
    const ok = await saveBrand(form, adminId)
    setSaving(false)
    if (ok) { showToast('✅ Guardado'); applyBrandCSS(form as any); loadBrand(adminId) }
    else showToast('⚠️ Error al guardar')
  }

  const wine = form.primaryColor || '#5B8CFF'
  const wineLight = wine + '15'

  if (!ready) return (
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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'DM Sans, sans-serif' }}>
      {toast && <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: wine, color: '#fff', padding: '12px 22px', borderRadius: '12px', fontSize: '14px', fontWeight: '600', zIndex: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>{toast}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .brand-grid { grid-template-columns: 1fr !important; }
          .brand-preview { display: none !important; }
          .brand-header { padding: 16px 16px 0 !important; }
          .brand-body { padding: 16px !important; }
          .color-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div className="brand-header" style={{ background: '#fff', borderBottom: '1px solid #f3f4f6', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/admin')}
          style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          ← Volver
        </button>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px' }}>Configuración</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', letterSpacing: '-0.4px' }}>Personalizar marca</div>
        </div>
        {!isPro && (
          <div style={{ marginLeft: 'auto', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', color: '#92400e', fontWeight: '600', flexShrink: 0 }}>
            Solo PRO
          </div>
        )}
      </div>

      <div className="brand-body" style={{ padding: '24px 28px', maxWidth: '960px', margin: '0 auto' }}>
        <div className="brand-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

          {/* FORMULARIO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Plan FREE — aviso */}
            {!isPro && (
              <div style={{ background: '#eff3ff', border: '1px solid #c7d7fe', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '24px' }}>🔒</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' }}>Branding personalizado — Plan PRO</div>
                  <div style={{ fontSize: '13px', color: '#3b82f6' }}>Con PRO podés poner tu logo, tu nombre y tus colores. Tus alumnos ven tu marca, no Pulse.</div>
                  <button onClick={() => router.push('/admin/upgrade')}
                    style={{ marginTop: '10px', background: '#5B8CFF', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Activar PRO →
                  </button>
                </div>
              </div>
            )}

            {/* Nombre de marca */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f3f4f6' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '10px' }}>
                Nombre de marca
              </label>
              <input
                type="text"
                value={form.brandName}
                onChange={e => setForm(p => ({ ...p, brandName: e.target.value }))}
                placeholder="Ej: Team Carito, FitZone, PowerCoach..."
                disabled={!isPro}
                style={{ width: '100%', background: isPro ? '#f9fafb' : '#f3f4f6', border: `1.5px solid ${isPro ? '#e5e7eb' : '#f3f4f6'}`, borderRadius: '10px', padding: '12px 14px', fontSize: '15px', fontFamily: 'inherit', outline: 'none', color: isPro ? '#111827' : '#9ca3af', cursor: isPro ? 'text' : 'not-allowed' }}
              />
              {!isPro && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>Disponible en plan PRO</div>}
            </div>

            {/* Logo */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f3f4f6' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '14px' }}>
                Logo / Imagen de marca
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '16px', background: isPro ? wine : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: `2px solid ${isPro ? wine + '30' : '#f3f4f6'}` }}>
                  {previewImage
                    ? <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill={isPro ? wine : '#9ca3af'}/><text x="16" y="22" textAnchor="middle" fontFamily="Georgia,serif" fontSize="18" fontWeight="700" fill="#fff">P</text></svg>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <button
                    onClick={() => isPro && fileRef.current?.click()}
                    disabled={uploading || !isPro}
                    style={{ background: isPro ? wine : '#e5e7eb', color: isPro ? '#fff' : '#9ca3af', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: isPro ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {uploading ? '⏳ Subiendo...' : previewImage ? '🔄 Cambiar imagen' : '📸 Subir logo'}
                  </button>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', marginBottom: 0 }}>PNG, JPG o WebP · Máx 2MB</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleImageChange} />
            </div>

            {/* Colores */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid #f3f4f6' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: '16px' }}>
                Colores
              </label>
              <div className="color-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'primaryColor', label: 'Color principal' },
                  { key: 'secondaryColor', label: 'Color secundario' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={(form as any)[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        disabled={!isPro}
                        style={{ width: '48px', height: '48px', border: 'none', borderRadius: '10px', cursor: isPro ? 'pointer' : 'not-allowed', padding: '2px', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        value={(form as any)[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        disabled={!isPro}
                        style={{ flex: 1, background: isPro ? '#f9fafb' : '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '10px', fontSize: '13px', fontFamily: 'monospace', outline: 'none', color: isPro ? '#111827' : '#9ca3af', cursor: isPro ? 'text' : 'not-allowed' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guardar */}
            <button
              onClick={handleSave}
              disabled={saving || !isPro}
              style={{ background: isPro ? wine : '#e5e7eb', color: isPro ? '#fff' : '#9ca3af', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: isPro ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: saving ? 0.7 : 1, transition: '.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: isPro ? `0 4px 16px ${wine}40` : 'none' }}>
              {saving ? '⏳ Guardando...' : '💾 Guardar configuración'}
            </button>

          </div>

          {/* PREVIEW */}
          <div className="brand-preview" style={{ position: 'sticky', top: '80px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>Vista previa</div>

            {/* Mock del bottom nav mobile */}
            <div style={{ background: '#f0f4f8', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
              {/* Header mock */}
              <div style={{ background: '#f9fafb', padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: wine, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px' }}>{form.brandName || 'Pulse'}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>Hola, Profe 👋</div>
              </div>

              {/* Alumno mock */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: wine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {previewImage
                      ? <img src={previewImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : 'LP'
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Laura Pérez</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Tonificación</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', background: '#f0fdf4', borderRadius: '20px', padding: '3px 8px' }}>✓ Plan</span>
                </div>

                {/* Mini badge */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ background: wineLight, color: wine, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>Activos (2)</span>
                  <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>Sin plan (1)</span>
                </div>
              </div>

              {/* Bottom nav mock */}
              <div style={{ background: '#fff', borderTop: '1px solid #f3f4f6', padding: '10px 0', display: 'flex' }}>
                {[{icon:'▦',label:'Inicio',active:true},{icon:'◉',label:'Alumnos'},{icon:'☰',label:'Planes'},{icon:'?',label:'Ayuda'},{icon:'◈',label:'Marca'}].map(({icon,label,active}) => (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: active ? wine : '#9ca3af', borderTop: active ? `2px solid ${wine}` : '2px solid transparent', paddingTop: '4px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span style={{ fontSize: '8px', fontWeight: active ? '700' : '500' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Elements */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>Elementos</div>
              <button style={{ background: wine, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px', width: '100%' }}>Botón principal</button>
              <button style={{ background: 'transparent', color: wine, border: `2px solid ${wine}`, borderRadius: '10px', padding: '8px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px', width: '100%' }}>Botón secundario</button>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ background: wineLight, color: wine, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>Badge activo</span>
                <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>✓ Con plan</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
