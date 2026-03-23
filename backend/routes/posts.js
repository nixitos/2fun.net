const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // Получить комментарии к посту (если понадобится вложенность)
    router.get('/post/:id/comments', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM posts WHERE parent_post_id = $1 ORDER BY created_at',
                [req.params.id]
            );
            res.json(result.rows);
        } catch(err) {
            console.error('GET /post/:id/comments error:', err);
            res.status(500).json({error: err.message});
        }
    });

    return router;
};
