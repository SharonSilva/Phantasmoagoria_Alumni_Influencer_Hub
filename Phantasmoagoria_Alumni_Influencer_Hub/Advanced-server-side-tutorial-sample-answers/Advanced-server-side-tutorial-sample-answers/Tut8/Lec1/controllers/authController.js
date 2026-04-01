const authModel = require('../models/authModel');
const bcrypt = require('bcrypt');

class AuthController {
    async login(email, password) {
        try {
            const user = await authModel.findUserByEmail(email);

            if (!user) {
                return null;
            }

            const isValidPassword = await bcrypt.compare(
                password,
                user.password
            );

            if (!isValidPassword) {
                return null;
            }

            delete user.password;
            return user;
        } catch (error) {
            throw new Error(`Login error: ${error.message}`);
        }
    }

    async register(userData) {
        try {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            return await authModel.createUser({
                ...userData,
                password: hashedPassword,
            });
        } catch (error) {
            throw new Error(`Registration error: ${error.message}`);
        }
    }
}

module.exports = new AuthController();
