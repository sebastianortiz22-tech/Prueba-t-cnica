const { URL } = require('url');
const EnrutadorSimple = require('./nucleoHttp/enrutadorSimple');
const { leerCuerpoJSON, responderJSON } = require('./nucleoHttp/cuerpoJSON');
const registrarRutasDeProductos = require('./catalogoProductos/catalogoProductos.rutas');
const registrarRutasDeExtracciones = require('./extraccionAutomationExercise/extraccion.rutas');
const { ErrorDeAplicacion } = require('./compartido/erroresPersonalizados');

const enrutadorPrincipal = new EnrutadorSimple();
registrarRutasDeProductos(enrutadorPrincipal);
registrarRutasDeExtracciones(enrutadorPrincipal);

enrutadorPrincipal.get('/health', async () => ({
  codigoHttp: 200,
  cuerpo: { status: 'ok', timestamp: new Date().toISOString() },
}));

const METODOS_CON_CUERPO = new Set(['POST', 'PATCH', 'PUT']);

function responderConError(error, respuesta) {
  if (error.message === 'JSON_INVALIDO') {
    return responderJSON(respuesta, 400, {
      error: 'JSON_INVALIDO',
      mensaje: 'El cuerpo enviado no es un JSON válido',
    });
  }
  if (error.message === 'CUERPO_DEMASIADO_GRANDE') {
    return responderJSON(respuesta, 413, {
      error: 'CUERPO_DEMASIADO_GRANDE',
      mensaje: 'El cuerpo de la petición excede el límite permitido',
    });
  }
  if (error instanceof ErrorDeAplicacion) {
    return responderJSON(respuesta, error.codigoHttp, {
      error: error.codigoInterno,
      mensaje: error.message,
      ...(error.detalles ? { detalles: error.detalles } : {}),
    });
  }

  console.error('Error no controlado:', error);
  return responderJSON(respuesta, 500, {
    error: 'ERROR_INTERNO',
    mensaje: 'Ocurrió un error inesperado en el servidor',
  });
}

async function manejarSolicitudHTTP(solicitud, respuesta) {
  const marcaDeTiempoInicial = Date.now();
  const urlAnalizada = new URL(solicitud.url, `http://${solicitud.headers.host || 'localhost'}`);
  const coincidenciaDeRuta = enrutadorPrincipal.encontrarCoincidencia(solicitud.method, urlAnalizada.pathname);

  if (!coincidenciaDeRuta) {
    responderJSON(respuesta, 404, {
      error: 'RUTA_NO_ENCONTRADA',
      mensaje: `No existe ${solicitud.method} ${urlAnalizada.pathname}`,
    });
    return;
  }

  try {
    const cuerpoDeLaPeticion = METODOS_CON_CUERPO.has(solicitud.method) ? await leerCuerpoJSON(solicitud) : {};
    const parametrosDeConsulta = Object.fromEntries(urlAnalizada.searchParams.entries());

    const resultado = await coincidenciaDeRuta.manejador({
      parametros: coincidenciaDeRuta.parametros,
      query: parametrosDeConsulta,
      cuerpo: cuerpoDeLaPeticion,
    });

    responderJSON(respuesta, resultado.codigoHttp, resultado.cuerpo);
  } catch (error) {
    responderConError(error, respuesta);
  } finally {
    const duracionMs = Date.now() - marcaDeTiempoInicial;
    console.log(`${solicitud.method} ${urlAnalizada.pathname} -> ${respuesta.statusCode} (${duracionMs}ms)`);
  }
}

module.exports = { manejarSolicitudHTTP, enrutadorPrincipal };
