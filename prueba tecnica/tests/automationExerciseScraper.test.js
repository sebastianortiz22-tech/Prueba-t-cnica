const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { analizarHTMLProducto } = require('../src/extraccionAutomationExercise/automationExerciseScraper');

const rutaDelFixture = path.join(__dirname, 'fixtures', 'productoEjemplo.html');
const htmlDeEjemplo = fs.readFileSync(rutaDelFixture, 'utf-8');

test('extrae correctamente todos los campos de un producto válido', () => {
  const producto = analizarHTMLProducto(htmlDeEjemplo, '1', 'https://automationexercise.com/product_details/1');

  assert.equal(producto.externalId, '1');
  assert.equal(producto.name, 'Blue Top');
  assert.equal(producto.price, 500);
  assert.equal(producto.category, 'Women > Tops');
  assert.equal(producto.availability, 'In Stock');
  assert.equal(producto.condition, 'New');
  assert.equal(producto.brand, 'Polo');
  assert.equal(producto.sourceUrl, 'https://automationexercise.com/product_details/1');
});

test('lanza un error controlado cuando la página no corresponde a un producto', () => {
  const htmlDePaginaInexistente = '<html><body><h1>Página no encontrada</h1></body></html>';
  assert.throws(
    () => analizarHTMLProducto(htmlDePaginaInexistente, '99999', 'https://automationexercise.com/product_details/99999'),
    /No fue posible encontrar el producto/
  );
});

test('tolera campos opcionales ausentes sin romper la extracción', () => {
  const htmlSinMarca = htmlDeEjemplo.replace('<p><b>Brand:</b> Polo</p>', '');
  const producto = analizarHTMLProducto(htmlSinMarca, '1', 'https://automationexercise.com/product_details/1');
  assert.equal(producto.name, 'Blue Top');
  assert.equal(producto.brand, null);
});
