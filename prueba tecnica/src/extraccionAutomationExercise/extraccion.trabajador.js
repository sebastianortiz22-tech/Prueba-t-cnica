const { obtenerProductoDesdeAutomationExercise } = require('./automationExerciseScraper');
const repositorioTrabajosExtraccion = require('../almacen/repositorioTrabajosExtraccion');
const repositorioProductos = require('../almacen/repositorioProductos');
const ColaConcurrencia = require('./extraccion.colaConcurrencia');
const configuracionApp = require('../config/configuracionApp');


const colaGlobalDeScraping = new ColaConcurrencia(configuracionApp.maxExtraccionesSimultaneas);

function esperarMilisegundos(milisegundos) {
  return new Promise((resolve) => setTimeout(resolve, milisegundos));
}

async function extraerProductoConReintentos(idExterno) {
  let ultimoErrorCapturado;

  for (let numeroDeIntento = 1; numeroDeIntento <= configuracionApp.intentosMaximosScraping; numeroDeIntento += 1) {
    try {
      return await obtenerProductoDesdeAutomationExercise(idExterno);
    } catch (error) {
      ultimoErrorCapturado = error;
      const esUltimoIntento = numeroDeIntento === configuracionApp.intentosMaximosScraping;
      if (!esUltimoIntento) {
        await esperarMilisegundos(300 * numeroDeIntento); 
      }
    }
  }

  throw ultimoErrorCapturado;
}

async function recalcularContadoresDelTrabajo(trabajoId) {
  const trabajoActual = await repositorioTrabajosExtraccion.obtenerTrabajoPorId(trabajoId);
  const detallesFinalizados = trabajoActual.detalles.filter((d) => d.status === 'SUCCESS' || d.status === 'FAILED');
  await repositorioTrabajosExtraccion.actualizarTrabajo(trabajoId, {
    procesados: detallesFinalizados.length,
    exitosos: detallesFinalizados.filter((d) => d.status === 'SUCCESS').length,
    fallidos: detallesFinalizados.filter((d) => d.status === 'FAILED').length,
  });
}


async function procesarUnProductoDelTrabajo(trabajoId, idExterno) {
  await repositorioTrabajosExtraccion.actualizarDetalleProducto(trabajoId, idExterno, { status: 'PROCESSING' });

  try {
    const datosExtraidos = await extraerProductoConReintentos(idExterno);
    const productoGuardado = await repositorioProductos.guardarOActualizarProductoExtraido(datosExtraidos, trabajoId);

    await repositorioTrabajosExtraccion.actualizarDetalleProducto(trabajoId, idExterno, {
      status: 'SUCCESS',
      productoId: productoGuardado.id,
      error: null,
    });
  } catch (error) {
    await repositorioTrabajosExtraccion.actualizarDetalleProducto(trabajoId, idExterno, {
      status: 'FAILED',
      error: error.message,
    });
  } finally {
    await recalcularContadoresDelTrabajo(trabajoId);
  }
}

function calcularEstadoFinal(trabajo) {
  if (trabajo.exitosos === 0) return 'FAILED';
  if (trabajo.fallidos > 0) return 'COMPLETED_WITH_ERRORS';
  return 'COMPLETED';
}

async function ejecutarTrabajoDeExtraccion(trabajoId, idsProductosExternos) {
  await repositorioTrabajosExtraccion.actualizarTrabajo(trabajoId, { status: 'PROCESSING' });

  const tareasEnCurso = idsProductosExternos.map((idExterno) =>
    colaGlobalDeScraping.agregar(() => procesarUnProductoDelTrabajo(trabajoId, idExterno))
  );

  await Promise.all(tareasEnCurso);

  const trabajoFinalizado = await repositorioTrabajosExtraccion.obtenerTrabajoPorId(trabajoId);
  await repositorioTrabajosExtraccion.actualizarTrabajo(trabajoId, {
    status: calcularEstadoFinal(trabajoFinalizado),
  });
}

module.exports = { ejecutarTrabajoDeExtraccion, colaGlobalDeScraping };
