// hooks/useBrand.ts
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface BrandConfig {
  brandName: string
  brandImageUrl: string | null
  primaryColor: string
  secondaryColor: string
}

// Branding Pulse (FREE)
const PULSE_BRAND: BrandConfig = {
  brandName: 'Pulse',
  brandImageUrl: null,
  primaryColor: '#5B8CFF',
  secondaryColor: '#4A74D9',
}

const DEFAULTS: BrandConfig = PULSE_BRAND

export function useBrand() {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  async function loadBrand(id: string) {
    // ✅ Crear cliente dentro de la función para que tenga el JWT de la sesión activa
    const supabase = createClient() as any

    const { data } = await supabase
      .from('perfiles')
      .select('plan, brand_name, brand_image_url, primary_color, secondary_color')
      .eq('id', id)
      .single() as { data: { plan: string; brand_name: string | null; brand_image_url: string | null; primary_color: string | null; secondary_color: string | null } | null, error: unknown }

    if (data) {
      const isPro = data.plan === 'pro'
      const config: BrandConfig = isPro ? {
        brandName:      data.brand_name      || PULSE_BRAND.brandName,
        brandImageUrl:  data.brand_image_url || null,
        primaryColor:   data.primary_color   || PULSE_BRAND.primaryColor,
        secondaryColor: data.secondary_color || PULSE_BRAND.secondaryColor,
      } : PULSE_BRAND
      setBrand(config)
      applyBrandCSS(config)
    }
    setLoading(false)
  }

  async function saveBrand(updates: Partial<BrandConfig>, adminId: string): Promise<boolean> {
    // ✅ Crear cliente dentro de la función
    const supabase = createClient() as any

    const { error } = await supabase
      .from('perfiles')
      .update({
        brand_name:      updates.brandName,
        brand_image_url: updates.brandImageUrl,
        primary_color:   updates.primaryColor,
        secondary_color: updates.secondaryColor,
      })
      .eq('id', adminId)

    if (!error) {
      const updated = { ...brand, ...updates }
      setBrand(updated)
      applyBrandCSS(updated)
    }
    return !error
  }

  async function uploadBrandImage(file: File, adminId: string): Promise<string | null> {
    // ✅ Crear cliente dentro de la función
    const supabase = createClient() as any

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) return null
    if (file.size > 2 * 1024 * 1024) return null

    const ext = file.name.split('.').pop()
    const path = `${adminId}/logo.${ext}`

    const { error } = await supabase.storage
      .from('branding')
      .upload(path, file, { upsert: true })

    if (error) return null

    const { data } = supabase.storage
      .from('branding')
      .getPublicUrl(path)

    return data.publicUrl + '?t=' + Date.now()
  }

  return { brand, loading, saveBrand, uploadBrandImage, loadBrand }
}

export function applyBrandCSS(config: BrandConfig) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-primary', config.primaryColor)
  root.style.setProperty('--color-secondary', config.secondaryColor)
}
