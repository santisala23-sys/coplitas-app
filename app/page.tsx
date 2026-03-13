'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SongModal from './components/SongModal'
import PlaniModal from './components/PlaniModal'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'planis'>('catalogo')
  
  // Estados para Canciones
  const [canciones, setCanciones] = useState<any[]>([])
  const [filteredCanciones, setFilteredCanciones] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSongModalOpen, setIsSongModalOpen] = useState(false)
  const [cancionEditando, setCancionEditando] = useState<any>(null)

  // Estados para Planis
  const [planis, setPlanis] = useState<any[]>([])
  const [isPlaniModalOpen, setIsPlaniModalOpen] = useState(false)
  const [planiEditando, setPlaniEditando] = useState<any>(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Traer Canciones
    const { data: dataCanciones } = await supabase
      .from('canciones')
      .select(`
        id, titulo, audio_url, letra_url, anotaciones,
        cancion_momento ( momentos ( nombre ) ),
        cancion_tematica ( tematicas ( nombre ) )
      `)
      .order('titulo')

    if (dataCanciones) {
      setCanciones(dataCanciones)
      setFilteredCanciones(dataCanciones)
    }

    // 2. Traer Planificaciones
    const { data: dataPlanis } = await supabase
      .from('planificaciones')
      .select(`
        id, titulo, descripcion, created_at,
        planificacion_cancion (
          orden,
          cancion:canciones ( id, titulo, audio_url, letra_url )
        )
      `)
      .order('created_at', { ascending: false })

    if (dataPlanis) setPlanis(dataPlanis)

    setLoading(false)
  }

  // Buscador de canciones
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

  // --- Funciones de Eliminación ---
  const handleEliminarCancion = async (id: string, titulo: string) => {
    if (window.confirm(`¿Seguro que querés eliminar "${titulo}"?`)) {
      await supabase.from('canciones').delete().eq('id', id)
      fetchData()
    }
  }

  const handleEliminarPlani = async (id: string, titulo: string) => {
    if (window.confirm(`¿Seguro que querés eliminar la plani "${titulo}"?`)) {
      await supabase.from('planificaciones').delete().eq('id', id)
      fetchData()
    }
  }

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      
      {/* CABECERA */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 text-gray-800">Coplitas para Crecer</h1>
        <p className="text-gray-600">Gestor de Rondas Infantiles</p>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 md:gap-8 mb-8 border-b-2 border-gray-200">
        <button 
          className={`pb-3 text-lg font-bold px-2 ${activeTab === 'catalogo' ? 'text-purple-600 border-b-4 border-purple-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('catalogo')}
        >
          Catálogo de Canciones
        </button>
        <button 
          className={`pb-3 text-lg font-bold px-2 ${activeTab === 'planis' ? 'text-emerald-600 border-b-4 border-emerald-600 -mb-0.5' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('planis')}
        >
          Planis
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando datos...</div>
      ) : (
        <>
          {/* ======================================= */}
          {/* VISTA: CATÁLOGO DE CANCIONES              */}
          {/* ======================================= */}
          {activeTab === 'catalogo' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setCancionEditando(null); setIsSongModalOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto">
                  + Nueva Canción
                </button>
              </div>

              <div className="mb-8 sticky top-4 z-10">
                <input type="text" placeholder="Buscar canción, momento, palabra clave..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-4 text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg placeholder-gray-400 shadow-sm" />
              </div>

              <div className="grid gap-6">
                {filteredCanciones.map((cancion) => (
                  <div key={cancion.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative group">
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => { setCancionEditando(cancion); setIsSongModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium">Editar</button>
                      <button onClick={() => handleEliminarCancion(cancion.id, cancion.titulo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">Borrar</button>
                    </div>

                    <h2 className="text-2xl font-semibold mb-3 text-gray-800 pr-32">{cancion.titulo}</h2>
                    
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

                    {cancion.anotaciones && (
                      <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg text-amber-900 text-sm whitespace-pre-wrap">
                        <strong>Anotación: </strong> {cancion.anotaciones}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl">
                      {cancion.audio_url ? <audio controls src={cancion.audio_url} className="w-full sm:w-2/3 h-10" /> : <p className="text-sm text-gray-400 italic">Audio no disponible</p>}
                      {cancion.letra_url && <a href={cancion.letra_url} target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition shadow-sm text-center w-full sm:w-auto">Ver Letra</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* VISTA: PLANIS (PLANIFICACIONES)           */}
          {/* ======================================= */}
          {activeTab === 'planis' && (
            <div>
              <div className="flex justify-end mb-6">
                <button onClick={() => { setPlaniEditando(null); setIsPlaniModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto">
                  + Armar Nueva Plani
                </button>
              </div>

              {planis.length === 0 ? (
                <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl">
                  <p className="text-gray-500 text-lg">No hay planificaciones armadas todavía.</p>
                  <p className="text-gray-400 text-sm mt-2">Creá tu primera plani para estructurar una ronda.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {planis.map((plani) => {
                    // Ordenamos las canciones de la plani para mostrarlas correctamente
                    const cancionesDePlani = [...plani.planificacion_cancion].sort((a: any, b: any) => a.orden - b.orden);

                    return (
                      <div key={plani.id} className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 relative group border-t-4 border-t-emerald-500">
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button onClick={() => { setPlaniEditando(plani); setIsPlaniModalOpen(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm font-medium">Editar</button>
                          <button onClick={() => handleEliminarPlani(plani.id, plani.titulo)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">Borrar</button>
                        </div>

                        <h2 className="text-2xl font-bold mb-1 text-gray-800 pr-32">{plani.titulo}</h2>
                        {plani.descripcion && <p className="text-gray-600 mb-4">{plani.descripcion}</p>}

                        <div className="mt-4">
                          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Estructura de la sesión</h3>
                          <ul className="flex flex-col gap-2">
                            {cancionesDePlani.map((item: any, index: number) => (
                              <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="font-medium text-gray-800">
                                  <span className="text-emerald-500 font-bold mr-3">{item.orden}.</span>
                                  {item.cancion?.titulo || 'Canción eliminada del catálogo'}
                                </span>
                                
                                <div className="flex gap-2">
                                  {item.cancion?.audio_url && (
                                    <audio src={item.cancion.audio_url} controls className="h-8 w-40" />
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODALES */}
      <SongModal isOpen={isSongModalOpen} onClose={() => setIsSongModalOpen(false)} cancionAEditar={cancionEditando} onSave={fetchData} />
      <PlaniModal isOpen={isPlaniModalOpen} onClose={() => setIsPlaniModalOpen(false)} planiAEditar={planiEditando} onSave={fetchData} catalogo={canciones} />

    </main>
  )
}