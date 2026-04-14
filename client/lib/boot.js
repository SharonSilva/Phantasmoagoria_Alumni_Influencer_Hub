'use strict'

/**
 * Auto-load controllers and generate routes
 * Scans /controllers directory and creates routes based on exported methods
 */

const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function(parent, options) {
  const dir = path.join(__dirname, '..', 'controllers');
  const verbose = options.verbose;

  fs.readdirSync(dir).forEach(function(name) {
    const file = path.join(dir, name);
    if (!fs.statSync(file).isDirectory()) return;

    verbose && console.log('\n   %s:', name);

    const obj = require(file);
    const controllerName = obj.name || name;
    const prefix = obj.prefix || '';
    const app = express();
    let handler;
    let method;
    let url;

    // Set view engine if specified
    if (obj.engine) app.set('view engine', obj.engine);
    app.set('views', path.join(__dirname, '..', 'controllers', controllerName, 'views'));

    // Generate routes based on exported methods
    for (let key in obj) {
      // Skip reserved exports
      if (~['name', 'prefix', 'engine', 'before'].indexOf(key)) continue;

      // Map method names to HTTP methods and URLs
      switch (key) {
        case 'show':
          method = 'get';
          url = '/' + controllerName + '/:' + controllerName + '_id';
          break;
        case 'list':
          method = 'get';
          url = '/' + controllerName + 's';
          break;
        case 'edit':
          method = 'get';
          url = '/' + controllerName + '/:' + controllerName + '_id/edit';
          break;
        case 'update':
          method = 'put';
          url = '/' + controllerName + '/:' + controllerName + '_id';
          break;
        case 'create':
          method = 'post';
          url = '/' + controllerName;
          break;
        case 'index':
          method = 'get';
          url = '/';
          break;
        case 'destroy':
        case 'remove':
        case 'delete':
          method = 'delete';
          url = '/' + controllerName + '/:' + controllerName + '_id';
          break;
        default:
          // Custom actions: GET /<controller>/<action>
          method = 'get';
          url = '/' + controllerName + '/' + key;
          break;
      }

      handler = obj[key];
      url = prefix + url;

      // Setup route with optional before middleware
      if (obj.before) {
        app[method](url, obj.before, handler);
        verbose && console.log('     %s %s -> before -> %s', method.toUpperCase(), url, key);
      } else {
        app[method](url, handler);
        verbose && console.log('     %s %s -> %s', method.toUpperCase(), url, key);
      }
    }

    // Mount controller app
    parent.use(app);
  });
};