const https = require('https');
const { URL } = require('url');
const configuracionApp = require('../config/configuracionApp');

function descargarHTML(urlCompleta) {
  return new Promise((resolve, reject) => {
    const urlObjetivo = new URL(urlCompleta);

    const solicitudSaliente = https.get(
      urlObjetivo,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PruebaTecnicaBot/1.0)' },
        timeout: configuracionApp.timeoutScrapingMs,
      },
      (respuestaEntrante) => {
        if (respuestaEntrante.statusCode && respuestaEntrante.statusCode >= 400) {
          respuestaEntrante.resume(); // descarta el cuerpo para liberar el socket
          reject(new Error(`La fuente externa respondió con estado ${respuestaEntrante.statusCode}`));
          return;
        }

        const trozosDeHTML = [];
        respuestaEntrante.on('data', (trozo) => trozosDeHTML.push(trozo));
        respuestaEntrante.on('end', () => resolve(Buffer.concat(trozosDeHTML).toString('utf-8')));
      }
    );

    solicitudSaliente.on('timeout', () => {
      solicitudSaliente.destroy(new Error('Tiempo de espera agotado al consultar la fuente externa'));
    });
    solicitudSaliente.on('error', reject);
  });
}

function decodificarEntidadesHTMLBasicas(texto) {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extraerTextoTrasEtiqueta(html, etiquetaBuscada) {
  const indiceEtiqueta = html.indexOf(etiquetaBuscada);
  if (indiceEtiqueta === -1) return null;

  const textoRestante = html.slice(indiceEtiqueta + etiquetaBuscada.length);
  const coincidencia = textoRestante.match(/^[\s]*(?:<[^>]+>\s*)*([^<]+)/);
  if (!coincidencia) return null;

  return decodificarEntidadesHTMLBasicas(coincidencia[1]).trim() || null;
}

function extraerNombreDelProducto(html) {
  const bloqueDeInformacion = html.split('product-information')[1] || html;
  const coincidencia = bloqueDeInformacion.match(/<h2[^>]*>([^<]+)<\/h2>/i);
  return coincidencia ? coincidencia[1].trim() : null;
}

function extraerCategoria(html) {
  return extraerTextoTrasEtiqueta(html, 'Category:');
}

function extraerPrecio(html) {
  const coincidencia = html.match(/Rs\.\s*([\d,]+)/);
  if (!coincidencia) return null;
  return Number(coincidencia[1].replace(/,/g, ''));
}

function extraerDisponibilidad(html) {
  return extraerTextoTrasEtiqueta(html, 'Availability:');
}

function extraerCondicion(html) {
  return extraerTextoTrasEtiqueta(html, 'Condition:');
}

function extraerMarca(html) {
  return extraerTextoTrasEtiqueta(html, 'Brand:');
}

function construirUrlDetalleProducto(idExterno) {
  return `${configuracionApp.urlBaseAutomationExercise}/product_details/${idExterno}`;
}

function analizarHTMLProducto(html, idExterno, urlOrigen) {
  const nombreDelProducto = extraerNombreDelProducto(html);
  if (!nombreDelProducto) {
    throw new Error(
      `No fue posible encontrar el producto ${idExterno} en la página (puede no existir o el sitio cambió su estructura)`
    );
  }

  return {
    externalId: String(idExterno),
    name: nombreDelProducto,
    price: extraerPrecio(html),
    category: extraerCategoria(html),
    availability: extraerDisponibilidad(html),
    condition: extraerCondicion(html),
    brand: extraerMarca(html),
    sourceUrl: urlOrigen,
  };
}

async function obtenerProductoDesdeAutomationExercise(idExterno) {
  const urlOrigen = construirUrlDetalleProducto(idExterno);
  const htmlDescargado = await descargarHTML(urlOrigen);
  return analizarHTMLProducto(htmlDescargado, idExterno, urlOrigen);
}

module.exports = {
  descargarHTML,
  analizarHTMLProducto,
  construirUrlDetalleProducto,
  obtenerProductoDesdeAutomationExercise,
};
