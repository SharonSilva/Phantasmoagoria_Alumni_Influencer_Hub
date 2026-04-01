const db = require('../config/database');

class AuthModel {
    async findUserByEmail(email) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0];
        } catch (error) {
            throw new Error(`Database error: ${error.message}`);
        }
    }

    async createUser(userData) {
        try {
            const { email, password, name } = userData;
            const [result] = await db.execute(
                'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
                [email, password, name]
            );
            return result.insertId;
        } catch (error) {
            throw new Error(`Database error: ${error.message}`);
        }
    }
}

module.exports = new AuthModel();
