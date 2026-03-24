require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// CORS открыт для всех
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Подключение к БД
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err.message);
        process.exit(1); // Если БД не доступна — не запускаем сервер
    } else {
        console.log('✅ Подключение к БД успешно');
        release();
    }
});

// Инициализация таблиц
const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS boards (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE,
                description TEXT
            );
            
            CREATE TABLE IF NOT EXISTS threads (
                id SERIAL PRIMARY KEY,
                board_id INTEGER REFERENCES boards(id),
                title VARCHAR(200),
                created_at TIMESTAMP DEFAULT NOW(),
                bump_time TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                thread_id INTEGER REFERENCES threads(id),
                guest_name VARCHAR(50),
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            INSERT INTO boards (name, description) VALUES 
                ('b', 'Общий срач'),
                ('pol', 'Политика'),
                ('tech', 'Техно')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ База инициализирована');
    } catch(err) {
        console.error('❌ Ошибка инициализации БД:', err.message);
        throw err;
    }
};

// Роуты
const postsRoutes = require('./routes/posts')(pool);
const threadsRoutes = require('./routes/threads')(pool);

app.use('/api', postsRoutes);
app.use('/api', threadsRoutes);

// Простой ping для проверки
app.get('/ping', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Запуск
const start = async () => {
    try {
        await initDb();
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Сервер запущен на порту ${port}`);
        });
    } catch (err) {
        console.error('❌ Фатальная ошибка при запуске:', err.message);
        process.exit(1);
    }
};

start();
