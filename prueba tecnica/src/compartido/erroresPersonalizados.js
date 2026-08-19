class ErrorDeAplicacion extends Error {
  constructor(mensaje, codigoHttp = 500, codigoInterno = 'ERROR_INTERNO') {
    super(mensaje);
    this.name = this.constructor.name;
    this.codigoHttp = codigoHttp;
    this.codigoInterno = codigoInterno;
  }
}

class ProductoNoEncontradoError extends ErrorDeAplicacion {
  constructor(id) {
    super(`No existe un producto con id "${id}"`, 404, 'PRODUCTO_NO_ENCONTRADO');
  }
}

class TrabajoExtraccionNoEncontradoError extends ErrorDeAplicacion {
  constructor(id) {
    super(`No existe un trabajo de extracción con id "${id}"`, 404, 'TRABAJO_NO_ENCONTRADO');
  }
}

class SolicitudInvalidaError extends ErrorDeAplicacion {
  constructor(mensaje, detalles = []) {
    super(mensaje, 400, 'SOLICITUD_INVALIDA');
    this.detalles = detalles;
  }
}

module.exports = {
  ErrorDeAplicacion,
  ProductoNoEncontradoError,
  TrabajoExtraccionNoEncontradoError,
  SolicitudInvalidaError,
};
