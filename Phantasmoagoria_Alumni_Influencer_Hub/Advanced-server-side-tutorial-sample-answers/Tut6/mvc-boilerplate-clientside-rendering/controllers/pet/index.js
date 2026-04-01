'use strict'

/**
 * Module dependencies.
 */

var db = require('../../db');

exports.before = function(req, res, next){
  var pet = db.pets[req.params.pet_id];
  if (!pet) return next('route');
  req.pet = pet;
  next();
};

exports.list = function(req, res){
  res.json({ pets: db.pets });
};

exports.show = function(req, res){
  res.json({ pet: req.pet });
};

exports.edit = function(req, res){
  res.json({ pet: req.pet });
};

exports.update = function(req, res){
  var body = req.body;
  req.pet.name = body.pet.name;
  res.json({ success: true, message: 'Information updated!', redirect: '/pet/' + req.pet.id, pet: req.pet });
};
