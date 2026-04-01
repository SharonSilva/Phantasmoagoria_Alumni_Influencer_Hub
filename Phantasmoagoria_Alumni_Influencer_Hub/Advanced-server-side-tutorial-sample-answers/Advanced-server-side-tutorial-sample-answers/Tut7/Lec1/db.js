'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',          // change to your MySQL user
  password: '',          // change to your MySQL password
  database: 'week9', // change to your DB name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

