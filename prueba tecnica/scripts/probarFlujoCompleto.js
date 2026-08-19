const URL_BASE_DEL_SERVICIO = process.env.URL_BASE_SERVICIO || 'http://localhost:3000';

function esperarMilisegundos(milisegundos) {
  return new Promise((resolve) => setTimeout(resolve, milisegundos));
}

async function main() {
  console.log('1) Creando un producto manual');
  const respuestaCreacion = await fetch(`${URL_BASE_DEL_SERVICIO}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Producto de prueba manual', price: 10, category: 'Test' }),
  });
  console.log('   ->', respuestaCreacion.status, await respuestaCreacion.json());

  console.log('2) Solicitando extracción de los productos 1, 2 y 99999 (el último debería fallar)...');
  const respuestaExtraccion = await fetch(`${URL_BASE_DEL_SERVICIO}/extractions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds: [1, 2, 99999] }),
  });
  const trabajoCreado = await respuestaExtraccion.json();
  console.log('   ->', respuestaExtraccion.status, trabajoCreado);

  console.log('3) Consultando el estado del trabajo hasta que finalice...');
  let trabajoActual;
  do {
    await esperarMilisegundos(1000);
    const respuestaEstado = await fetch(`${URL_BASE_DEL_SERVICIO}/extractions/${trabajoCreado.id}`);
    trabajoActual = await respuestaEstado.json();
    console.log(`   -> ${trabajoActual.status} (${trabajoActual.procesados}/${trabajoActual.total})`);
  } while (trabajoActual.status === 'PENDING' || trabajoActual.status === 'PROCESSING');

  console.log('4) Resultado final del trabajo:');
  console.log(JSON.stringify(trabajoActual, null, 2));

  const respuestaProductosDelTrabajo = await fetch(`${URL_BASE_DEL_SERVICIO}/extractions/${trabajoCreado.id}/products`);
  console.log('5) Productos guardados por esta extracción:');
  console.log(await respuestaProductosDelTrabajo.json());
}

main().catch((error) => {
  console.error('El script de prueba falló:', error);
  process.exit(1);
});
