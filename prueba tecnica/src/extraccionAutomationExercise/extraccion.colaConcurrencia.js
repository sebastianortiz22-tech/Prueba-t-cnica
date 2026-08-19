class ColaConcurrencia {
  constructor(maximoDeTareasSimultaneas) {
    this.maximoDeTareasSimultaneas = maximoDeTareasSimultaneas;
    this._tareasEnEjecucion = 0;
    this._tareasPendientes = [];
  }

  agregar(tarea) {
    return new Promise((resolve, reject) => {
      this._tareasPendientes.push({ tarea, resolve, reject });
      this._intentarEjecutarSiguiente();
    });
  }

  _intentarEjecutarSiguiente() {
    if (this._tareasEnEjecucion >= this.maximoDeTareasSimultaneas) return;
    const siguienteTarea = this._tareasPendientes.shift();
    if (!siguienteTarea) return;

    this._tareasEnEjecucion += 1;
    Promise.resolve()
      .then(siguienteTarea.tarea)
      .then(siguienteTarea.resolve, siguienteTarea.reject)
      .finally(() => {
        this._tareasEnEjecucion -= 1;
        this._intentarEjecutarSiguiente();
      });

    this._intentarEjecutarSiguiente();
  }
}

module.exports = ColaConcurrencia;
