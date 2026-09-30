import { useState } from 'react'
import { actualizarUsuario } from '../lib/usuarios'

function leerFoto(file, setError, setPreview) {
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    setError('La foto no debe superar 2 MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => setPreview(e.target.result)
  reader.readAsDataURL(file)
}

function CambiarFoto({ sesion, onCerrar, onActualizado }) {
  const [preview, setPreview] = useState(sesion?.foto || '')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const guardar = () => {
    setError('')
    if (!preview) {
      setError('Selecciona o toma una foto')
      return
    }
    try {
      actualizarUsuario(sesion.id, { foto: preview })
      const raw = sessionStorage.getItem('sesion_usuario_v1')
      if (raw) {
        const s = JSON.parse(raw)
        s.foto = preview
        sessionStorage.setItem('sesion_usuario_v1', JSON.stringify(s))
      }
      setOk('Foto actualizada')
      onActualizado?.({ ...sesion, foto: preview })
    } catch (err) {
      setError(err.message || 'No se pudo guardar la foto')
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <h3>Cambiar foto de perfil</h3>
        {preview && <img src={preview} alt="" className="usuario-foto-preview" />}
        <div className="foto-opciones">
          <label className="btn btn-secondary foto-btn">
            Subir foto
            <input type="file" accept="image/*" hidden onChange={(e) => leerFoto(e.target.files?.[0], setError, setPreview)} />
          </label>
          <label className="btn btn-primary foto-btn">
            Tomar foto
            <input type="file" accept="image/*" capture="user" hidden onChange={(e) => leerFoto(e.target.files?.[0], setError, setPreview)} />
          </label>
        </div>
        {error && <p className="master-error">{error}</p>}
        {ok && <p style={{ color: '#16a34a' }}>{ok}</p>}
        <div className="filtros-botones" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-primary" onClick={guardar}>Aplicar foto</button>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default CambiarFoto
