'use strict';

/**
 * Module dependencies.
 */

const petModel = require('../../models/petModel');

exports.before = async function (req, res, next) {
  const petId = req.params.pet_id;

  // If there is no pet_id in the route (e.g. GET /pets), skip lookup
  if (!petId) return next();

  try {
    const pet = await petModel.findPetById(petId);
    if (!pet) return next('route');
    req.pet = pet;
    next();
  } catch (err) {
    next(err);
  }
};

exports.list = async function (req, res, next) {
  try {
    const pets = await petModel.findAllPets();
    res.json({ pets });
  } catch (err) {
    next(err);
  }
};

exports.show = function (req, res) {
  res.json({ pet: req.pet });
};

exports.edit = function (req, res) {
  res.json({ pet: req.pet });
};

exports.update = async function (req, res, next) {
  const body = req.body;

  try {
    await petModel.updatePetName(req.pet.id, body.pet.name);
    req.pet.name = body.pet.name;
    res.json({
      success: true,
      message: 'Information updated!',
      redirect: '/pet/' + req.pet.id,
      pet: req.pet
    });
  } catch (err) {
    next(err);
  }
};

