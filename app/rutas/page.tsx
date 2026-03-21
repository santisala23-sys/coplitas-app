'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'

export default function RutasPage() {
  const [rutas, setRutas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  
  // Estados para Selectores Inteligentes
  const [materialesInventario, setMaterialesInventario] = useState<any[]>([])
  const [rondasFijas, setRondasFijas] = useState<any[]>([])
  const [eventosPendientes, setEventosPendientes] = useState<any[]>([])
  const [planificaciones, setPlanificaciones] = useState<any[]>([]) 

  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Formulario principal de la Ruta
  const [formRuta, setFormRuta] = useState({ nombre: '', descripcion: '' })
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState<string[]>([])
  
  // Paradas (Itinerario)
  const [paradas, setParadas] = useState<any[]>([
    { id: 1, usuario_username: '', tipo_destino: 'MANUAL', destino_id: '', fecha: '', hora: '' }
  ])

  useEffect(() => {
    setUserRole(Cookies.get('coplitas_role') || 'USER')
    setCurrentUser(Cookies.get('coplitas_user') || '')
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // 1. Usuarios
    const { data: dataUsr } = await supabase.from('usuarios').select('username').eq('activo', true).order('username')
    if (dataUsr) setUsuarios(dataUsr)

    // 2. Materiales
    const { data: dataMat } = await supabase.from('materiales').select('id, nombre').order('nombre')
    if (dataMat) setMaterialesInventario(dataMat)

    // 3. Rondas Fijas
    const { data: dataRondas } = await supabase.from('rondas_fijas').select('id, dia_semana, hora, usuario_titular, sede:sedes(nombre)')
    if (dataRondas) setRondasFijas(dataRondas)

    // 4. Eventos
    const { data: dataEventos } = await supabase.from('eventos').select('id, titulo, fecha, hora, usuario_asignado, estado').eq('estado', 'PENDIENTE').order('fecha')
    if (dataEventos) setEventosPendientes(dataEventos)

    // 5. Planificaciones (Para importar)
    const { data: dataPlanis } = await supabase.from('planificaciones').select('id, titulo, materiales').order('created_at', { ascending: false })
    if (dataPlanis) setPlanificaciones(dataPlanis)

    // 6. Rutas armadas
    const { data: dataRutas } = await supabase
      .from('rutas')
      .select('*, ruta_paradas(*)')
      .order('created_at', { ascending: false })

    if (dataRutas) {
      const rutasOrdenadas = dataRutas.map(ruta => ({
        ...ruta,
        ruta_paradas: ruta.ruta_paradas.sort((a: any, b: any) => a.orden - b.orden)
      }))
      setRutas(rutasOrdenadas)
    }

    setLoading(false)
  }

  // --- IMPORTAR DESDE PLANI ---
  const importarDesdePlani = (planiId: string) => {
      if (!planiId) return
      
      const plani = planificaciones.find(p => p.id === planiId)
      if (plani) {
          setFormRuta(prev => ({ ...prev, nombre: `Bolso para: ${plani.titulo}` }))
          
          if (plani.materiales && plani.materiales.length > 0) {
              setMaterialesSeleccionados(plani.materiales)
          } else {
              alert("Esta planificación no tiene materiales cargados.")
          }
      }
  }

  const toggleMaterial = (matId: string) => {
      if (materialesSeleccionados.includes(matId)) {
          setMaterialesSeleccionados(materialesSeleccionados.filter(id => id !== matId))
      } else {
          setMaterialesSeleccionados([...materialesSeleccionados, matId])
      }
  }

  // --- MANEJO DE PARADAS DINÁMICAS ---
  const agregarParada = () => {
    setParadas([...paradas, { id: Date.now(), usuario_username: '', tipo_destino: 'MANUAL', destino_id: '', fecha: '', hora: '' }])
  }

  const quitarParada = (id: number) => {
    if (paradas.length === 1) return // Mínimo 1 parada
    setParadas(paradas.filter(p => p.id !== id))
  }

  const updateParada = (id: number, campo: string, valor: string) => {
    let nuevasParadas = paradas.map(p => {
        if (p.id === id) {
            let updatedP = { ...p, [campo]: valor }

            // Si cambió el tipo_destino, limpiamos el destino_id y las fechas
            if (campo === 'tipo_destino') {
                updatedP.destino_id = ''
                updatedP.fecha = ''
                updatedP.hora = ''
                updatedP.usuario_username = ''
            }

            // Si seleccionó una Ronda Fija, pre-llenamos la persona
            if (campo === 'destino_id' && updatedP.tipo_destino === 'RONDA') {
                const rondaSelect = rondasFijas.find(r => r.id === valor)
                if (rondaSelect) {
                    updatedP.usuario_username = rondaSelect.usuario_titular
                }
            }

            // Si seleccionó un Evento, pre-llenamos la fecha, hora y la persona
            if (campo === 'destino_id' && updatedP.tipo_destino === 'EVENTO') {
                const eventoSelect = eventosPendientes.find(e => e.id === valor)
                if (eventoSelect) {
                    updatedP.fecha = eventoSelect.fecha
                    updatedP.hora = eventoSelect.hora || ''
                    updatedP.usuario_username = eventoSelect.usuario_asignado || '' 
                }
            }

            return updatedP
        }
        return p
    })
    setParadas(nuevasParadas)
  }

  const getNombreMaterial = (id: string) => {
      const mat = materialesInventario.find(m => m.id === id)
      return mat ? mat.nombre : 'Material Desconocido'
  }

  // --- GUARDAR RUTA Y GENERAR TAREAS ---
  const handleSaveRuta = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const paradasValidas = paradas.filter(p => p.usuario_username && p.fecha)
      if (paradasValidas.length === 0) {
        alert("Agregá al menos una parada con persona y fecha.")
        setIsSaving(false)
        return
      }

      if (materialesSeleccionados.length === 0) {
          alert("Seleccioná al menos un material para armar el bolso.")
          setIsSaving(false)
          return
      }

      // 1. Guardamos la Ruta principal
      const { data: nuevaRuta, error: errRuta } = await supabase.from('rutas').insert([{
        nombre: formRuta.nombre,
        descripcion: formRuta.descripcion,
        materiales: materialesSeleccionados, 
        creado_por: currentUser
      }]).select().single()

      if (errRuta || !nuevaRuta) throw errRuta

      // Nombres de materiales para las descripciones
      const nombresMat = materialesSeleccionados.map(id => getNombreMaterial(id)).join(', ')

      // 2. Guardamos Paradas y Generamos Tareas
      for (let i = 0; i < paradasValidas.length; i++) {
        const paradaActual = paradasValidas[i]
        const esPrimera = (i === 0)
        const esUltima = (i === paradasValidas.length - 1)
        
        let descripcionTarea = ''
        
        // --- TEXTOS CLAROS DE CARRERA DE POSTAS ---
        if (paradasValidas.length === 1) {
            // Si hay una sola parada (va y vuelve), solo le decimos que arme el bolso
            descripcionTarea = `🎒 ARMAR BOLSO "${nuevaRuta.nombre}" con: ${nombresMat}.`
        } else if (esPrimera) {
            // Si es el primero, tiene que ARMARLO y pasarlo
            const sig = paradasValidas[i + 1]
            const fechaSig = new Date(sig.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
            descripcionTarea = `🎒 1º PASO: Armar el bolso "${nuevaRuta.nombre}" con: ${nombresMat}.\n\n👉 Luego pasárselo a ${sig.usuario_username} (para el ${fechaSig}).`
        } else if (!esUltima) {
            // Si está en el medio, RECIBE y pasa
            const sig = paradasValidas[i + 1]
            const fechaSig = new Date(sig.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
            descripcionTarea = `🚚 POSTA: Recibir el bolso "${nuevaRuta.nombre}".\n\n👉 Luego pasárselo a ${sig.usuario_username} (para el ${fechaSig}).`
        } else {
            // Si es el último, RECIBE y desarma
            descripcionTarea = `🏁 DESTINO FINAL: Recibir el bolso "${nuevaRuta.nombre}" y luego desarmarlo/devolverlo.`
        }

        // Creamos la tarea inyectando materiales_ids
        const { data: nuevaTarea } = await supabase.from('tareas').insert([{
          descripcion: descripcionTarea,
          asignado_a: paradaActual.usuario_username,
          creado_por: currentUser,
          fecha_limite: paradaActual.fecha,
          materiales_ids: materialesSeleccionados // <-- LA MAGIA
        }]).select().single()

        await supabase.from('ruta_paradas').insert([{
          ruta_id: nuevaRuta.id,
          orden: i + 1,
          usuario_username: paradaActual.usuario_username,
          fecha: paradaActual.fecha,
          hora: paradaActual.hora || null,
          tarea_id: nuevaTarea?.id
        }])
      }

      setFormRuta({ nombre: '', descripcion: '' })
      setMaterialesSeleccionados([])
      setParadas([{ id: 1, usuario_username: '', tipo_destino: 'MANUAL', destino_id: '', fecha: '', hora: '' }])
      setIsModalOpen(false)
      fetchData()

    } catch (error) {
      console.error(error)
      alert("Error al armar la ruta.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleEliminarRuta = async (id: string) => {
    if (window.confirm("¿Borrar esta ruta? (Las tareas generadas a las chicas NO se borrarán automáticamente)")) {
      await supabase.from('rutas').delete().eq('id', id)
      fetchData()
    }
  }

  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr + 'T12:00:00') 
    return fecha.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Rutas y Circuitos</h1>
          <p className="text-gray-600">Logística de materiales entre rondas</p>
        </div>
        
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
          >
            + Armar Nuevo Circuito
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando rutas...</div>
      ) : (
        <div className="grid gap-6">
          {rutas.map((ruta) => (
            <div key={ruta.id} className="bg-white rounded-3xl shadow-sm border border-indigo-100 overflow-hidden">
              
              <div className="bg-indigo-50/50 p-5 border-b border-indigo-100 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-indigo-900 mb-1">{ruta.nombre}</h2>
                  <p className="text-sm text-indigo-700">{ruta.descripcion || 'Sin descripción'}</p>
                  
                  {/* MATERIALES JSONB */}
                  {ruta.materiales?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ruta.materiales.map((matId: string, idx: number) => (
                        <span key={idx} className="bg-white border border-indigo-200 text-indigo-800 text-xs px-2 py-1 rounded-md font-medium shadow-sm">📦 {getNombreMaterial(matId)}</span>
                      ))}
                    </div>
                  )}
                </div>
                {userRole === 'ADMIN' && (
                  <button onClick={() => handleEliminarRuta(ruta.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition" title="Borrar Ruta">🗑️</button>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Itinerario / Pasamanos</h3>
                
                <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6">
                  {ruta.ruta_paradas?.map((parada: any, idx: number) => (
                    <div key={parada.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-indigo-500"></div>
                      
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                        <div>
                          <p className="font-bold text-gray-800 capitalize text-lg">
                            <span className="text-indigo-400 mr-1">{idx + 1}.</span> {parada.usuario_username}
                          </p>
                          <p className="text-sm text-gray-500 font-medium capitalize">
                            📅 {formatearFecha(parada.fecha)} {parada.hora && `⏰ ${parada.hora.substring(0,5)}hs`}
                          </p>
                        </div>
                        
                        <div className="text-xs font-semibold text-gray-400 bg-white px-3 py-1.5 rounded-lg border">
                          {idx === ruta.ruta_paradas.length - 1 ? '🏁 Fin del circuito (Desarmar)' : '⬇️ Le pasa el bolso a...'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
          {rutas.length === 0 && <p className="text-center py-10 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-300">No hay rutas logísticas armadas.</p>}
        </div>
      )}

      {/* --- MODAL NUEVA RUTA INTELIGENTE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b bg-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-indigo-900">Armar Nuevo Circuito</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 w-10 h-10 transition">✕</button>
            </div>
            
            <form onSubmit={handleSaveRuta} className="p-6 flex flex-col gap-6 overflow-y-auto">
              
              {/* MAGIA: IMPORTAR DESDE PLANI */}
              <div className="bg-indigo-100 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div className="flex-grow w-full">
                      <label className="text-xs font-bold text-indigo-800 uppercase">Importar bolso desde una Plani</label>
                      <select onChange={(e) => importarDesdePlani(e.target.value)} className="w-full p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm mt-1 text-gray-800 font-medium shadow-sm">
                          <option value="">-- Seleccionar Planificación --</option>
                          {planificaciones.map(plani => (
                              <option key={plani.id} value={plani.id}>{plani.titulo}</option>
                          ))}
                      </select>
                  </div>
              </div>

              {/* 1. INFO DEL BOLSO */}
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4">
                <h3 className="font-bold text-indigo-800 border-b border-indigo-100 pb-2">1. ¿Qué bolso estamos armando?</h3>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nombre del Circuito/Bolso *</label>
                  <input required value={formRuta.nombre} onChange={e => setFormRuta({...formRuta, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-white mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Bolso Selva - Semana 2" />
                </div>

                {/* SELECTOR MÚLTIPLE DE MATERIALES */}
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Materiales que lleva el bolso *</label>
                    <div className="bg-white border rounded-xl p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                        {materialesInventario.map(mat => (
                            <label key={mat.id} className="flex items-center gap-2 p-1.5 hover:bg-indigo-50 rounded cursor-pointer transition">
                                <input 
                                    type="checkbox" 
                                    checked={materialesSeleccionados.includes(mat.id)}
                                    onChange={() => toggleMaterial(mat.id)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 truncate" title={mat.nombre}>{mat.nombre}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Aclaraciones para las chicas</label>
                  <input value={formRuta.descripcion} onChange={e => setFormRuta({...formRuta, descripcion: e.target.value})} className="w-full p-3 border rounded-xl bg-white mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Ojo que el paracaídas está un poco descosido" />
                </div>
              </div>

              {/* 2. ITINERARIO INTELIGENTE */}
              <div>
                <h3 className="font-bold text-indigo-800 border-b border-indigo-100 pb-2 mb-4">2. Pasamanos (Carrera de postas)</h3>
                <div className="space-y-4">
                  {paradas.map((parada, index) => (
                    <div key={parada.id} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 relative">
                      <div className="absolute -left-2 -top-2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow">{index + 1}</div>
                      
                      {/* TEXTO DE UX: Cambia según si es el primero o el resto */}
                      <p className="text-sm font-bold text-indigo-600 border-b pb-1">
                          {index === 0 ? '🚩 Primera persona en usar el bolso' : '⬇️ Luego se lo pasa a...'}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 mt-1">
                          {/* Tipo de Destino (Para qué lo quiere) */}
                          <div className="w-full sm:w-1/3">
                              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Para qué lo lleva</label>
                              <select value={parada.tipo_destino} onChange={(e) => updateParada(parada.id, 'tipo_destino', e.target.value)} className="w-full p-2.5 border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-900 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-sm mt-1">
                                  <option value="RONDA">📍 Ronda Fija</option>
                                  <option value="EVENTO">🎉 Evento Especial</option>
                                  <option value="MANUAL">✏️ Carga Manual</option>
                              </select>
                          </div>

                          {/* Selector dinámico según el Tipo */}
                          <div className="w-full sm:w-2/3">
                              {parada.tipo_destino === 'RONDA' && (
                                  <>
                                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Elegir Ronda Fija</label>
                                      <select value={parada.destino_id} onChange={(e) => updateParada(parada.id, 'destino_id', e.target.value)} className="w-full p-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm mt-1">
                                          <option value="">-- Seleccionar Ronda --</option>
                                          {rondasFijas.map(r => (
                                              <option key={r.id} value={r.id}>{r.dia_semana} {r.hora.substring(0,5)}hs - {r.sede?.nombre} ({r.usuario_titular})</option>
                                          ))}
                                      </select>
                                  </>
                              )}
                              {parada.tipo_destino === 'EVENTO' && (
                                  <>
                                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Elegir Evento</label>
                                      <select value={parada.destino_id} onChange={(e) => updateParada(parada.id, 'destino_id', e.target.value)} className="w-full p-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm mt-1">
                                          <option value="">-- Seleccionar Evento --</option>
                                          {eventosPendientes.map(e => (
                                              <option key={e.id} value={e.id}>{formatearFecha(e.fecha)} - {e.titulo}</option>
                                          ))}
                                      </select>
                                  </>
                              )}
                              {parada.tipo_destino === 'MANUAL' && (
                                  <>
                                     <label className="text-xs font-bold text-gray-500 uppercase ml-1">¿A quién le toca?</label>
                                      <select required value={parada.usuario_username} onChange={(e) => updateParada(parada.id, 'usuario_username', e.target.value)} className="w-full p-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none capitalize text-sm mt-1">
                                      <option value="">-- Persona --</option>
                                      {usuarios.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                                      </select>
                                  </>
                              )}
                          </div>
                      </div>
                      
                      {/* Fecha y Hora */}
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl border">
                        {parada.tipo_destino !== 'MANUAL' && (
                            <div className="w-full sm:w-1/3">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Persona a cargo</label>
                                <input disabled value={parada.usuario_username || '---'} className="w-full p-2 border-0 bg-transparent text-gray-800 font-semibold outline-none capitalize text-sm" />
                            </div>
                        )}
                        <div className={`w-full ${parada.tipo_destino !== 'MANUAL' ? 'sm:w-1/3' : 'sm:w-1/2'}`}>
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">¿Para qué fecha?</label>
                          <input required type="date" value={parada.fecha} onChange={(e) => updateParada(parada.id, 'fecha', e.target.value)} className="w-full p-2 border-0 bg-transparent focus:ring-0 outline-none text-sm text-gray-800 font-medium" />
                        </div>
                        <div className={`w-full ${parada.tipo_destino !== 'MANUAL' ? 'sm:w-1/3' : 'sm:w-1/2'}`}>
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Hora (Opcional)</label>
                          <input type="time" value={parada.hora} onChange={(e) => updateParada(parada.id, 'hora', e.target.value)} className="w-full p-2 border-0 bg-transparent focus:ring-0 outline-none text-sm text-gray-800 font-medium" />
                        </div>
                      </div>

                      <button type="button" onClick={() => quitarParada(parada.id)} className="absolute -right-2 -top-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white transition w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow" title="Quitar parada">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={agregarParada} className="mt-4 text-indigo-600 font-bold hover:bg-indigo-50 py-3 px-4 rounded-xl border-2 border-dashed border-indigo-200 w-full transition flex items-center justify-center gap-2">
                  <span>+</span> Agregar paso al pasamanos
                </button>
              </div>

              {/* Guardar */}
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/3 py-3.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={isSaving} className="w-2/3 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm">
                  {isSaving ? 'Armando...' : 'Guardar Circuito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}