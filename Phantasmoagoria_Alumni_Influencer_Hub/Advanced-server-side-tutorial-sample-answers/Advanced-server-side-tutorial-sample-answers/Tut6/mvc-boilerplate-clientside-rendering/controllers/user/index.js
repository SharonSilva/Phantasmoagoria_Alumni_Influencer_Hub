'use strict'

/**
 * Module dependencies.
 */

var db = require('../../db');

exports.before = function(req, res, next){
  var id = req.params.user_id;
  if (!id) return next();
  process.nextTick(function(){
    req.user = db.users[id];
    if (!req.user) return next('route');
    next();
  });
};

exports.list = function(req, res){
  res.json({ users: db.users });
};

exports.edit = function(req, res){
  res.json({ user: req.user });
};

exports.show = function(req, res){
  res.json({ user: req.user });
};

exports.update = function(req, res){
  var body = req.body;
  req.user.name = body.user.name;
  res.json({ success: true, message: 'Information updated!', redirect: '/user/' + req.user.id, user: req.user });
};
