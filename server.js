'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet      = require('helmet');

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner') || require('./test-runner'); 
// Ojo: ajusta la ruta si tu test-runner está en otra ubicación

const app = express();

// Configuración de Helmet para mejorar la seguridad
app.use(helmet());

// Servir archivos estáticos
app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // Para permitir testing en freeCodeCamp

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas de vistas
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });

app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

// Página de inicio
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// Rutas de testing de freeCodeCamp
fccTestingRoutes(app);

// Rutas de la API
apiRoutes(app);

// Middleware 404
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Inicio del servidor
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  // Correr los tests si estamos en modo test
  if(process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app;
