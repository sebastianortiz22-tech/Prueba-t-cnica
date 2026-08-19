const path = require('path');
const crypto = require('crypto');
const AlmacenJSON = require('./almacenJSON');
const configuracionApp = require('../config/configuracionApp');

const almacenDeProductos = new AlmacenJSON(path.join(configuracionApp.carpetaDatos, 'productos.json'));

function normalizarCamposDeProducto(datos) {
  return {
    externalId: datos.externalId !== undefined ? String(datos.externalId) : null,
    name: typeof datos.name === 'string' ? datos.name.trim() : datos.name ?? null,
    price: datos.price ?? null,
    category: datos.category ?? null,
    availability: datos.availability ?? null,
    condition: datos.condition ?? null,
    brand: datos.brand ?? null,
    sourceUrl: datos.sourceUrl ?? null,
  };
}

async function crearProducto(datos) {
  const ahora = new Date().toISOString();
  const producto = {
    id: crypto.randomUUID(),
    ...normalizarCamposDeProducto(datos),
    origen: datos.origen || 'MANUAL',
    trabajoExtraccionId: datos.trabajoExtraccionId || null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
  return almacenDeProductos.insertar(producto);
}

async function listarProductos(filtros = {}) {
  const { category, brand, origen, trabajoExtraccionId } = filtros;
  const productos = await almacenDeProductos.todos();
  return productos.filter((producto) => {
    if (category && String(producto.category).toLowerCase() !== String(category).toLowerCase()) return false;
    if (brand && String(producto.brand).toLowerCase() !== String(brand).toLowerCase()) return false;
    if (origen && producto.origen !== origen) return false;
    if (trabajoExtraccionId && producto.trabajoExtraccionId !== trabajoExtraccionId) return false;
    return true;
  });
}

async function obtenerProductoPorId(id) {
  return almacenDeProductos.buscarPorId(id);
}

async function actualizarProducto(id, cambios) {
  return almacenDeProductos.actualizar(id, { ...cambios, actualizadoEn: new Date().toISOString() });
}

async function eliminarProducto(id) {
  return almacenDeProductos.eliminar(id);
}

async function guardarOActualizarProductoExtraido(datosExtraidos, trabajoExtraccionId) {
  const productosActuales = await almacenDeProductos.todos();
  const productoExistente = productosActuales.find(
    (producto) => producto.origen === 'AUTOMATION_EXERCISE' && producto.externalId === String(datosExtraidos.externalId)
  );

  if (productoExistente) {
    return actualizarProducto(productoExistente.id, {
      ...normalizarCamposDeProducto(datosExtraidos),
      trabajoExtraccionId,
    });
  }

  return crearProducto({
    ...datosExtraidos,
    origen: 'AUTOMATION_EXERCISE',
    trabajoExtraccionId,
  });
}

module.exports = {
  crearProducto,
  listarProductos,
  obtenerProductoPorId,
  actualizarProducto,
  eliminarProducto,
  guardarOActualizarProductoExtraido,
};
