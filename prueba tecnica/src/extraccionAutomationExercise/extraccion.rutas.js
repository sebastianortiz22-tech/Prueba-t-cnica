const controladorDeExtracciones = require('./extraccion.controlador');

function registrarRutasDeExtracciones(enrutador) {
  enrutador.post('/extractions', controladorDeExtracciones.solicitarExtraccion);
  enrutador.get('/extractions', controladorDeExtracciones.listarExtracciones);
  enrutador.get('/extractions/:id', controladorDeExtracciones.consultarEstadoExtraccion);
  enrutador.get('/extractions/:id/products', controladorDeExtracciones.listarProductosDeExtraccion);
}

module.exports = registrarRutasDeExtracciones;
