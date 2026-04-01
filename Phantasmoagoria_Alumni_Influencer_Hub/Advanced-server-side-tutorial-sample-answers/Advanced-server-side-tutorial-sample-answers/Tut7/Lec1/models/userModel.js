'use strict';

 const userDao = require('../dao/userDao');

 async function findAllUsers() {
   return userDao.findAllUsers();
 }

 async function findUserById(id) {
   return userDao.findUserById(id);
 }

 async function updateUserName(id, name) {
   return userDao.updateUserName(id, name);
 }

 async function findUserWithPets(id) {
   const { user, pets } = await userDao.findUserRowWithPets(id);
   if (!user) return null;

   return {
     id: user.id,
     name: user.name,
     pets
   };
 }

 module.exports = {
   findAllUsers,
   findUserById,
   updateUserName,
   findUserWithPets
 };


