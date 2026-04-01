 'use strict';

 const express = require('express');
 const mainController = require('../controllers/main');
 const userController = require('../controllers/user');
 const petController = require('../controllers/pet');
 const userPetController = require('../controllers/user-pet');

 const router = express.Router();

 // main
 router.get('/', mainController.index);

 // users
 router.get('/users', userController.list);
 router.get('/user/:user_id', userController.before, userController.show);
 router.get('/user/:user_id/edit', userController.before, userController.edit);
 router.put('/user/:user_id', userController.before, userController.update);

 // pets
 router.get('/pets', petController.list);
 router.get('/pet/:pet_id', petController.before, petController.show);
 router.get('/pet/:pet_id/edit', petController.before, petController.edit);
 router.put('/pet/:pet_id', petController.before, petController.update);

 // user-pet
 router.post('/user/:user_id/pet', userPetController.create);

 module.exports = router;

