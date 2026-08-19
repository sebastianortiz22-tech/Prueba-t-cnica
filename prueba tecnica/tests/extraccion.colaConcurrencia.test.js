const { test } = require('node:test');
const assert = require('node:assert/strict');
const ColaConcurrencia = require('../src/extraccionAutomationExercise/extraccion.colaConcurrencia');

test('nunca ejecuta más tareas simultáneas que el máximo configurado', async () => {
  const cola = new ColaConcurrencia(2);
  let tareasEnEjecucion = 0;
  let maximoObservadoDeTareasSimultaneas = 0;

  const crearTareaDePrueba = (duracionMs) => async () => {
    tareasEnEjecucion += 1;
    maximoObservadoDeTareasSimultaneas = Math.max(maximoObservadoDeTareasSimultaneas, tareasEnEjecucion);
    await new Promise((resolve) => setTimeout(resolve, duracionMs));
    tareasEnEjecucion -= 1;
    return 'listo';
  };

  const promesasDeTareas = Array.from({ length: 6 }, () => cola.agregar(crearTareaDePrueba(50)));
  const resultados = await Promise.all(promesasDeTareas);

  assert.ok(
    maximoObservadoDeTareasSimultaneas <= 2,
    `se esperaban máximo 2 tareas simultáneas, se observaron ${maximoObservadoDeTareasSimultaneas}`
  );
  assert.equal(resultados.length, 6);
});

test('propaga el error de una tarea individual sin afectar a las demás', async () => {
  const cola = new ColaConcurrencia(2);

  const tareaQueFalla = () => Promise.reject(new Error('fallo simulado'));
  const tareaQueFunciona = () => Promise.resolve('ok');

  const resultados = await Promise.allSettled([
    cola.agregar(tareaQueFunciona),
    cola.agregar(tareaQueFalla),
    cola.agregar(tareaQueFunciona),
  ]);

  assert.equal(resultados[0].status, 'fulfilled');
  assert.equal(resultados[1].status, 'rejected');
  assert.equal(resultados[2].status, 'fulfilled');
});
