'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SongModal from './components/SongModal' // IMPORTANTE: Ajustá la ruta si armaste la carpeta en otro lado

export default function Home() {
  const [canciones, setCanciones] = useState<any[]>([])
  const [filteredCanciones, setFilteredCanciones] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cancionEditando, setCancionEditando] = useState<any>(null)

  useEffect(() => {
    fetchCanciones()
  }, [])

  const fetchCanciones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('canciones')
      .select(`
        id, titulo, audio_url, letra_url, anotaciones,
        cancion_momento ( momentos ( nombre ) ),
        cancion_tematica ( tematicas ( nombre ) )
      `)
      .order('titulo')

    if (!error && data) {
      setCanciones(data)
      setFilteredCanciones(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCanciones(canciones)
      return
    }
    const term = searchTerm.toLowerCase()
    const filtradas = canciones.filter((c) => {
      if (c.titulo.toLowerCase().includes(term)) return true
      if (c.anotaciones && c.anotaciones.toLowerCase().includes(term)) return true
      if (c.cancion_momento.map((cm:any) => cm.momentos.nombre.toLowerCase()).some((m:string) => m.includes(term))) return true
      if (c.cancion_tematica.map((ct:any) => ct.tematicas.nombre.toLowerCase()).some((t:string) => t.includes(term))) return true
      return false
    })
    setFilteredCanciones(filtradas)
  }, [searchTerm, canciones])

  // Funciones de Acción
  const handleNuevaCancion = () => {
    setCancionEditando(null)
    setIsModalOpen(true)
  }

  const handleEditar = (cancion: any) => {
    setCancionEditando(cancion)
    setIsModalOpen(true)
  }

  const handleEliminar = async (id: string, titulo: string) => {
    if (window.confirm(`¿Estás seguro que querés eliminar "${titulo}"? Esta acción no se puede deshacer.`)) {
      await supabase.from('canciones').delete().eq('id', id)
      fetchCanciones() // Refrescamos la lista
    }
  }

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      
      {/* CABECERA Y BOTÓN NUEVA CANCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Coplitas para Crecer</h1>
          <p className="text-gray-600">Catálogo de rondas y canciones</p>
        </div>
        <button 
          onClick={handleNuevaCancion}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
        >
          + Nueva Canción
        </button>
      </div>
      
      {/* EL BUSCADOR */}
      <div className="mb-8 sticky top-4 z-10">
        <div className="relative shadow-sm rounded-lg">
          <input
            type="text"
            placeholder="Buscar por canción, momento, temática o palabra clave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 pr-12 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg placeholder-gray-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando el catálogo...</div>
      ) : (
        <div className="grid gap-6">
          {filteredCanciones.map((cancion) => (
            <div key={cancion.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative group">
              
              {/* BOTONES DE EDICIÓN Y ELIMINAR (Aparecen a la derecha) */}
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleEditar(cancion)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition">
                  Editar
                </button>
                <button onClick={() => handleEliminar(cancion.id, cancion.titulo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition">
                  Borrar
                </button>
              </div>

              <h2 className="text-2xl font-semibold mb-3 text-gray-800 pr-32">{cancion.titulo}</h2>
              
              {/* Etiquetas */}
              <div className="flex flex-col gap-2 mb-4">
                {cancion.cancion_momento?.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-sm items-center">
                    <strong className="text-gray-600 min-w-[80px]">Momentos:</strong>
                    {cancion.cancion_momento.map((cm: any, idx: number) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md">{cm.momentos.nombre}</span>
                    ))}
                  </div>
                )}
                {cancion.cancion_tematica?.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-sm items-center">
                    <strong className="text-gray-600 min-w-[80px]">Temáticas:</strong>
                    {cancion.cancion_tematica.map((ct: any, idx: number) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md">{ct.tematicas.nombre}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Anotaciones */}
              {cancion.anotaciones && (
                <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-amber-900 text-sm whitespace-pre-wrap">
                  <strong>Anotación: </strong> {cancion.anotaciones}
                </div>
              )}

              {/* Reproductor y Letra */}
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
                {cancion.audio_url ? (
                  <audio controls src={cancion.audio_url} className="w-full sm:w-2/3 h-10" />
                ) : (
                  <p className="text-sm text-gray-400 italic">Audio no cargado</p>
                )}

                {cancion.letra_url && (
                  <a href={cancion.letra_url} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm text-center w-full sm:w-auto">
                    Ver Letra y Acordes
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENDERIZADO DEL MODAL */}
      <SongModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cancionAEditar={cancionEditando}
        onSave={fetchCanciones} // Le pasamos la función para que actualice la lista tras guardar
      />

    </main>
  )
}