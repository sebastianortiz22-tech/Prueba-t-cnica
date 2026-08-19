const LIMITE_BYTES_CUERPO = 1024 * 1024; 

function leerCuerpoJSON(solicitud) {
  return new Promise((resolve, reject) => {
    const trozosRecibidos = [];
    let tamanoAcumulado = 0;

    solicitud.on('data', (trozo) => {
      tamanoAcumulado += trozo.length;
      if (tamanoAcumulado > LIMITE_BYTES_CUERPO) {
        reject(new Error('CUERPO_DEMASIADO_GRANDE'));
        solicitud.destroy();
        return;
      }
      trozosRecibidos.push(trozo);
    });

    solicitud.on('end', () => {
      if (trozosRecibidos.length === 0) return resolve({});
      try {
        const textoCrudo = Buffer.concat(trozosRecibidos).toString('utf-8');
        resolve(textoCrudo.trim() ? JSON.parse(textoCrudo) : {});
      } catch {
        reject(new Error('JSON_INVALIDO'));
      }
    });

    solicitud.on('error', reject);
  });
}

function responderJSON(respuesta, codigoHttp, cuerpo) {
  if (cuerpo === null || cuerpo === undefined) {
    respuesta.writeHead(codigoHttp);
    respuesta.end();
    return;
  }
  const textoDeRespuesta = JSON.stringify(cuerpo, null, 2);
  respuesta.writeHead(codigoHttp, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(textoDeRespuesta),
  });
  respuesta.end(textoDeRespuesta);
}

module.exports = { leerCuerpoJSON, responderJSON };
