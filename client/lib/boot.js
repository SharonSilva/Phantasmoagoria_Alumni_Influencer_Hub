'use strict'

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

    for (let key in obj) {
      if (~['name', 'prefix', 'engine', 'before'].indexOf(key)) continue;

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

        // Auth actions
        case 'login':
          method = 'post';
          url = '/' + controllerName + '/login';
          break;
        case 'register':
          method = 'post';
          url = '/' + controllerName + '/register';
          break;
        case 'forgotPassword':
          method = 'post';
          url = '/' + controllerName + '/forgotPassword';
          break;
        case 'resetPassword':
          method = 'post';
          url = '/' + controllerName + '/resetPassword';
          break;
        case 'verify':
          method = 'get';
          url = '/' + controllerName + '/verify';
          break;
        case 'logout':
          method = 'post';
          url = '/' + controllerName + '/logout';
          break;
        case 'check':
          method = 'get';
          url = '/' + controllerName + '/check';
          break;

        // Dashboard sub-routes
        case 'api':
          method = 'get';
          url = '/' + controllerName + '/api';
          break;
        case 'alumniStats':
          method = 'get';
          url = '/' + controllerName + '/alumniStats';
          break;
        case 'biddingAnalytics':
          method = 'get';
          url = '/' + controllerName + '/biddingAnalytics';
          break;

        // API keys usage
        case 'usage':
          method = 'get';
          url = '/' + controllerName + '/usage';
          break;
        case 'tomorrow':
        case 'status':
        case 'monthly':
        case 'history':
        case 'endpointStats':
          method = 'get';
          url = '/' + controllerName + '/' + key;
          break;

        default:
          method = 'get';
          url = '/' + controllerName + '/' + key;
          break;
      }

      handler = obj[key];
      url = prefix + url;

      if (obj.before) {
        app[method](url, obj.before, handler);
        verbose && console.log('     %s %s -> before -> %s', method.toUpperCase(), url, key);
      } else {
        app[method](url, handler);
        verbose && console.log('     %s %s -> %s', method.toUpperCase(), url, key);
      }
    }

    parent.use(app);
  });
};