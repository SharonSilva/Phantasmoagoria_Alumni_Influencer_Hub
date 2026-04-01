'use strict';

 const petDao = require('../dao/petDao');

 async function findAllPets() {
   return petDao.findAllPets();
 }

 async function findPetById(id) {
   return petDao.findPetById(id);
 }

 async function updatePetName(id, name) {
   return petDao.updatePetName(id, name);
 }

 async function createPet(userId, name) {
   return petDao.createPet(userId, name);
 }

 module.exports = {
   findAllPets,
   findPetById,
   updatePetName,
   createPet
 };


