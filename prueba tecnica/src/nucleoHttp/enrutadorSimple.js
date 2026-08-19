
class EnrutadorSimple {
  constructor() {
    this._rutasRegistradas = [];
  }

  _registrar(metodoHttp, patronDeRuta, manejador) {
    const nombresDeParametros = [];
    const textoRegex = patronDeRuta.replace(/\/:([^/]+)/g, (_coincidencia, nombreParametro) => {
      nombresDeParametros.push(nombreParametro);
      return '/([^/]+)';
    });
    const expresionRegular = new RegExp(`^${textoRegex}$`);
    this._rutasRegistradas.push({ metodoHttp, expresionRegular, nombresDeParametros, manejador });
  }

  get(patronDeRuta, manejador) {
    this._registrar('GET', patronDeRuta, manejador);
  }

  post(patronDeRuta, manejador) {
    this._registrar('POST', patronDeRuta, manejador);
  }

  patch(patronDeRuta, manejador) {
    this._registrar('PATCH', patronDeRuta, manejador);
  }

  delete(patronDeRuta, manejador) {
    this._registrar('DELETE', patronDeRuta, manejador);
  }

  encontrarCoincidencia(metodoHttp, rutaSolicitada) {
    for (const ruta of this._rutasRegistradas) {
      if (ruta.metodoHttp !== metodoHttp) continue;
      const coincidencia = ruta.expresionRegular.exec(rutaSolicitada);
      if (!coincidencia) continue;

      const parametros = {};
      ruta.nombresDeParametros.forEach((nombreParametro, indice) => {
        parametros[nombreParametro] = decodeURIComponent(coincidencia[indice + 1]);
      });

      return { manejador: ruta.manejador, parametros };
    }
    return null;
  }
}

module.exports = EnrutadorSimple;
