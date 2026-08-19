const { SolicitudInvalidaError } = require('../compartido/erroresPersonalizados');

function validarCuerpoDeCreacion(cuerpo) {
  const errores = [];

  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    errores.push('El cuerpo de la petición debe ser un objeto JSON');
  }
  if (!cuerpo?.name || typeof cuerpo.name !== 'string' || !cuerpo.name.trim()) {
    errores.push('El campo "name" es obligatorio y debe ser un texto no vacío');
  }
  if (cuerpo?.price !== undefined && typeof cuerpo.price !== 'number') {
    errores.push('El campo "price" debe ser numérico');
  }

  if (errores.length > 0) {
    throw new SolicitudInvalidaError('Datos de producto inválidos', errores);
  }
}

function validarCuerpoDeActualizacion(cuerpo) {
  const errores = [];

  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    errores.push('El cuerpo de la petición debe ser un objeto JSON');
  } else if (Object.keys(cuerpo).length === 0) {
    errores.push('Debe enviar al menos un campo para actualizar');
  }
  if (cuerpo?.price !== undefined && typeof cuerpo.price !== 'number') {
    errores.push('El campo "price" debe ser numérico');
  }

  if (errores.length > 0) {
    throw new SolicitudInvalidaError('Datos de actualización inválidos', errores);
  }
}

module.exports = { validarCuerpoDeCreacion, validarCuerpoDeActualizacion };
