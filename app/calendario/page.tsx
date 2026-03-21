'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [vistaActiva, setVistaActiva] = useState<'mes' | 'semana'>('mes')
  const [eventos, setEventos] = useState<any[]>([])
  const [rondas, setRondas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null) // AGREGADO: Para filtrar
  const router = useRouter()

  const [diaSeleccionado, setDiaSeleccionado] = useState<any | null>(null)
  const [menuNuevoAbierto, setMenuNuevoAbierto] = useState(false)

  useEffect(() => {
    const role = Cookies.get('coplitas_role') || 'USER'
    const user = Cookies.get('coplitas_user') || ''
    setUserRole(role)
    setCurrentUser(user)
    
    // Llamamos a fetchData pasándole el rol y el usuario para que sepa cómo filtrar
    fetchData(role, user)
  }, [])

  const fetchData = async (role: string, username: string) => {
    setLoading(true)
    
    // 1. EVENTOS
    let queryEventos = supabase
      .from('eventos')
      .select('id, titulo, fecha, hora, usuario_asignado, estado')
      .neq('estado', 'CANCELADO')

    // Si NO es admin, filtramos solo los eventos donde ella está asignada
    if (role !== 'ADMIN') {
        queryEventos = queryEventos.eq('usuario_asignado', username)
    }
    
    const { data: dataEventos } = await queryEventos
    if (dataEventos) setEventos(dataEventos)

    // 2. RONDAS FIJAS
    let queryRondas = supabase
      .from('rondas_fijas')
      .select('id, dia_semana, hora, usuario_titular, sede:sedes(nombre)')

    // Si NO es admin, filtramos solo las rondas donde ella es titular
    if (role !== 'ADMIN') {
        queryRondas = queryRondas.eq('usuario_titular', username)
    }

    const { data: dataRondas } = await queryRondas
    if (dataRondas) setRondas(dataRondas)

    setLoading(false)
  }

  // --- NAVEGACIÓN DE FECHAS ---
  const goToday = () => setCurrentDate(new Date())

  const navigatePrev = () => {
      const newDate = new Date(currentDate)
      if (vistaActiva === 'mes') {
          newDate.setMonth(newDate.getMonth() - 1)
      } else {
          newDate.setDate(newDate.getDate() - 7)
      }
      setCurrentDate(newDate)
  }

  const navigateNext = () => {
      const newDate = new Date(currentDate)
      if (vistaActiva === 'mes') {
          newDate.setMonth(newDate.getMonth() + 1)
      } else {
          newDate.setDate(newDate.getDate() + 7)
      }
      setCurrentDate(newDate)
  }

  // --- LÓGICA PARA ARMAR LA GRILLA ---
  const getLunesDeSemana = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const getDaysToRender = () => {
      if (vistaActiva === 'mes') {
          const year = currentDate.getFullYear()
          const month = currentDate.getMonth()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          
          let firstDay = new Date(year, month, 1).getDay()
          firstDay = firstDay === 0 ? 6 : firstDay - 1 

          const blanks = Array.from({ length: firstDay }, (_, i) => null)
          const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
          
          return [...blanks, ...days]
      } else {
          const lunes = getLunesDeSemana(currentDate)
          return Array.from({ length: 7 }, (_, i) => {
              const d = new Date(lunes)
              d.setDate(lunes.getDate() + i)
              return d
          })
      }
  }

  const diasAGraficar = getDaysToRender()

  const getItemsForDay = (dateObj: Date | null) => {
    if (!dateObj) return []

    const year = dateObj.getFullYear()
    const month = dateObj.getMonth()
    const day = dateObj.getDate()

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    let dayOfWeekIndex = dateObj.getDay()
    dayOfWeekIndex = dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1
    const dayOfWeekName = DIAS_SEMANA[dayOfWeekIndex]

    const eventosDelDia = eventos
      .filter(e => e.fecha === dateStr)
      .map(e => ({ ...e, tipo: 'evento', persona: e.usuario_asignado }))

    const rondasDelDia = rondas
      .filter(r => r.dia_semana === dayOfWeekName)
      .map(r => ({ ...r, tipo: 'ronda', persona: r.usuario_titular }))

    return [...eventosDelDia, ...rondasDelDia].sort((a, b) => {
      const timeA = a.hora || '23:59'
      const timeB = b.hora || '23:59'
      return timeA.localeCompare(timeB)
    })
  }

  const getHeaderTitle = () => {
      if (vistaActiva === 'mes') {
          return `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      } else {
          const lunes = getLunesDeSemana(currentDate)
          const domingo = new Date(lunes)
          domingo.setDate(lunes.getDate() + 6)
          
          const mesLunes = MESES[lunes.getMonth()].substring(0,3)
          const mesDomingo = MESES[domingo.getMonth()].substring(0,3)
          
          if (mesLunes === mesDomingo) {
               return `Semana: ${lunes.getDate()} al ${domingo.getDate()} ${mesLunes}`
          } else {
               return `${lunes.getDate()} ${mesLunes} - ${domingo.getDate()} ${mesDomingo}`
          }
      }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      
      {/* CABECERA SUPERIOR */}
      <div className="mb-4 flex justify-between items-end">
         <div>
            <h1 className="text-3xl font-bold text-gray-800">Calendario</h1>
            <p className="text-gray-500">
               {userRole === 'ADMIN' ? 'Grilla completa del equipo' : `Mi agenda semanal y mensual`}
            </p>
         </div>

         {userRole === 'ADMIN' && (
             <div className="relative">
                 <button 
                    onClick={() => setMenuNuevoAbierto(!menuNuevoAbierto)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2"
                 >
                     <span>+</span> Agregar
                 </button>
                 
                 {menuNuevoAbierto && (
                     <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuNuevoAbierto(false)}></div>
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-2 animate-slide-up">
                            <button onClick={() => router.push('/sedes')} className="w-full text-left px-4 py-3 hover:bg-teal-50 text-teal-800 font-medium flex items-center gap-3 transition">
                                <span className="text-xl"></span> Cargar Ronda Fija
                            </button>
                            <button onClick={() => router.push('/eventos')} className="w-full text-left px-4 py-3 hover:bg-rose-50 text-rose-800 font-medium flex items-center gap-3 transition border-t border-gray-50">
                                <span className="text-xl"></span> Cargar Evento Especial
                            </button>
                        </div>
                     </>
                 )}
             </div>
         )}
      </div>

      {/* CONTROLES DEL CALENDARIO */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={goToday} className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition">Hoy</button>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={navigatePrev} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition font-bold">❮</button>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 min-w-[200px] md:min-w-[300px] text-center capitalize">
            {getHeaderTitle()}
          </h1>
          <button onClick={navigateNext} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition font-bold">❯</button>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl font-medium text-sm">
            <button 
                onClick={() => setVistaActiva('semana')} 
                className={`px-4 py-1.5 rounded-lg transition ${vistaActiva === 'semana' ? 'bg-white shadow text-indigo-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Semana
            </button>
            <button 
                onClick={() => setVistaActiva('mes')} 
                className={`px-4 py-1.5 rounded-lg transition ${vistaActiva === 'mes' ? 'bg-white shadow text-indigo-700 font-bold' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Mes
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Cargando tu agenda...</div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {DIAS_SEMANA.map(dia => (
              <div key={dia} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span className="hidden md:inline">{dia}</span>
                <span className="md:hidden">{dia.substring(0, 3)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {diasAGraficar.map((dateObj, index) => {
              if (!dateObj) {
                  return <div key={`blank-${index}`} className="min-h-[100px] md:min-h-[140px] border-b border-r border-gray-100 bg-gray-50/50"></div>
              }

              const day = dateObj.getDate()
              const items = getItemsForDay(dateObj)
              
              const hoy = new Date()
              const isToday = dateObj.getDate() === hoy.getDate() && dateObj.getMonth() === hoy.getMonth() && dateObj.getFullYear() === hoy.getFullYear()
              
              return (
                <div 
                    key={dateObj.toISOString()} 
                    onClick={() => setDiaSeleccionado({ dateObj, items })}
                    className={`min-h-[100px] border-b border-r border-gray-100 p-1 md:p-2 transition cursor-pointer md:cursor-default hover:bg-indigo-50/30 ${isToday ? 'bg-indigo-50/50' : ''} ${vistaActiva === 'semana' ? 'md:min-h-[60vh]' : 'md:min-h-[140px]'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600'}`}>
                      {day}
                    </span>
                  </div>
                  
                  <div className={`flex flex-col gap-1 overflow-y-auto no-scrollbar ${vistaActiva === 'semana' ? 'max-h-[50vh]' : 'max-h-[80px] md:max-h-none'}`}>
                    
                    <div className={`${vistaActiva === 'semana' ? 'hidden' : 'flex md:hidden'} flex-wrap gap-1 mt-1 px-1`}>
                        {items.map((item, idx) => (
                            <div key={idx} className={`w-2.5 h-2.5 rounded-full ${item.tipo === 'evento' ? 'bg-rose-500' : 'bg-teal-500'}`}></div>
                        ))}
                    </div>

                    <div className={`${vistaActiva === 'semana' ? 'flex' : 'hidden md:flex'} flex-col gap-1.5`}>
                        {items.map((item, idx) => (
                        <div key={idx} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border-l-4 shadow-sm truncate ${
                            item.tipo === 'evento' 
                            ? 'bg-rose-50 border-rose-500 text-rose-900' 
                            : 'bg-teal-50 border-teal-500 text-teal-900'
                        }`}>
                            <div className="flex justify-between items-center mb-0.5 opacity-70">
                                <span>{item.hora ? item.hora.substring(0,5) : 'Todo el día'}</span>
                                {/* Si NO somos admin, no hace falta que nos diga nuestro propio nombre todo el tiempo */}
                                {userRole === 'ADMIN' && item.persona && <span className="uppercase text-[9px] truncate max-w-[60px] text-right">{item.persona}</span>}
                            </div>
                            <div className="truncate">
                                {item.tipo === 'evento' ? `🎉 ${item.titulo}` : `📍 ${item.sede?.nombre}`}
                            </div>
                        </div>
                        ))}
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* LEYENDA (Footer) */}
      <div className="mt-4 flex justify-center gap-4 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-400"></span> Rondas Fijas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400"></span> Eventos</span>
      </div>

      {/* MODAL DETALLE DEL DÍA (Para Mobile) */}
      {diaSeleccionado && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50">
            <div className="bg-white rounded-t-3xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                    <h3 className="text-xl font-black text-gray-800 capitalize">
                        {diaSeleccionado.dateObj.getDate()} {MESES[diaSeleccionado.dateObj.getMonth()]}
                    </h3>
                    <button onClick={() => setDiaSeleccionado(null)} className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full font-bold">✕</button>
                </div>
                
                <div className="p-5 overflow-y-auto flex flex-col gap-3">
                    {diaSeleccionado.items.length === 0 ? (
                        <p className="text-gray-500 text-center py-10 italic">Día libre, no hay eventos ni rondas.</p>
                    ) : (
                        diaSeleccionado.items.map((item: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded-2xl border-l-4 shadow-sm flex flex-col gap-1 ${
                                item.tipo === 'evento' 
                                ? 'bg-rose-50 border-rose-500 text-rose-900' 
                                : 'bg-teal-50 border-teal-500 text-teal-900'
                            }`}>
                                <div className="flex justify-between font-black text-lg">
                                    <span>{item.tipo === 'evento' ? `🎉 ${item.titulo}` : `📍 ${item.sede?.nombre}`}</span>
                                    <span>{item.hora ? item.hora.substring(0,5) : ''}</span>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <span className="bg-white/60 px-2 py-1 rounded-md text-xs font-bold uppercase">
                                        {item.tipo === 'evento' ? 'Evento Especial' : 'Ronda Fija'}
                                    </span>
                                    {/* En mobile también ocultamos el nombre si no somos ADMIN */}
                                    {userRole === 'ADMIN' && item.persona && (
                                        <span className="bg-white/60 px-2 py-1 rounded-md text-xs font-bold uppercase">
                                            👤 {item.persona}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  )
}