const repositorioProductos = require('../almacen/repositorioProductos');
const { ProductoNoEncontradoError } = require('../compartido/erroresPersonalizados');
const {
  validarCuerpoDeCreacion,
  validarCuerpoDeActualizacion,
} = require('./catalogoProductos.validaciones');

async function crearProductoManual({ cuerpo }) {
  validarCuerpoDeCreacion(cuerpo);
  const productoCreado = await repositorioProductos.crearProducto({ ...cuerpo, origen: 'MANUAL' });
  return { codigoHttp: 201, cuerpo: productoCreado };
}

async function listarProductosDisponibles({ query }) {
  const productosEncontrados = await repositorioProductos.listarProductos(query);
  return { codigoHttp: 200, cuerpo: productosEncontrados };
}

async function obtenerProductoDetalle({ parametros }) {
  const productoEncontrado = await repositorioProductos.obtenerProductoPorId(parametros.id);
  if (!productoEncontrado) throw new ProductoNoEncontradoError(parametros.id);
  return { codigoHttp: 200, cuerpo: productoEncontrado };
}

async function actualizarProductoExistente({ parametros, cuerpo }) {
  validarCuerpoDeActualizacion(cuerpo);
  const productoExistente = await repositorioProductos.obtenerProductoPorId(parametros.id);
  if (!productoExistente) throw new ProductoNoEncontradoError(parametros.id);

  const productoActualizado = await repositorioProductos.actualizarProducto(parametros.id, cuerpo);
  return { codigoHttp: 200, cuerpo: productoActualizado };
}

async function eliminarProductoExistente({ parametros }) {
  const fueEliminado = await repositorioProductos.eliminarProducto(parametros.id);
  if (!fueEliminado) throw new ProductoNoEncontradoError(parametros.id);
  return { codigoHttp: 204, cuerpo: null };
}

module.exports = {
  crearProductoManual,
  listarProductosDisponibles,
  obtenerProductoDetalle,
  actualizarProductoExistente,
  eliminarProductoExistente,
};
