const controladorDeProductos = require('./catalogoProductos.controlador');

function registrarRutasDeProductos(enrutador) {
  enrutador.post('/products', controladorDeProductos.crearProductoManual);
  enrutador.get('/products', controladorDeProductos.listarProductosDisponibles);
  enrutador.get('/products/:id', controladorDeProductos.obtenerProductoDetalle);
  enrutador.patch('/products/:id', controladorDeProductos.actualizarProductoExistente);
  enrutador.delete('/products/:id', controladorDeProductos.eliminarProductoExistente);
}

module.exports = registrarRutasDeProductos;
