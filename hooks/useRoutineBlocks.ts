// hooks/useRoutineBlocks.ts
'use client'

import { useState, useCallback } from 'react'
import type { Bloque, BloqueFormData } from '@/types/routines'
import * as bloqueQueries from '@/lib/routine-blocks'

export function useRoutineBlocks(diaId: string) {
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar bloques desde Supabase
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bloqueQueries.getBloquesConEjercicios(diaId)
      setBloques(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [diaId])

  // Agregar bloque nuevo
  const agregarBloque = useCallback(async (formData: BloqueFormData) => {
    const tempId = `temp-${Date.now()}`
    const optimista: Bloque = {
      id: tempId,
      dia_id: diaId,
      orden: bloques.length,
      ejercicios: [],
      ...formData,
    }
    setBloques((prev) => [...prev, optimista])

    try {
      const real = await bloqueQueries.crearBloque(diaId, formData, bloques.length)
      setBloques((prev) =>
        prev.map((b) => (b.id === tempId ? { ...real, ejercicios: [] } : b))
      )
    } catch (e: any) {
      setBloques((prev) => prev.filter((b) => b.id !== tempId))
      setError(e.message)
    }
  }, [diaId, bloques.length])

  // Actualizar nombre, tipo, descripción, etc.
  const actualizarBloque = useCallback(async (bloqueId: string, updates: Partial<BloqueFormData>) => {
    setBloques((prev) =>
      prev.map((b) => (b.id === bloqueId ? { ...b, ...updates } : b))
    )
    try {
      await bloqueQueries.actualizarBloque(bloqueId, updates)
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }, [load])

  // Eliminar bloque
  const eliminarBloque = useCallback(async (bloqueId: string) => {
    setBloques((prev) => prev.filter((b) => b.id !== bloqueId))
    try {
      await bloqueQueries.eliminarBloque(bloqueId)
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }, [load])

  // Duplicar bloque
  const duplicarBloque = useCallback(async (bloque: Bloque) => {
    try {
      const copia = await bloqueQueries.duplicarBloque(bloque, bloques.length)
      setBloques((prev) => [
        ...prev,
        { ...copia, ejercicios: bloque.ejercicios ? [...bloque.ejercicios] : [] },
      ])
    } catch (e: any) {
      setError(e.message)
    }
  }, [bloques.length])

  // Subir o bajar un bloque
  const moverBloque = useCallback(async (bloqueId: string, direccion: 'up' | 'down') => {
    const idx = bloques.findIndex((b) => b.id === bloqueId)
    if (idx === -1) return

    const newIdx = direccion === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= bloques.length) return

    const reordenados = [...bloques]
    ;[reordenados[idx], reordenados[newIdx]] = [reordenados[newIdx], reordenados[idx]]
    const conOrden = reordenados.map((b, i) => ({ ...b, orden: i }))

    setBloques(conOrden)

    try {
      await bloqueQueries.reordenarBloques(
        conOrden.map((b) => ({ id: b.id, orden: b.orden }))
      )
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }, [bloques, load])

  return {
    bloques,
    loading,
    error,
    load,
    agregarBloque,
    actualizarBloque,
    eliminarBloque,
    duplicarBloque,
    moverBloque,
  }
}
