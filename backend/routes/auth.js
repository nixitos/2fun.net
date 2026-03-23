const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

module.exports = (pool) => {
    // регистрация
    router.post('/register', async (req, res) => {
        try {
            const { username, password } = req.body;
            const hash = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
                [username, hash]
            );
            res.json({success: true});
        } catch(err) {
            res.status(400).json({error: 'Такой ник уже есть'});
        }
    });

    // вход (простой, без jwt пока)
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            
            if(user.rows.length === 0) throw new Error();
            
            const match = await bcrypt.compare(password, user.rows[0].password_hash);
            if(!match) throw new Error();
            
            // в реальном проекте тут выдавать jwt или сессию
            res.json({success: true, user: {id: user.rows[0].id, username: user.rows[0].username}});
        } catch(err) {
            res.status(401).json({error: 'Логин/пароль неверны'});
        }
    });

    return router;
};