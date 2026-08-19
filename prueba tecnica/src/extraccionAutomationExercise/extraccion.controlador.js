const repositorioTrabajosExtraccion = require('../almacen/repositorioTrabajosExtraccion');
const repositorioProductos = require('../almacen/repositorioProductos');
const { ejecutarTrabajoDeExtraccion } = require('./extraccion.trabajador');
const { SolicitudInvalidaError, TrabajoExtraccionNoEncontradoError } = require('../compartido/erroresPersonalizados');

function validarYNormalizarProductIds(cuerpo) {
  if (!cuerpo || !Array.isArray(cuerpo.productIds) || cuerpo.productIds.length === 0) {
    throw new SolicitudInvalidaError('Debe enviar "productIds" como un arreglo con al menos un elemento');
  }
  return [...new Set(cuerpo.productIds)];
}

async function solicitarExtraccion({ cuerpo }) {
  const idsProductosExternos = validarYNormalizarProductIds(cuerpo);
  const trabajoCreado = await repositorioTrabajosExtraccion.crearTrabajo(idsProductosExternos);

 
  ejecutarTrabajoDeExtraccion(trabajoCreado.id, idsProductosExternos).catch((error) => {
    console.error(`[extraccion ${trabajoCreado.id}] error inesperado durante el procesamiento en segundo plano:`, error);
  });

  return {
    codigoHttp: 202,
    cuerpo: { id: trabajoCreado.id, status: trabajoCreado.status, total: trabajoCreado.total },
  };
}

async function consultarEstadoExtraccion({ parametros }) {
  const trabajoEncontrado = await repositorioTrabajosExtraccion.obtenerTrabajoPorId(parametros.id);
  if (!trabajoEncontrado) throw new TrabajoExtraccionNoEncontradoError(parametros.id);
  return { codigoHttp: 200, cuerpo: trabajoEncontrado };
}

async function listarExtracciones() {
  const trabajosRegistrados = await repositorioTrabajosExtraccion.listarTrabajos();
  return { codigoHttp: 200, cuerpo: trabajosRegistrados };
}

async function listarProductosDeExtraccion({ parametros }) {
  const trabajoEncontrado = await repositorioTrabajosExtraccion.obtenerTrabajoPorId(parametros.id);
  if (!trabajoEncontrado) throw new TrabajoExtraccionNoEncontradoError(parametros.id);

  const productosDelTrabajo = await repositorioProductos.listarProductos({ trabajoExtraccionId: parametros.id });
  return { codigoHttp: 200, cuerpo: productosDelTrabajo };
}

module.exports = {
  solicitarExtraccion,
  consultarEstadoExtraccion,
  listarExtracciones,
  listarProductosDeExtraccion,
};
