const express = require('express');
const router = express.Router();

const cooldown = new Map();

function checkCooldown(ip, action, seconds) {
    const key = `${ip}:${action}`;
    const last = cooldown.get(key);
    const now = Date.now();
    
    if (last && (now - last) < seconds * 1000) {
        const remaining = Math.ceil((seconds * 1000 - (now - last)) / 1000);
        return { allowed: false, remaining };
    }
    
    cooldown.set(key, now);
    setTimeout(() => cooldown.delete(key), seconds * 1000);
    return { allowed: true };
}

module.exports = (pool) => {
    router.get('/boards/:board/thread', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT t.*, 
                       (SELECT count(*) - 1 FROM posts WHERE thread_id = t.id) as reply_count,
                       (SELECT content FROM posts WHERE thread_id = t.id ORDER BY created_at LIMIT 1) as op_content,
                       (SELECT guest_name FROM posts WHERE thread_id = t.id ORDER BY created_at LIMIT 1) as op_name
                FROM threads t
                JOIN boards b ON t.board_id = b.id
                WHERE b.name = $1
                ORDER BY t.bump_time DESC
            `, [req.params.board]);
            res.json(result.rows);
        } catch(err) {
            console.error('GET /boards/:board/thread error:', err);
            res.status(500).json({error: err.message});
        }
    });

    router.post('/boards/:board/thread', async (req, res) => {
        try {
            const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
            const cd = checkCooldown(ip, 'create_thread', 10);
            if (!cd.allowed) {
                return res.status(429).json({ 
                    error: `Слишком часто. Подожди ${cd.remaining} сек.` 
                });
            }
            
            const { title, content, guest_name } = req.body;
            
            if (!content || content.trim() === '') {
                return res.status(400).json({error: 'Текст поста обязателен'});
            }
            
            const boardRes = await pool.query('SELECT id FROM boards WHERE name = $1', [req.params.board]);
            if (boardRes.rows.length === 0) {
                return res.status(404).json({error: 'Доска не найдена'});
            }
            
            const boardId = boardRes.rows[0].id;
            
            await pool.query('BEGIN');
            const threadRes = await pool.query(
                'INSERT INTO threads (board_id, title) VALUES ($1, $2) RETURNING id',
                [boardId, title || 'Без темы']
            );
            const threadId = threadRes.rows[0].id;
            
            await pool.query(
                'INSERT INTO posts (thread_id, guest_name, content) VALUES ($1, $2, $3)',
                [threadId, guest_name || 'Аноним', content]
            );
            await pool.query('COMMIT');
            
            res.json({thread_id: threadId, success: true});
        } catch(err) {
            await pool.query('ROLLBACK');
            console.error('POST /boards/:board/thread error:', err);
            res.status(500).json({error: err.message});
        }
    });

    router.get('/thread/:id/posts', async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at',
                [req.params.id]
            );
            res.json(result.rows);
        } catch(err) {
            console.error('GET /thread/:id/posts error:', err);
            res.status(500).json({error: err.message});
        }
    });

    router.post('/thread/:id/post', async (req, res) => {
        try {
            const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
            const cd = checkCooldown(ip, 'create_post', 1);
            if (!cd.allowed) {
                return res.status(429).json({ 
                    error: `Слишком часто. Подожди ${cd.remaining} сек.` 
                });
            }
            
            const { content, guest_name } = req.body;
            
            if (!content || content.trim() === '') {
                return res.status(400).json({error: 'Текст поста обязателен'});
            }
            
            await pool.query(
                'INSERT INTO posts (thread_id, guest_name, content) VALUES ($1, $2, $3)',
                [req.params.id, guest_name || 'Аноним', content]
            );
            
            await pool.query(
                'UPDATE threads SET bump_time = NOW() WHERE id = $1',
                [req.params.id]
            );
            
            res.json({success: true});
        } catch(err) {
            console.error('POST /thread/:id/post error:', err);
            res.status(500).json({error: err.message});
        }
    });
    
    router.get('/test', (req, res) => {
        res.json({ status: 'threads router works' });
    });

    return router;
};
