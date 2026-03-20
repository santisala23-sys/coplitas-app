'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SongModal({ isOpen, onClose, cancionAEditar, onSave }: any) {
  const [titulo, setTitulo] = useState('')
  const [anotaciones, setAnotaciones] = useState('')
  const [momentosText, setMomentosText] = useState('')
  const [tematicasText, setTematicasText] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [letraFile, setLetraFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Cargar datos si estamos editando
  useEffect(() => {
    if (cancionAEditar) {
      setTitulo(cancionAEditar.titulo || '')
      setAnotaciones(cancionAEditar.anotaciones || '')
      
      // Convertir el array de momentos a texto separado por comas
      const mText = cancionAEditar.cancion_momento?.map((cm: any) => cm.momentos.nombre).join(', ')
      setMomentosText(mText || '')
      
      // Convertir el array de temáticas a texto separado por comas
      const tText = cancionAEditar.cancion_tematica?.map((ct: any) => ct.tematicas.nombre).join(', ')
      setTematicasText(tText || '')
    } else {
      // Limpiar formulario si es una canción nueva
      setTitulo('')
      setAnotaciones('')
      setMomentosText('')
      setTematicasText('')
    }
    setAudioFile(null)
    setLetraFile(null)
  }, [cancionAEditar, isOpen])

  if (!isOpen) return null

  // Función auxiliar para subir archivos al Storage
  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('coplitas_archivos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('coplitas_archivos').getPublicUrl(filePath)
    return data.publicUrl
  }

  // Función principal de guardado
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let audio_url = cancionAEditar?.audio_url || null
      let letra_url = cancionAEditar?.letra_url || null

      // 1. Subir archivos si se seleccionaron nuevos
      if (audioFile) audio_url = await uploadFile(audioFile, 'audios')
      if (letraFile) letra_url = await uploadFile(letraFile, 'letras')

      // 2. Guardar Canción (Insertar o Actualizar)
      const songData = { titulo, anotaciones, audio_url, letra_url }
      let cancionId = cancionAEditar?.id

      if (cancionId) {
        await supabase.from('canciones').update(songData).eq('id', cancionId)
      } else {
        const { data: newSong, error: insertError } = await supabase
          .from('canciones')
          .insert([songData])
          .select()
          .single()
        if (insertError) throw insertError
        cancionId = newSong.id
      }

      // 3. Procesar Relaciones (Momentos y Temáticas)
      await updateRelaciones(cancionId, momentosText, 'momentos', 'cancion_momento', 'momento_id')
      await updateRelaciones(cancionId, tematicasText, 'tematicas', 'cancion_tematica', 'tematica_id')

      onSave() // Refresca la lista en la página principal
      onClose() // Cierra el modal
    } catch (error) {
      console.error('Error guardando:', error)
      alert('Hubo un error al guardar. Mirá la consola para más detalles.')
    } finally {
      setIsSaving(false)
    }
  }

  // Función auxiliar para gestionar etiquetas y relaciones (borra y crea nuevas)
  const updateRelaciones = async (cancionId: string, inputText: string, tablaTags: string, tablaRelacion: string, columnId: string) => {
    // Limpiar relaciones viejas
    await supabase.from(tablaRelacion).delete().eq('cancion_id', cancionId)

    if (!inputText.trim()) return

    const tags = inputText.split(',').map(t => t.trim()).filter(t => t !== '')
    
    for (const tag of tags) {
      // Upsert: Si la etiqueta no existe la crea, si existe no hace nada
      const { data: tagData } = await supabase
        .from(tablaTags)
        .upsert([{ nombre: tag }], { onConflict: 'nombre' })
        .select()
        .single()
      
      if (tagData) {
        // Crear la relación
        await supabase.from(tablaRelacion).insert([{ cancion_id: cancionId, [columnId]: tagData.id }])
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {cancionAEditar ? 'Editar Canción' : 'Nueva Canción'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título de la Canción *</label>
            <input required type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} 
              className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              placeholder="Ej: Chacarera de la bienvenida" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Momentos (separados por coma)</label>
              <input type="text" value={momentosText} onChange={(e) => setMomentosText(e.target.value)} 
                className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                placeholder="Ej: Saludo, Manos, Baile" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Palabras Clave (separadas por coma)</label>
              <input type="text" value={tematicasText} onChange={(e) => setTematicasText(e.target.value)} 
                className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" 
                placeholder="Ej: sol, primavera, animales" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Anotaciones / Sugerencias</label>
            <textarea value={anotaciones} onChange={(e) => setAnotaciones(e.target.value)} 
              className="w-full p-3 border rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" 
              rows={3} placeholder="Sugerencias de uso, acordes especiales, etc." 
            />
          </div>

          {/* CORRECCIÓN: ZONA DE ARCHIVOS PARA IOS/SAFARI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Subir Audio (.mp3, .wav, .m4a)</label>
              <input 
                type="file" 
                // Sumamos el audio/mp4 y x-m4a para iOS
                accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a" 
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)} 
                className="block w-full text-sm text-gray-500 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200" 
              />
              {cancionAEditar?.audio_url && !audioFile && <p className="text-xs text-green-600 mt-1 font-medium">Ya tiene un audio cargado. Subir otro lo reemplazará.</p>}
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Subir Letra (Doc o Imagen)</label>
              <input 
                type="file" 
                // Sumamos los formatos de imagen comunes e image/* para que abra la galería
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,image/jpeg,image/png,image/*" 
                onChange={(e) => setLetraFile(e.target.files?.[0] || null)} 
                className="block w-full text-sm text-gray-500 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200" 
              />
              {cancionAEditar?.letra_url && !letraFile && <p className="text-xs text-green-600 mt-1 font-medium">Ya tiene un archivo cargado. Subir otro lo reemplazará.</p>}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3 border-t pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Guardar Canción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}