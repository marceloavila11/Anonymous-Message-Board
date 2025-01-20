'use strict';
const mongoose = require('mongoose');

// Conexión a Mongo (sin useNewUrlParser / useUnifiedTopology en Mongoose 7+)
mongoose.connect(process.env.DB)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Esquema de reply
const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  created_on: Date,
  delete_password: String,
  reported: Boolean
});

// Esquema de thread
const threadSchema = new mongoose.Schema({
  board: String,
  text: { type: String, required: true },
  created_on: Date,
  bumped_on: Date,
  reported: Boolean,
  delete_password: String,
  replies: [replySchema]
});

const Thread = mongoose.model('Thread', threadSchema);

module.exports = function (app) {
  
  // =================================
  //  /api/threads/:board
  // =================================
  app.route('/api/threads/:board')

    // POST -> Crear thread
    .post(async (req, res) => {
      try {
        const board = req.params.board;
        const { text, delete_password } = req.body;
        
        const newThread = new Thread({
          board: board,
          text: text,
          created_on: new Date(),
          bumped_on: new Date(),
          reported: false,
          delete_password: delete_password,
          replies: []
        });
        
        await newThread.save();
        // Redirigir a la ruta /b/:board para ver el hilo en el frontend
        return res.redirect(`/b/${board}/`);
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // GET -> Ver los 10 hilos más recientes (cada uno con 3 replies recientes)
    .get(async (req, res) => {
      try {
        const board = req.params.board;
        
        let threads = await Thread.find(
          { board: board },
          {
            delete_password: 0,
            reported: 0,
            'replies.delete_password': 0,
            'replies.reported': 0
          }
        )
        .sort({ bumped_on: -1 })
        .limit(10)
        .lean();

        // Solo mostrar las 3 replies más recientes
        threads = threads.map(thread => {
          const replyCount = thread.replies.length;
          const replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on)
            .slice(0, 3);

          return {
            _id: thread._id,
            text: thread.text,
            created_on: thread.created_on,
            bumped_on: thread.bumped_on,
            replies: replies,
            replycount: replyCount
          };
        });
        
        return res.json(threads);
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // DELETE -> Borrar thread
    .delete(async (req, res) => {
      try {
        const { thread_id, delete_password } = req.body;
        
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('no thread found');
        }
        if (thread.delete_password !== delete_password) {
          return res.send('incorrect password');
        }

        await Thread.findByIdAndDelete(thread_id);
        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // PUT -> Reportar thread
    .put(async (req, res) => {
      try {
        const { thread_id } = req.body;
        
        await Thread.findByIdAndUpdate(thread_id, { reported: true });
        // FCC pide que respondamos con "reported"
        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    });


  // =================================
  //  /api/replies/:board
  // =================================
  app.route('/api/replies/:board')

    // POST -> Crear nueva respuesta
    .post(async (req, res) => {
      try {
        const board = req.params.board;
        const { thread_id, text, delete_password } = req.body;
        
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('no thread found');
        }
        
        const newReply = {
          text: text,
          created_on: new Date(),
          delete_password: delete_password,
          reported: false
        };
        
        thread.replies.push(newReply);
        thread.bumped_on = new Date();
        
        await thread.save();
        
        // Redirigir a la vista del thread
        return res.redirect(`/b/${board}/${thread_id}`);
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // GET -> Ver un hilo con todas sus respuestas
    .get(async (req, res) => {
      try {
        const board = req.params.board; // Se podría usar si quieres filtrar, en general no es forzoso
        const thread_id = req.query.thread_id;
        
        const thread = await Thread.findById(
          thread_id,
          {
            delete_password: 0,
            reported: 0,
            'replies.delete_password': 0,
            'replies.reported': 0
          }
        ).lean();
        
        if (!thread) {
          return res.send('no thread found');
        }
        
        return res.json(thread);
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // DELETE -> Borrar una respuesta
    .delete(async (req, res) => {
      try {
        const { thread_id, reply_id, delete_password } = req.body;
        
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('no thread found');
        }
        
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.send('no reply found');
        }
        
        if (reply.delete_password !== delete_password) {
          return res.send('incorrect password');
        }
        
        // Cambiar el texto a [deleted] en lugar de eliminar físicamente
        reply.text = '[deleted]';
        await thread.save();
        
        return res.send('success');
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    })

    // PUT -> Reportar una respuesta
    .put(async (req, res) => {
      try {
        const { thread_id, reply_id } = req.body;
        
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('no thread found');
        }
        
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.send('no reply found');
        }
        
        reply.reported = true;
        await thread.save();
        
        // FCC pide que sea "reported"
        return res.send('reported');
      } catch (err) {
        console.error(err);
        return res.send('error');
      }
    });
};
