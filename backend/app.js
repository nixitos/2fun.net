require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use(cors({
  origin: 'https://nixitos.github.io',  // или '*' для теста
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

const postsRoutes = require('./routes/posts')(pool);
const threadsRoutes = require('./routes/threads')(pool);
const authRoutes = require('./routes/auth')(pool);

app.use('/api', postsRoutes);
app.use('/api', threadsRoutes);
app.use('/api/auth', authRoutes);

app.listen(port, () => {
    console.log(`Сервер на ${port}`);
});
