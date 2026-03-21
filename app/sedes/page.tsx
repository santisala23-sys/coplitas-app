'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function SedesPage() {
  const [sedes, setSedes] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)

  // Estados de Modales
  const [isSedeModalOpen, setIsSedeModalOpen] = useState(false)
  const [sedeEditando, setSedeEditando] = useState<any>(null)
  
  const [isRondaModalOpen, setIsRondaModalOpen] = useState(false)
  const [rondaEditando, setRondaEditando] = useState<any>(null)
  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState<string>('')

  // Formularios
  const [formSede, setFormSede] = useState({ nombre: '', direccion: '', estado: 'ACTIVA' })
  const [formRonda, setFormRonda] = useState({ dia_semana: 'Lunes', hora: '16:00', usuario_titular: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role')
    setUserRole(role || 'USER')
    if (role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchSedesYUsuarios()
  }, [router])

  const fetchSedesYUsuarios = async () => {
    setLoading(true)
    
    // Traemos los usuarios activos
    const { data: dataUsr } = await supabase.from('usuarios').select('username').eq('activo', true).order('username')
    if (dataUsr) setUsuarios(dataUsr)

    // Traemos las sedes CON sus rondas fijas anidadas
    const { data: dataSedes } = await supabase
      .from('sedes')
      .select('*, rondas_fijas(*)')
      .order('nombre')
    
    // Ordenamos las rondas fijas adentro de cada sede por día de la semana
    if (dataSedes) {
      const sedesOrdenadas = dataSedes.map(sede => ({
        ...sede,
        rondas_fijas: sede.rondas_fijas ? sede.rondas_fijas.sort((a: any, b: any) => {
          return DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana)
        }) : []
      }))
      setSedes(sedesOrdenadas)
    }

    setLoading(false)
  }

  // --- CRUD SEDES ---
  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    const payload = { 
      nombre: formSede.nombre, 
      direccion: formSede.direccion, 
      estado: formSede.estado 
    }

    if (sedeEditando) {
      await supabase.from('sedes').update(payload).eq('id', sedeEditando.id)
    } else {
      await supabase.from('sedes').insert([payload])
    }
    
    setFormSede({ nombre: '', direccion: '', estado: 'ACTIVA' })
    setIsSedeModalOpen(false)
    setIsSaving(false)
    fetchSedesYUsuarios()
  }

  const handleEliminarSede = async (id: string, nombre: string) => {
    if (window.confirm(`¿Seguro que querés eliminar "${nombre}"? Se borrarán todas sus rondas y los materiales asociados quedarán sin sede.`)) {
      await supabase.from('sedes').delete().eq('id', id)
      fetchSedesYUsuarios()
    }
  }

  // --- CRUD RONDAS FIJAS ---
  const abrirModalNuevaRonda = (sedeId: string) => {
    setSedeSeleccionadaId(sedeId)
    setRondaEditando(null)
    setFormRonda({ dia_semana: 'Lunes', hora: '16:00', usuario_titular: '' })
    setIsRondaModalOpen(true)
  }

  const abrirModalEditarRonda = (ronda: any, sedeId: string) => {
    setSedeSeleccionadaId(sedeId)
    setRondaEditando(ronda)
    setFormRonda({ dia_semana: ronda.dia_semana, hora: ronda.hora.substring(0, 5), usuario_titular: ronda.usuario_titular })
    setIsRondaModalOpen(true)
  }

  const handleSaveRonda = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const payload = { ...formRonda, sede_id: sedeSeleccionadaId }
    
    if (rondaEditando) {
      await supabase.from('rondas_fijas').update(payload).eq('id', rondaEditando.id)
    } else {
      await supabase.from('rondas_fijas').insert([payload])
    }
    setIsRondaModalOpen(false)
    setIsSaving(false)
    fetchSedesYUsuarios()
  }

  const handleEliminarRonda = async (id: string) => {
    if (window.confirm('¿Eliminar este horario de la grilla?')) {
      await supabase.from('rondas_fijas').delete().eq('id', id)
      fetchSedesYUsuarios()
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <button onClick={() => router.push('/')} className="text-teal-600 font-semibold mb-2 flex items-center gap-1 hover:underline">
            ← Volver al Inicio
          </button>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Sedes y Cronogramas</h1>
          <p className="text-gray-600">Lugares físicos y la grilla semanal de rondas</p>
        </div>
        
        <button 
          onClick={() => { setSedeEditando(null); setFormSede({nombre: '', direccion: '', estado: 'ACTIVA'}); setIsSedeModalOpen(true); }} 
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
        >
          + Nueva Sede
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando sedes y cronogramas...</div>
      ) : (
        <div className="grid gap-6">
          {sedes.map((sede) => (
            <div key={sede.id} className="bg-white rounded-3xl shadow-sm border border-teal-100 overflow-hidden">
              
              {/* --- CABECERA DE LA SEDE --- */}
              <div className="bg-teal-50/50 p-5 border-b border-teal-100 flex justify-between items-start group">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
                    <span>📍</span> {sede.nombre}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sede.estado === 'ACTIVA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {sede.estado || 'ACTIVA'} 
                    </span>
                  </h2>
                  {sede.direccion ? (
                    <p className="text-teal-700 text-sm ml-6">{sede.direccion}</p>
                  ) : (
                    <p className="text-gray-400 text-sm italic ml-6">Sin dirección cargada</p>
                  )}
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setSedeEditando(sede); setFormSede({nombre: sede.nombre, direccion: sede.direccion || '', estado: sede.estado || 'ACTIVA'}); setIsSedeModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition font-medium">Editar Sede</button>
                  <button onClick={() => handleEliminarSede(sede.id, sede.nombre)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition font-medium">Borrar</button>
                </div>
              </div>

              {/* --- CRONOGRAMA DE LA SEDE --- */}
              <div className="p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Grilla Semanal de Rondas</h3>
                
                {sede.rondas_fijas?.length === 0 ? (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">No hay rondas fijas cargadas en esta sede todavía.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sede.rondas_fijas?.map((ronda: any) => (
                      <div key={ronda.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-teal-300 transition-colors shadow-sm group/ronda">
                        <div className="flex items-center gap-3">
                          <div className="bg-teal-100 text-teal-800 font-black px-3 py-1.5 rounded-lg text-sm text-center min-w-[50px]">
                            {ronda.dia_semana.substring(0,3).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-lg leading-none">{ronda.hora.substring(0, 5)} <span className="text-xs font-medium text-gray-500">hs</span></p>
                            <p className="text-sm font-medium text-teal-600 capitalize">👤 {ronda.usuario_titular}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover/ronda:opacity-100 transition-opacity">
                          <button onClick={() => abrirModalEditarRonda(ronda, sede.id)} className="text-xs text-blue-500 hover:bg-blue-50 px-2 py-1 rounded">Editar</button>
                          <button onClick={() => handleEliminarRonda(ronda.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">Borrar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => abrirModalNuevaRonda(sede.id)} className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-teal-200 text-teal-600 font-bold hover:bg-teal-50 transition flex items-center justify-center gap-2">
                  <span>+</span> Agregar Horario a {sede.nombre}
                </button>
              </div>

            </div>
          ))}
          {sedes.length === 0 && <p className="text-gray-500 text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">Aún no cargaste ninguna sede.</p>}
        </div>
      )}

      {/* --- MODAL: SEDE --- */}
      {isSedeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-teal-800">{sedeEditando ? 'Editar Sede' : 'Nueva Sede'}</h2>
              <button onClick={() => setIsSedeModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 transition w-10 h-10 flex items-center justify-center">✕</button>
            </div>
            
            <form onSubmit={handleSaveSede} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nombre de la Sede *</label>
                <input required value={formSede.nombre} onChange={e => setFormSede({...formSede, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej: Colegio Las Marías" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Dirección</label>
                <input value={formSede.direccion} onChange={e => setFormSede({...formSede, direccion: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Ej: Av. Cabildo 1234, CABA" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Estado *</label>
                <select value={formSede.estado} onChange={e => setFormSede({...formSede, estado: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="ACTIVA">Activa</option>
                  <option value="INACTIVA">Inactiva (Cerrada temporalmente)</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsSedeModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={isSaving || !formSede.nombre} className="w-2/3 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm">
                  {isSaving ? 'Guardando...' : 'Guardar Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: RONDA FIJA --- */}
      {isRondaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b bg-white flex justify-between items-center">
              <h2 className="text-xl font-bold text-teal-900">{rondaEditando ? 'Editar Horario' : 'Nuevo Horario'}</h2>
              <button onClick={() => setIsRondaModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 w-10 h-10 transition">✕</button>
            </div>
            <form onSubmit={handleSaveRonda} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Día *</label>
                  <select required value={formRonda.dia_semana} onChange={e => setFormRonda({...formRonda, dia_semana: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none">
                    {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-700">Hora *</label><input required type="time" value={formRonda.hora} onChange={e => setFormRonda({...formRonda, hora: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Persona a cargo *</label>
                <select required value={formRonda.usuario_titular} onChange={e => setFormRonda({...formRonda, usuario_titular: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 capitalize focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">-- Seleccionar --</option>
                  {usuarios.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                </select>
              </div>
              <div className="mt-4 flex gap-3 pt-2 border-t"><button type="button" onClick={() => setIsRondaModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancelar</button><button type="submit" disabled={isSaving || !formRonda.usuario_titular} className="w-2/3 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm">Guardar Horario</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}