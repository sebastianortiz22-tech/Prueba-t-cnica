const path = require('path');
const crypto = require('crypto');
const AlmacenJSON = require('./almacenJSON');
const configuracionApp = require('../config/configuracionApp');

const almacenDeTrabajos = new AlmacenJSON(path.join(configuracionApp.carpetaDatos, 'trabajosExtraccion.json'));

const ESTADOS_TRABAJO = {
  PENDIENTE: 'PENDING',
  PROCESANDO: 'PROCESSING',
  COMPLETADO: 'COMPLETED',
  COMPLETADO_CON_ERRORES: 'COMPLETED_WITH_ERRORS',
  FALLIDO: 'FAILED',
};

async function crearTrabajo(idsProductosExternos) {
  const ahora = new Date().toISOString();
  const trabajo = {
    id: crypto.randomUUID(),
    status: ESTADOS_TRABAJO.PENDIENTE,
    total: idsProductosExternos.length,
    procesados: 0,
    exitosos: 0,
    fallidos: 0,
    
    detalles: idsProductosExternos.map((idExterno) => ({
      productId: idExterno,
      status: 'PENDING',
      productoId: null,
      error: null,
    })),
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  return almacenDeTrabajos.insertar(trabajo);
}

async function obtenerTrabajoPorId(id) {
  return almacenDeTrabajos.buscarPorId(id);
}

async function listarTrabajos() {
  return almacenDeTrabajos.todos();
}

async function actualizarTrabajo(id, cambios) {
  return almacenDeTrabajos.actualizar(id, { ...cambios, actualizadoEn: new Date().toISOString() });
}

async function actualizarDetalleProducto(trabajoId, idExterno, cambiosDetalle) {
  const trabajo = await almacenDeTrabajos.buscarPorId(trabajoId);
  if (!trabajo) return null;
  const detalles = trabajo.detalles.map((detalle) =>
    String(detalle.productId) === String(idExterno) ? { ...detalle, ...cambiosDetalle } : detalle
  );
  return actualizarTrabajo(trabajoId, { detalles });
}

module.exports = {
  ESTADOS_TRABAJO,
  crearTrabajo,
  obtenerTrabajoPorId,
  listarTrabajos,
  actualizarTrabajo,
  actualizarDetalleProducto,
};
