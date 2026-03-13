'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export default function PlaniModal({ isOpen, onClose, planiAEditar, onSave, catalogo }: any) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cancionesSeleccionadas, setCancionesSeleccionadas] = useState<any[]>([])
  
  // Estados para el nuevo buscador/selector
  const [searchTerm, setSearchTerm] = useState('') 
  const [selectedCancionId, setSelectedCancionId] = useState<string>('') 
  
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (planiAEditar) {
      setTitulo(planiAEditar.titulo || '')
      setDescripcion(planiAEditar.descripcion || '')
      if (planiAEditar.planificacion_cancion) {
        const cancionesOrdenadas = [...planiAEditar.planificacion_cancion]
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((pc: any) => pc.cancion)
        setCancionesSeleccionadas(cancionesOrdenadas)
      } else {
        setCancionesSeleccionadas([])
      }
    } else {
      setTitulo('')
      setDescripcion('')
      setCancionesSeleccionadas([])
    }
    setSearchTerm('')
    setSelectedCancionId('')
  }, [planiAEditar, isOpen])

  // --- Lógica de filtrado en tiempo real (ahora muestra TODAS si no hay búsqueda) ---
  const catalogoFiltrado = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return catalogo.filter((cancion: any) => {
      // 1. Ocultar las que ya están agregadas a la plani
      if (cancionesSeleccionadas.some(cs => cs.id === cancion.id)) return false

      // 2. Si no escribió nada, mostramos todo lo disponible
      if (!term) return true 

      // 3. Buscar por título, momento o temática
      if (cancion.titulo.toLowerCase().includes(term)) return true
      
      const momentos = cancion.cancion_momento?.map((cm: any) => cm.momentos.nombre.toLowerCase()) || []
      if (momentos.some((m: string) => m.includes(term))) return true
      
      const tematicas = cancion.cancion_tematica?.map((ct: any) => ct.tematicas.nombre.toLowerCase()) || []
      if (tematicas.some((t: string) => t.includes(term))) return true

      return false
    }) // Sacamos el .slice() para que se pueda scrollear todo
  }, [searchTerm, catalogo, cancionesSeleccionadas])

  if (!isOpen) return null

  // --- Funciones para manejar la lista ---
  const agregarCancion = () => {
    const cancion = catalogo.find((c: any) => c.id === selectedCancionId)
    if (cancion) {
      setCancionesSeleccionadas([...cancionesSeleccionadas, cancion])
      setSelectedCancionId('') // Limpiar selección
      setSearchTerm('') // Limpiar búsqueda para ver el catálogo completo de nuevo
    }
  }

  const quitarCancion = (index: number) => {
    const nuevas = [...cancionesSeleccionadas]
    nuevas.splice(index, 1)
    setCancionesSeleccionadas(nuevas)
  }

  const moverCancion = (index: number, direccion: 'up' | 'down') => {
    if (direccion === 'up' && index === 0) return
    if (direccion === 'down' && index === cancionesSeleccionadas.length - 1) return

    const nuevas = [...cancionesSeleccionadas]
    const temp = nuevas[index]
    const swapIndex = direccion === 'up' ? index - 1 : index + 1
    nuevas[index] = nuevas[swapIndex]
    nuevas[swapIndex] = temp
    setCancionesSeleccionadas(nuevas)
  }

  // --- Guardar en Supabase ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let planiId = planiAEditar?.id

      if (planiId) {
        await supabase.from('planificaciones').update({ titulo, descripcion }).eq('id', planiId)
      } else {
        const { data, error } = await supabase.from('planificaciones').insert([{ titulo, descripcion }]).select().single()
        if (error) throw error
        planiId = data.id
      }

      await supabase.from('planificacion_cancion').delete().eq('planificacion_id', planiId)

      if (cancionesSeleccionadas.length > 0) {
        const inserts = cancionesSeleccionadas.map((c, index) => ({
          planificacion_id: planiId,
          cancion_id: c.id,
          orden: index + 1
        }))
        await supabase.from('planificacion_cancion').insert(inserts)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error guardando plani:', error)
      alert('Hubo un error al guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header del Modal */}
        <div className="p-5 border-b bg-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-800">
            {planiAEditar ? 'Editar Plani' : 'Armar Nueva Plani'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 font-bold text-xl p-2">✕</button>
        </div>

        {/* Formulario Scrolleable */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 overflow-y-auto">
          
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Plani *</label>
              <input required type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} 
                className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="Ej: Ronda de Primavera - Grupo 1" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción / Objetivos</label>
              <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} 
                className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="Ej: Trabajar motricidad fina y reconocimiento de animales" 
              />
            </div>
          </div>

          {/* === NUEVO BUSCADOR Y LISTA SCROLLEABLE === */}
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-inner flex flex-col gap-3">
            <label className="block text-sm font-semibold text-emerald-800">
              Buscar y Agregar Canciones a la Ronda
            </label>
            
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Filtrar por nombre, temática o momento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <button 
                type="button" 
                onClick={agregarCancion}
                disabled={!selectedCancionId}
                className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition"
              >
                Agregar
              </button>
            </div>

            {/* Caja de resultados con Scroll constante */}
            <div className="bg-white border border-gray-200 rounded-lg max-h-48 overflow-y-auto shadow-sm">
              {catalogoFiltrado.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {catalogoFiltrado.map((cancion: any) => (
                    <li key={cancion.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCancionId(cancion.id)}
                        className={`w-full text-left p-3 transition flex flex-col ${
                          selectedCancionId === cancion.id 
                            ? 'bg-emerald-100 border-l-4 border-emerald-500' 
                            : 'hover:bg-gray-50 border-l-4 border-transparent'
                        }`}
                      >
                        <span className={`block font-medium ${selectedCancionId === cancion.id ? 'text-emerald-900' : 'text-gray-800'}`}>
                          {cancion.titulo}
                        </span>
                        <span className="text-xs text-gray-500 truncate mt-1">
                          {cancion.cancion_tematica?.map((t:any) => t.tematicas.nombre).join(', ') || 'Sin temáticas'} 
                          {' • '} 
                          {cancion.cancion_momento?.map((m:any) => m.momentos.nombre).join(', ') || 'Sin momento'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No hay resultados para tu búsqueda.' : 'No quedan canciones en el catálogo.'}
                </div>
              )}
            </div>
          </div>

          {/* === LISTA DE CANCIONES SELECCIONADAS === */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Estructura de la Ronda ({cancionesSeleccionadas.length})
              </label>
            </div>
            
            {cancionesSeleccionadas.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-6 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                Aún no agregaste canciones. Seleccioná una arriba y dale a "Agregar".
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {cancionesSeleccionadas.map((cancion, index) => (
                  <li key={cancion.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                    <span className="font-medium text-gray-800 truncate pr-4">
                      <span className="bg-emerald-100 text-emerald-800 w-6 h-6 inline-flex justify-center items-center rounded-full text-xs font-bold mr-3">
                        {index + 1}
                      </span> 
                      {cancion.titulo}
                    </span>
                    <div className="flex gap-1 shrink-0 bg-gray-50 rounded-lg p-1 border">
                      <button type="button" onClick={() => moverCancion(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 transition">⬆️</button>
                      <button type="button" onClick={() => moverCancion(index, 'down')} disabled={index === cancionesSeleccionadas.length - 1} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md disabled:opacity-30 transition">⬇️</button>
                      <div className="w-px bg-gray-200 mx-1"></div>
                      <button type="button" onClick={() => quitarCancion(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition">❌</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botones de Guardar */}
          <div className="mt-2 flex justify-end gap-3 border-t pt-6 shrink-0 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition border">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm">
              {isSaving ? 'Guardando...' : 'Guardar Plani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}