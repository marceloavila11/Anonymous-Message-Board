const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  
  let testThreadId; 
  let testReplyId;  

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('Crear un nuevo thread', function(done) {
        chai.request(server)
          .post('/api/threads/test')
          .send({
            text: 'Thread de prueba',
            delete_password: 'pass123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function() {
      test('Ver los 10 threads más recientes con 3 replies cada uno', function(done) {
        chai.request(server)
          .get('/api/threads/test')
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isAtMost(res.body.length, 10);
            if (res.body.length > 0) {
              testThreadId = res.body[0]._id; // guardamos un id
            }
            done();
          });
      });
    });

    suite('PUT', function() {
      test('Reportar un thread', function(done) {
        chai.request(server)
          .put('/api/threads/test')
          .send({
            thread_id: testThreadId
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });

    suite('DELETE', function() {
      test('Borrar thread con contraseña incorrecta', function(done) {
        chai.request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: testThreadId,
            delete_password: 'contraseña equivocada'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
      test('Borrar thread con contraseña correcta', function(done) {
        chai.request(server)
          .delete('/api/threads/test')
          .send({
            thread_id: testThreadId,
            delete_password: 'pass123'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            // Debe decir 'success' si todo va bien
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    // Para probar replies, primero creamos un thread nuevo
    let tempThreadId;

    suite('POST - crear thread previo', function() {
      test('Crear otro thread para pruebas de replies', function(done){
        chai.request(server)
          .post('/api/threads/test')
          .send({ text: 'Thread para replies', delete_password: 'abc123' })
          .end((err, res) => {
            assert.equal(res.status, 200);
            done();
          });
      });
      test('Obtener threads para quedarnos con el ID', function(done){
        chai.request(server)
          .get('/api/threads/test')
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            // Asumimos que el primer item es el que acabamos de crear
            tempThreadId = res.body[0]._id;
            done();
          });
      });
    });

    suite('POST', function() {
      test('Crear nueva respuesta en un thread', function(done) {
        chai.request(server)
          .post('/api/replies/test')
          .send({
            thread_id: tempThreadId,
            text: 'Respuesta de prueba',
            delete_password: 'replyPass'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            done();
          });
      });
    });

    suite('GET', function() {
      test('Ver un thread con todas sus respuestas', function(done) {
        chai.request(server)
          .get('/api/replies/test')
          .query({ thread_id: tempThreadId })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.isObject(res.body);
            assert.property(res.body, 'replies');
            assert.isArray(res.body.replies);
            if(res.body.replies.length > 0) {
              testReplyId = res.body.replies[0]._id;
            }
            done();
          });
      });
    });

    suite('PUT', function() {
      test('Reportar una respuesta', function(done) {
        chai.request(server)
          .put('/api/replies/test')
          .send({
            thread_id: tempThreadId,
            reply_id: testReplyId
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });

    suite('DELETE', function() {
      test('Borrar respuesta con contraseña incorrecta', function(done) {
        chai.request(server)
          .delete('/api/replies/test')
          .send({
            thread_id: tempThreadId,
            reply_id: testReplyId,
            delete_password: 'invalidPass'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
      test('Borrar respuesta con contraseña correcta', function(done) {
        chai.request(server)
          .delete('/api/replies/test')
          .send({
            thread_id: tempThreadId,
            reply_id: testReplyId,
            delete_password: 'replyPass'
          })
          .end((err, res) => {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
  });
});
