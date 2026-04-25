# 2fun.net API

**Base URL:** `https://twofun-net-zqzn.onrender.com/api`

All responses are JSON. CORS is enabled for all origins.

---

## Boards

### Get threads in a board

`GET /boards/:board/thread`

`board` = `b`, `pol`, `tech`

**Response:**
```json
[
  {
    "id": 1,
    "title": "Thread title",
    "reply_count": 4,
    "op_content": "First post text",
    "op_name": "Anonymous",
    "created_at": "2026-03-23T21:55:00.000Z"
  }
]
```

---

### Create a thread

`POST /boards/:board/thread`

**Send:**
```json
{
  "title": "optional",
  "content": "required",
  "guest_name": "optional, defaults to Anonymous"
}
```

**Returns:**
```json
{
  "thread_id": 42,
  "success": true
}
```

---

## Search

### Search threads

`GET /search?q={query}`

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `q` | string | Search query (required) |

**Response:**
```json
[
  {
    "id": 42,
    "title": "Thread title",
    "board_name": "b",
    "reply_count": 5,
    "op_content": "First post content",
    "op_name": "Anonymous",
    "created_at": "2026-03-23T21:55:00.000Z",
    "bump_time": "2026-03-23T21:55:00.000Z"
  }
]
```
Notes:

- Search is case-insensitive
- Searches in thread titles and first post content only (not replies)
- Maximum 100 results, sorted by bump time (newest first)
- Empty query returns 400 error

Example:
``GET https://twofun-net.onrender.com/api/search?q=chery``

---

## Threads

### Get posts in a thread

`GET /thread/:id/posts`

**Returns:**
```json
[
  {
    "id": 1,
    "guest_name": "Anonymous",
    "content": "Post text",
    "created_at": "2026-03-23T21:55:00.000Z"
  }
]
```

---

### Reply to a thread

`POST /thread/:id/post`

**Send:**
```json
{
  "content": "required",
  "guest_name": "optional, defaults to Anonymous"
}
```

**Returns:**
```json
{
  "success": true
}
```

---

## Errors

| Status | Meaning |
|--------|---------|
| 400 | Missing content or empty search query |
| 404 | Board or thread not found |
| 429 | Too many requests, anti-DDoS/DoS |
| 500 | Server error |

Error response:
```json
{
  "error": "Description"
}
```

---

## Example

**Get all threads in /b/:**
```
GET https://twofun-net.onrender.com/api/boards/b/thread
```

**Create a thread:**
```
POST https://twofun-net.onrender.com/api/boards/b/thread
Content-Type: application/json

{"content": "Hello", "guest_name": "User"}
```

**Reply to thread #42:**
```
POST https://twofun-net.onrender.com/api/thread/42/post
Content-Type: application/json

{"content": "Reply text"}
```

---

## Notes

- `reply_count` = number of replies (OP not included)
- Timestamps in UTC
- Empty content not allowed
