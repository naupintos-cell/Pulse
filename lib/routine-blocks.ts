// lib/routine-blocks.ts

import { supabase } from '@/lib/supabase'
import type { Bloque, Ejercicio, BloqueFormData } from '@/types/routines'

// Usamos 'db' como any para evitar conflictos de tipos con tablas nuevas
const db = supabase as any

// ── Leer bloques con sus ejercicios ──────────────────────
export async function getBloquesConEjercicios(diaId: string): Promise<Bloque[]> {
  const { data, error } = await db
    .from('bloques')
    .select(`*, ejercicios(*)`)
    .eq('dia_id', diaId)
    .order('orden', { ascending: true })

  if (error) throw error
  return data ?? []
}

// ── Leer ejercicios sin bloque (legacy) ──────────────────
export async function getEjerciciosLegacy(diaId: string): Promise<Ejercicio[]> {
  const { data, error } = await db
    .from('ejercicios')
    .select('*')
    .eq('dia_id', diaId)
    .is('bloque_id', null)
    .order('orden', { ascending: true })

  if (error) throw error
  return data ?? []
}

// ── Crear bloque ──────────────────────────────────────────
export async function crearBloque(
  diaId: string,
  formData: BloqueFormData,
  cantidadActual: number
): Promise<Bloque> {
  const { data, error } = await db
    .from('bloques')
    .insert({
      dia_id: diaId,
      nombre: formData.nombre || `Bloque ${String.fromCharCode(65 + cantidadActual)}`,
      tipo: formData.tipo,
      descripcion: formData.descripcion || null,
      rondas: formData.rondas || null,
      descanso_entre_rondas: formData.descanso_entre_rondas || null,
      orden: cantidadActual,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Actualizar bloque ─────────────────────────────────────
export async function actualizarBloque(
  bloqueId: string,
  updates: Partial<BloqueFormData>
): Promise<void> {
  const { error } = await db
    .from('bloques')
    .update(updates)
    .eq('id', bloqueId)

  if (error) throw error
}

// ── Eliminar bloque ───────────────────────────────────────
export async function eliminarBloque(bloqueId: string): Promise<void> {
  const { error } = await db
    .from('bloques')
    .delete()
    .eq('id', bloqueId)

  if (error) throw error
}

// ── Duplicar bloque con sus ejercicios ───────────────────
export async function duplicarBloque(
  bloque: Bloque,
  nuevoOrden: number
): Promise<Bloque> {
  const { data: nuevoBloque, error: errorBloque } = await db
    .from('bloques')
    .insert({
      dia_id: bloque.dia_id,
      nombre: `${bloque.nombre} (copia)`,
      tipo: bloque.tipo,
      descripcion: bloque.descripcion,
      rondas: bloque.rondas,
      descanso_entre_rondas: bloque.descanso_entre_rondas,
      orden: nuevoOrden,
    })
    .select()
    .single()

  if (errorBloque) throw errorBloque

  if (bloque.ejercicios && bloque.ejercicios.length > 0) {
    const copias = bloque.ejercicios.map((ej) => ({
      dia_id: ej.dia_id,
      bloque_id: nuevoBloque.id,
      nombre: ej.nombre,
      series: ej.series,
      repeticiones: ej.repeticiones,
      descanso: ej.descanso,
      observaciones: ej.observaciones,
      orden: ej.orden,
      carga: ej.carga,
    }))

    const { error: errorEj } = await db
      .from('ejercicios')
      .insert(copias)

    if (errorEj) throw errorEj
  }

  return nuevoBloque
}

// ── Reordenar bloques ─────────────────────────────────────
export async function reordenarBloques(
  bloques: { id: string; orden: number }[]
): Promise<void> {
  for (const b of bloques) {
    await db.from('bloques').update({ orden: b.orden }).eq('id', b.id)
  }
}

// ── Reordenar ejercicios ──────────────────────────────────
export async function reordenarEjercicios(
  ejercicios: { id: string; orden: number }[]
): Promise<void> {
  for (const ej of ejercicios) {
    await db.from('ejercicios').update({ orden: ej.orden }).eq('id', ej.id)
  }
}
