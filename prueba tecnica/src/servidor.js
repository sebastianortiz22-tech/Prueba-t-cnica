const http = require('http');
const { manejarSolicitudHTTP } = require('./app');
const configuracionApp = require('./config/configuracionApp');

const servidorHTTP = http.createServer(manejarSolicitudHTTP);

servidorHTTP.listen(configuracionApp.puerto, () => {
  console.log(`Servicio de catálogo y extracción escuchando en http://localhost:${configuracionApp.puerto}`);
  console.log(`Máximo de extracciones simultáneas contra Automation Exercise: ${configuracionApp.maxExtraccionesSimultaneas}`);
});

module.exports = servidorHTTP;
