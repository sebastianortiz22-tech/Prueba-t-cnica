const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

class AlmacenJSON {
  constructor(rutaArchivo) {
    this.rutaArchivo = rutaArchivo;
    this._cache = null;
    this._colaEscritura = Promise.resolve();
    this._asegurarArchivo();
  }

  _asegurarArchivo() {
    const carpeta = path.dirname(this.rutaArchivo);
    if (!fsSync.existsSync(carpeta)) fsSync.mkdirSync(carpeta, { recursive: true });
    if (!fsSync.existsSync(this.rutaArchivo)) fsSync.writeFileSync(this.rutaArchivo, '[]', 'utf-8');
  }

  async _cargarSiHaceFalta() {
    if (this._cache === null) {
      const contenido = await fs.readFile(this.rutaArchivo, 'utf-8');
      try {
        this._cache = JSON.parse(contenido);
      } catch {
        this._cache = [];
      }
    }
    return this._cache;
  }

  async _persistir() {
    const contenido = JSON.stringify(this._cache, null, 2);
    await fs.writeFile(this.rutaArchivo, contenido, 'utf-8');
  }

  _encolarEscritura(tarea) {
    this._colaEscritura = this._colaEscritura.then(tarea, tarea);
    return this._colaEscritura;
  }

  async todos() {
    const datos = await this._cargarSiHaceFalta();
    return [...datos];
  }

  async buscarPorId(id) {
    const datos = await this._cargarSiHaceFalta();
    return datos.find((registro) => registro.id === id) || null;
  }

  async insertar(registro) {
    return this._encolarEscritura(async () => {
      await this._cargarSiHaceFalta();
      this._cache.push(registro);
      await this._persistir();
      return registro;
    });
  }

  async actualizar(id, cambios) {
    return this._encolarEscritura(async () => {
      await this._cargarSiHaceFalta();
      const indice = this._cache.findIndex((registro) => registro.id === id);
      if (indice === -1) return null;
      this._cache[indice] = { ...this._cache[indice], ...cambios };
      await this._persistir();
      return this._cache[indice];
    });
  }

  async eliminar(id) {
    return this._encolarEscritura(async () => {
      await this._cargarSiHaceFalta();
      const indice = this._cache.findIndex((registro) => registro.id === id);
      if (indice === -1) return false;
      this._cache.splice(indice, 1);
      await this._persistir();
      return true;
    });
  }
}

module.exports = AlmacenJSON;
