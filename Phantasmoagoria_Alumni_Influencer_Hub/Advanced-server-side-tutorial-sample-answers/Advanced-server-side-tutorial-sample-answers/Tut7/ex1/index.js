'use strict';

const express = require('express');
const studentsController = require('./controllers/students');

const app = express();
const API_KEY = 'x'; // change if you want

// Parse JSON request bodies
app.use(express.json());

app.use((req, res, next) => {
  const key = req.header('x-api-key');
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
});

// Student REST API routes
app.get('/students', studentsController.list);
app.get('/students/:id', studentsController.getOne);
app.post('/students', studentsController.create);
app.put('/students/:id', studentsController.update);
app.patch('/students/:id', studentsController.patch);
app.delete('/students/:id', studentsController.destroy);

// Start server
app.listen(3000, () => {
  console.log('Student API listening on port 3000');
});
