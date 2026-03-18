'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Cookies from 'js-cookie'

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [materiales, setMateriales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<any>(null)
  
  const [formEvento, setFormEvento] = useState({
    titulo: '', fecha: '', hora: '', direccion: '', usuario_asignado: '', materiales: [] as any[], notas: '', estado: 'PENDIENTE'
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role') || 'USER'
    const user = Cookies.get('coplitas_user') || ''
    setUserRole(role)
    setCurrentUser(user)
    fetchData(role, user)
  }, [])

  const fetchData = async (role: string, user: string) => {
    setLoading(true)
    
    // Traemos Usuarios y Materiales para los selectores
    const { data: dataUsr } = await supabase.from('usuarios').select('username').eq('activo', true)
    if (dataUsr) setUsuarios(dataUsr)

    const { data: dataMat } = await supabase.from('materiales').select('id, nombre').order('nombre')
    if (dataMat) setMateriales(dataMat)

    // Traemos los eventos (Si es admin ve todos, si es user ve los suyos)
    let query = supabase.from('eventos').select('*').order('fecha', { ascending: true })
    if (role !== 'ADMIN') query = query.eq('usuario_asignado', user)
    
    const { data: dataEvt } = await query
    if (dataEvt) setEventos(dataEvt)

    setLoading(false)
  }

  const handleSaveEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const payload = { ...formEvento }

    if (eventoEditando) {
      await supabase.from('eventos').update(payload).eq('id', eventoEditando.id)
    } else {
      await supabase.from('eventos').insert([payload])
    }

    // MAGIA: Si asignaste materiales y una persona, te pregunta si querés generarle la tarea
    if (formEvento.materiales.length > 0 && formEvento.usuario_asignado && !eventoEditando) {
      const nombresMateriales = formEvento.materiales.map((m: any) => m.nombre).join(', ')
      const generarTarea = window.confirm(`¿Querés crearle una Tarea a ${formEvento.usuario_asignado} para que prepare: ${nombresMateriales}?`)
      
      if (generarTarea) {
        await supabase.from('tareas').insert([{
          descripcion: `🎒 Preparar bolso para evento "${formEvento.titulo}": Llevar ${nombresMateriales}.`,
          asignado_a: formEvento.usuario_asignado,
          creado_por: currentUser,
          fecha_limite: formEvento.fecha
        }])
      }
    }

    setFormEvento({ titulo: '', fecha: '', hora: '', direccion: '', usuario_asignado: '', materiales: [], notas: '', estado: 'PENDIENTE' })
    setIsModalOpen(false)
    setIsSaving(false)
    fetchData(userRole!, currentUser!)
  }

  const toggleMaterial = (mat: any) => {
    const existe = formEvento.materiales.find((m:any) => m.id === mat.id)
    if (existe) {
      setFormEvento({ ...formEvento, materiales: formEvento.materiales.filter((m:any) => m.id !== mat.id) })
    } else {
      setFormEvento({ ...formEvento, materiales: [...formEvento.materiales, { id: mat.id, nombre: mat.nombre }] })
    }
  }

  const handleEliminar = async (id: string, titulo: string) => {
    if (window.confirm(`¿Seguro que querés cancelar y borrar el evento "${titulo}"?`)) {
      await supabase.from('eventos').delete().eq('id', id)
      fetchData(userRole!, currentUser!)
    }
  }

  const toggleEstado = async (evento: any) => {
    const nuevoEstado = evento.estado === 'PENDIENTE' ? 'REALIZADO' : 'PENDIENTE'
    await supabase.from('eventos').update({ estado: nuevoEstado }).eq('id', evento.id)
    fetchData(userRole!, currentUser!)
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-gray-800">Eventos</h1>
          <p className="text-gray-600">Cumpleaños, talleres y rondas esporádicas</p>
        </div>
        
        {userRole === 'ADMIN' && (
          <button 
            onClick={() => { setEventoEditando(null); setFormEvento({ titulo: '', fecha: '', hora: '', direccion: '', usuario_asignado: '', materiales: [], notas: '', estado: 'PENDIENTE' }); setIsModalOpen(true); }} 
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition w-full md:w-auto"
          >
            + Nuevo Evento
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando eventos...</div>
      ) : (
        <div className="grid gap-4">
          {eventos.map((ev) => (
            <div key={ev.id} className={`bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between transition-all ${ev.estado === 'REALIZADO' ? 'border-gray-200 opacity-60 bg-gray-50' : 'border-rose-100'}`}>
              
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className={`text-xl font-bold ${ev.estado === 'REALIZADO' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{ev.titulo}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${ev.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {ev.estado}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                  <span className="flex items-center gap-1">📅 {new Date(ev.fecha).toLocaleDateString('es-AR', {day: '2-digit', month: 'short'})}</span>
                  {ev.hora && <span className="flex items-center gap-1">⏰ {ev.hora.slice(0,5)} hs</span>}
                  {ev.direccion && <span className="flex items-center gap-1">📍 {ev.direccion}</span>}
                  <span className="flex items-center gap-1 capitalize font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">👤 {ev.usuario_asignado || 'Sin asignar'}</span>
                </div>

                {ev.materiales && ev.materiales.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Materiales a llevar:</p>
                    <div className="flex flex-wrap gap-2">
                      {ev.materiales.map((m: any) => (
                        <span key={m.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md">📦 {m.nombre}</span>
                      ))}
                    </div>
                  </div>
                )}

                {ev.notas && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-amber-800 text-sm">
                    <strong>Notas:</strong> {ev.notas}
                  </div>
                )}
              </div>
              
              <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-start">
                <button onClick={() => toggleEstado(ev)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${ev.estado === 'PENDIENTE' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  {ev.estado === 'PENDIENTE' ? '✓ Marcar Listo' : 'Deshacer'}
                </button>
                {userRole === 'ADMIN' && (
                  <>
                    <button onClick={() => { setEventoEditando(ev); setFormEvento({ titulo: ev.titulo, fecha: ev.fecha, hora: ev.hora || '', direccion: ev.direccion || '', usuario_asignado: ev.usuario_asignado || '', materiales: ev.materiales || [], notas: ev.notas || '', estado: ev.estado }); setIsModalOpen(true); }} className="px-4 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100">Editar</button>
                    <button onClick={() => handleEliminar(ev.id, ev.titulo)} className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100">Borrar</button>
                  </>
                )}
              </div>

            </div>
          ))}
          {eventos.length === 0 && <p className="text-gray-500 text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">No hay eventos programados.</p>}
        </div>
      )}

      {/* MODAL: EVENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-white"><h2 className="text-xl font-bold text-rose-800">{eventoEditando ? 'Editar Evento' : 'Nuevo Evento'}</h2><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 rounded-full font-bold text-xl p-2 w-10 h-10 flex justify-center items-center">✕</button></div>
            
            <form onSubmit={handleSaveEvento} className="p-6 flex flex-col gap-4 overflow-y-auto">
              
              <div><label className="text-sm font-semibold text-gray-700">Título del Evento *</label><input required value={formEvento.titulo} onChange={e => setFormEvento({...formEvento, titulo: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ej: Cumpleaños de Sofía" /></div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-gray-700">Fecha *</label><input required type="date" value={formEvento.fecha} onChange={e => setFormEvento({...formEvento, fecha: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" /></div>
                <div><label className="text-sm font-semibold text-gray-700">Hora</label><input type="time" value={formEvento.hora} onChange={e => setFormEvento({...formEvento, hora: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" /></div>
              </div>

              <div><label className="text-sm font-semibold text-gray-700">Dirección</label><input value={formEvento.direccion} onChange={e => setFormEvento({...formEvento, direccion: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="Ej: Salón La Fiesta, Av. San Martín 123" /></div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Asignar a:</label>
                <select value={formEvento.usuario_asignado} onChange={e => setFormEvento({...formEvento, usuario_asignado: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 capitalize focus:ring-2 focus:ring-rose-500 outline-none">
                  <option value="">-- Seleccionar --</option>
                  {usuarios.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Materiales a preparar (Bolso)</label>
                <div className="border rounded-xl p-3 bg-gray-50 max-h-32 overflow-y-auto flex flex-wrap gap-2">
                  {materiales.map(mat => {
                    const seleccionado = formEvento.materiales.some((m:any) => m.id === mat.id)
                    return (
                      <button type="button" key={mat.id} onClick={() => toggleMaterial(mat)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${seleccionado ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                        {seleccionado ? '✓ ' : '+ '} {mat.nombre}
                      </button>
                    )
                  })}
                  {materiales.length === 0 && <span className="text-xs text-gray-400">No hay materiales en stock.</span>}
                </div>
              </div>

              <div><label className="text-sm font-semibold text-gray-700">Notas Especiales</label><textarea value={formEvento.notas} onChange={e => setFormEvento({...formEvento, notas: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50 mt-1 resize-none focus:ring-2 focus:ring-rose-500 outline-none" rows={2} placeholder="Ej: Hay que llegar 15 min antes, llevar pendrive." /></div>

              <div className="mt-4 flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/3 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={isSaving || !formEvento.titulo || !formEvento.fecha} className="w-2/3 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-sm">
                  {isSaving ? 'Guardando...' : 'Guardar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}