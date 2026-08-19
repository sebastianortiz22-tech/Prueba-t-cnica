const fs = require('fs');
const path = require('path');

function cargarVariablesDeEntornoDesdeArchivo() {
  const rutaEnv = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(rutaEnv)) return;

  const contenido = fs.readFileSync(rutaEnv, 'utf-8');
  contenido.split('\n').forEach((linea) => {
    const lineaLimpia = linea.trim();
    if (!lineaLimpia || lineaLimpia.startsWith('#')) return;

    const indiceIgual = lineaLimpia.indexOf('=');
    if (indiceIgual === -1) return;

    const clave = lineaLimpia.slice(0, indiceIgual).trim();
    const valor = lineaLimpia.slice(indiceIgual + 1).trim();
    if (!(clave in process.env)) process.env[clave] = valor;
  });
}

cargarVariablesDeEntornoDesdeArchivo();

const configuracionApp = {
  puerto: Number(process.env.PORT) || 3000,

  maxExtraccionesSimultaneas: Number(process.env.MAX_EXTRACCIONES_SIMULTANEAS) || 3,
  
  intentosMaximosScraping: Number(process.env.INTENTOS_MAXIMOS_SCRAPING) || 2,

  timeoutScrapingMs: Number(process.env.TIMEOUT_SCRAPING_MS) || 8000,

  urlBaseAutomationExercise:
    process.env.AUTOMATION_EXERCISE_BASE_URL || 'https://automationexercise.com',

  carpetaDatos: path.join(__dirname, '..', 'datos'),
};

module.exports = configuracionApp;
