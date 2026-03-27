require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

let isCleaning = false;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const cleanupOldThreads = async () => {
    if (isCleaning) return;
    isCleaning = true;
    
    try {
        await pool.query(`
            DELETE FROM threads 
            WHERE id IN (
                SELECT t.id 
                FROM threads t
                LEFT JOIN posts p ON t.id = p.thread_id
                GROUP BY t.id
                HAVING COUNT(p.id) > 800
            )
        `);
        
        await pool.query(`
            DELETE FROM threads 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, 
                           ROW_NUMBER() OVER (PARTITION BY board_id ORDER BY bump_time DESC) as rn
                    FROM threads
                ) t
                WHERE rn > 500
            )
        `);
        
        console.log('Очистка старых тредов выполнена');
    } catch(err) {
        console.error('Ошибка очистки:', err.message);
    } finally {
        isCleaning = false;
    }
};

app.use(cors({
    origin: ['https://nixitos.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const rateLimit = require('express-rate-limit');

// лимит 30 запросов в минуту с одного IP чтобы мне к херам серваки не снесли
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Слишком много запросов. Подожди минуту.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return false;
    }
});

app.use('/api', limiter);

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
    }
};

const postsRoutes = require('./routes/posts')(pool);
const threadsRoutes = require('./routes/threads')(pool);

app.use('/api', postsRoutes);
app.use('/api', threadsRoutes);

app.get('/ping', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

initDb().then(async () => {
    await cleanupOldThreads();
    
    setInterval(cleanupOldThreads, 6 * 60 * 60 * 1000);
    
    app.listen(port, () => {
        console.log(`🚀 Сервер на ${port}`);
    });
});
