const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // получить комменты поста (если нужны)
    router.get('/post/:id/comments', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM posts WHERE parent_post_id = $1 ORDER BY created_at',
                [req.params.id]
            );
            res.json(result.rows);
        } catch(err) {
            res.status(500).json({error: err.message});
        }
    });

    // создать коммент к посту
    router.post('/post/:id/comment', async (req, res) => {
        try {
            const { content, guest_name } = req.body;
            await pool.query(
                'INSERT INTO posts (thread_id, parent_post_id, guest_name, content) VALUES ($1, $2, $3, $4)',
                [req.body.thread_id, req.params.id, guest_name || 'Аноним', content]
            );
            res.json({success: true});
        } catch(err) {
            res.status(500).json({error: err.message});
        }
    });

    return router;
};