const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AlmacenJSON = require('../src/almacen/almacenJSON');

function crearRutaTemporalDeAlmacen() {
  const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-json-test-'));
  return path.join(carpetaTemporal, 'datos.json');
}

test('inserta, actualiza y elimina registros persistiéndolos en disco', async () => {
  const rutaDeArchivo = crearRutaTemporalDeAlmacen();
  const almacen = new AlmacenJSON(rutaDeArchivo);

  const registroInsertado = await almacen.insertar({ id: 'a1', nombre: 'Prueba' });
  assert.equal(registroInsertado.nombre, 'Prueba');

  const registroActualizado = await almacen.actualizar('a1', { nombre: 'Prueba editada' });
  assert.equal(registroActualizado.nombre, 'Prueba editada');

  const registroEncontrado = await almacen.buscarPorId('a1');
  assert.equal(registroEncontrado.nombre, 'Prueba editada');

  const contenidoEnDisco = JSON.parse(fs.readFileSync(rutaDeArchivo, 'utf-8'));
  assert.equal(contenidoEnDisco[0].nombre, 'Prueba editada');

  const fueEliminado = await almacen.eliminar('a1');
  assert.equal(fueEliminado, true);
  assert.equal(await almacen.buscarPorId('a1'), null);
});

test('serializa escrituras concurrentes sin perder registros', async () => {
  const rutaDeArchivo = crearRutaTemporalDeAlmacen();
  const almacen = new AlmacenJSON(rutaDeArchivo);

  await Promise.all(
    Array.from({ length: 20 }, (_valor, indice) => almacen.insertar({ id: `id-${indice}`, indice }))
  );

  const todosLosRegistros = await almacen.todos();
  assert.equal(todosLosRegistros.length, 20);

  const contenidoEnDisco = JSON.parse(fs.readFileSync(rutaDeArchivo, 'utf-8'));
  assert.equal(contenidoEnDisco.length, 20);
});
