const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (pool) => {
    // Регистрация
    router.post('/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({error: 'Логин и пароль обязательны'});
            }
            
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
                [username, hash]
            );
            res.json({success: true, message: 'Пользователь создан'});
        } catch(err) {
            if (err.code === '23505') {
                res.status(400).json({error: 'Такой ник уже существует'});
            } else {
                console.error('POST /register error:', err);
                res.status(500).json({error: err.message});
            }
        }
    });

    // Вход
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            if (user.rows.length === 0) {
                return res.status(401).json({error: 'Неверный логин или пароль'});
            }
            
            const match = await bcrypt.compare(password, user.rows[0].password_hash);
            if (!match) {
                return res.status(401).json({error: 'Неверный логин или пароль'});
            }
            
            res.json({
                success: true,
                user: {
                    id: user.rows[0].id,
                    username: user.rows[0].username,
                    is_admin: user.rows[0].is_admin
                }
            });
        } catch(err) {
            console.error('POST /login error:', err);
            res.status(500).json({error: err.message});
        }
    });

    return router;
};
