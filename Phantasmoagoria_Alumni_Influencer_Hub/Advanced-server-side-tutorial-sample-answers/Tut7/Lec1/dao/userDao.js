 'use strict';

 const db = require('../db');

 async function findAllUsers() {
   const [rows] = await db.query('SELECT id, name FROM users');
   return rows;
 }

 async function findUserById(id) {
   const [rows] = await db.query('SELECT id, name FROM users WHERE id = ?', [id]);
   return rows[0] || null;
 }

 async function updateUserName(id, name) {
   await db.query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
 }

 async function findUserRowWithPets(id) {
   const [userRows] = await db.query('SELECT id, name FROM users WHERE id = ?', [id]);
   if (!userRows[0]) return { user: null, pets: [] };

   const [petRows] = await db.query('SELECT id, name FROM pets WHERE user_id = ?', [id]);
   return { user: userRows[0], pets: petRows };
 }

 module.exports = {
   findAllUsers,
   findUserById,
   updateUserName,
   findUserRowWithPets
 };

