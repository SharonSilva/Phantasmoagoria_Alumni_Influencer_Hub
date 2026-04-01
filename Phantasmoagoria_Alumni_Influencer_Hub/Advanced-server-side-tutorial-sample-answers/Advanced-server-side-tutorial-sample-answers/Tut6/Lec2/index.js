'use strict';

var express = require('express');
var app = express();

// IN-MEMORY "DATABASE" 
var items = [
  { id: 1, name: 'Indrajith', done: false },
  { id: 2, name: 'Kamal', done: false },
];
var nextId = 3;

// MIDDLEWARE
// Middleware runs in order for every request (unless a previous middleware sends a response and does not call next()).

// Parse JSON request bodies 
app.use(express.json());

// Parse URL-encoded bodies (e.g. form submissions with Content-Type: application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// Logs the HTTP method and URL for every request. Always calls next() so the request
// continues to the next middleware or route handler.
app.use(function (req, res, next) {
  console.log('%s %s', req.method, req.originalUrl);
  next();
});

// ROUTES
// Routes are matched in order. The first matching route handles the request.

// ----- GET / -----
app.get('/', function (req, res) {
  res.json({
    message: 'Welcome to the Items API',
    endpoints: {
      'GET /items': 'List all items',
      'GET /items/:id': 'Get one item by id',
      'POST /items': 'Create an item (body: { name, done? })',
      'PUT /items/:id': 'Update an item (body: { name?, done? })',
      'DELETE /items/:id': 'Delete an item',
    },
  });
});

// ----- GET /items -----
app.get('/items', function (req, res) {
  res.json({ items: items });
});

// ----- GET /items/:id -----
// Use route parameter :id (available as req.params.id).
app.get('/items/:id', function (req, res, next) {
  var id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return next(new Error('Invalid id: must be a number'));
  }
  var item = items.find(function (i) {
    return i.id === id;
  });
  if (!item) {
    var err = new Error('Item not found');
    err.status = 404;
    return next(err);
  }
  res.json({ item: item });
});

// ----- POST /items -----
// Expects JSON body: { name: string, done?: boolean }.
app.post('/items', function (req, res, next) {
  try {
    var name = req.body && req.body.name;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      var badRequest = new Error('Bad request: name is required and must be a non-empty string');
      badRequest.status = 400;
      return next(badRequest);
    }
    var done = Boolean(req.body && req.body.done);
    var item = {
      id: nextId++,
      name: name.trim(),
      done: done,
    };
    items.push(item);
    res.status(201).json({ message: 'Item created', item: item });
  } catch (err) {
    next(err);
  }
});

// ----- PUT /items/:id -----
// Body can include { name?, done? }.
app.put('/items/:id', function (req, res, next) {
  try {
    var id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      var invalidId = new Error('Invalid id: must be a number');
      invalidId.status = 400;
      return next(invalidId);
    }
    var item = items.find(function (i) {
      return i.id === id;
    });
    if (!item) {
      var notFound = new Error('Item not found');
      notFound.status = 404;
      return next(notFound);
    }
    if (req.body.name !== undefined) {
      var name = req.body.name;
      if (typeof name !== 'string' || name.trim() === '') {
        var badName = new Error('Bad request: name must be a non-empty string');
        badName.status = 400;
        return next(badName);
      }
      item.name = name.trim();
    }
    if (req.body.done !== undefined) {
      item.done = Boolean(req.body.done);
    }
    res.json({ message: 'Item updated', item: item });
  } catch (err) {
    next(err);
  }
});

// ----- DELETE /items/:id -----
app.delete('/items/:id', function (req, res, next) {
  try {
    var id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      var invalidId = new Error('Invalid id: must be a number');
      invalidId.status = 400;
      return next(invalidId);
    }
    var index = items.findIndex(function (i) {
      return i.id === id;
    });
    if (index === -1) {
      var notFound = new Error('Item not found');
      notFound.status = 404;
      return next(notFound);
    }
    var removed = items.splice(index, 1)[0];
    res.json({ message: 'Item deleted', item: removed });
  } catch (err) {
    next(err);
  }
});

// ERROR-HANDLING MIDDLEWARE
app.use(function (err, req, res, next) {
  // Log the error for debugging
  console.error(err.message || err);
});


// START THE SERVER
var port = process.env.PORT || 5000;
app.listen(port, function () {
  console.log('Server is running on http://localhost:' + port);
});
