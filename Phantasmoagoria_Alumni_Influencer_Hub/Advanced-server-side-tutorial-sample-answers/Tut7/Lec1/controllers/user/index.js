'use strict';


const userModel = require('../../models/userModel');

exports.before = async function (req, res, next) {
  const id = req.params.user_id;
  if (!id) return next();

  try {
    const userWithPets = await userModel.findUserWithPets(id);
    if (!userWithPets) return next('route');
    req.user = userWithPets;
    next();
  } catch (err) {
    next(err);
  }
};

exports.list = async function (req, res, next) {
  try {
    const users = await userModel.findAllUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

exports.edit = function (req, res) {
  res.json({ user: req.user });
};

exports.show = function (req, res) {
  res.json({ user: req.user });
};

exports.update = async function (req, res, next) {
  const body = req.body;

  try {
    await userModel.updateUserName(req.user.id, body.user.name);
    req.user.name = body.user.name;
    res.json({
      success: true,
      message: 'Information updated!',
      redirect: '/user/' + req.user.id,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
};

