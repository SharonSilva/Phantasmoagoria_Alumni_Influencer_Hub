'use strict';

/**
 * Module dependencies.
 */

const userModel = require('../../models/userModel');
const petModel = require('../../models/petModel');

exports.name = 'pet';
exports.prefix = '/user/:user_id';

exports.create = async function (req, res, next) {
  const id = req.params.user_id;
  const body = req.body;

  try {
    const user = await userModel.findUserById(id);
    if (!user) return next('route');

    const pet = await petModel.createPet(id, body.pet.name);

    res.json({
      success: true,
      message: 'Added pet ' + body.pet.name,
      redirect: '/user/' + id,
      pet
    });
  } catch (err) {
    next(err);
  }
};

