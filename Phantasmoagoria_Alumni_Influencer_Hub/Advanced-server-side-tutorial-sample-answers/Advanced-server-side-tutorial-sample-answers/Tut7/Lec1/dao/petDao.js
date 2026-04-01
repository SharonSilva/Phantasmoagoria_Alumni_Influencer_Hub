 'use strict';

 const db = require('../db');

 async function findAllPets() {
   const [rows] = await db.query('SELECT id, name, user_id FROM pets');
   return rows;
 }

 async function findPetById(id) {
   const [rows] = await db.query('SELECT id, name, user_id FROM pets WHERE id = ?', [id]);
   return rows[0] || null;
 }

 async function updatePetName(id, name) {
   await db.query('UPDATE pets SET name = ? WHERE id = ?', [name, id]);
 }

 async function createPet(userId, name) {
   const [result] = await db.query(
     'INSERT INTO pets (name, user_id) VALUES (?, ?)',
     [name, userId]
   );
   return { id: result.insertId, name, user_id: userId };
 }

 module.exports = {
   findAllPets,
   findPetById,
   updatePetName,
   createPet
 };

