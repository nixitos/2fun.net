CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    description TEXT
);

CREATE TABLE threads (
    id SERIAL PRIMARY KEY,
    board_id INTEGER REFERENCES boards(id),
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    bump_time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES threads(id),
    user_id INTEGER REFERENCES users(id),
    guest_name VARCHAR(50),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO boards (name, description) VALUES 
('b', 'Общий срач'),
('pol', 'Политика'),
('tech', 'Техно');