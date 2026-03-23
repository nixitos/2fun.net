const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // получить треды доски
    router.get('/boards/:board/threads', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT t.*, 
                       (SELECT count(*) FROM posts WHERE thread_id = t.id) as reply_count,
                       (SELECT content FROM posts WHERE thread_id = t.id ORDER BY created_at LIMIT 1) as op_content
                FROM threads t
                JOIN boards b ON t.board_id = b.id
                WHERE b.name = $1
                ORDER BY t.bump_time DESC
            `, [req.params.board]);
            res.json(result.rows);
        } catch(err) {
            res.status(500).json({error: err.message});
        }
    });

    router.post('/boards/:board/thread', async (req, res) => {
        try {
            console.log('📝 Попытка создать тред в доске:', req.params.board);
            console.log('📦 Тело запроса:', req.body);
            
            const { title, content, guest_name } = req.body;
            const boardRes = await pool.query('SELECT id FROM boards WHERE name = $1', [req.params.board]);
            
            console.log('📋 ID доски:', boardRes.rows[0]?.id);
            
            await pool.query('BEGIN');
            const threadRes = await pool.query(
                'INSERT INTO threads (board_id, title) VALUES ($1, $2) RETURNING id',
                [boardRes.rows[0].id, title || 'Без темы']
            );
            await pool.query(
                'INSERT INTO posts (thread_id, guest_name, content) VALUES ($1, $2, $3)',
                [threadRes.rows[0].id, guest_name || 'Аноним', content]
            );
            await pool.query('COMMIT');
            
            console.log('✅ Тред создан, ID:', threadRes.rows[0].id);
            res.json({thread_id: threadRes.rows[0].id});
        } catch(err) {
            await pool.query('ROLLBACK');
            console.error('❌ Ошибка создания треда:', err);
            res.status(500).json({error: err.message});
        }
    });

    // получить посты треда
    router.get('/thread/:id/posts', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at',
                [req.params.id]
            );
            res.json(result.rows);
        } catch(err) {
            res.status(500).json({error: err.message});
        }
    });

    // создать пост в треде
    router.post('/thread/:id/post', async (req, res) => {
        try {
            await pool.query(
                'INSERT INTO posts (thread_id, guest_name, content) VALUES ($1, $2, $3)',
                [req.params.id, req.body.guest_name || 'Аноним', req.body.content]
            );
            await pool.query('UPDATE threads SET bump_time = NOW() WHERE id = $1', [req.params.id]);
            res.json({success: true});
        } catch(err) {
            res.status(500).json({error: err.message});
        }
    });

    return router;
};
