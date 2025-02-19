// server.mjs

import express from 'express';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const frontend = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
//app.use(express.json());
app.use(cors());
app.use(express.json());
// Chave secreta para JWT (ideal usar variável de ambiente em produção)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Inicializando o banco de dados SQLite
let db;

(async () => {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // Criação das tabelas se não existirem
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        content TEXT,
        image TEXT,
        likes INTEGER DEFAULT 0,  -- Define o padrão como 0
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      user_id INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(post_id, user_id),
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
    frontend.use(express.static(path.join(__dirname, 'public')));
    frontend.listen(80, () => {
        console.log('Frontend running on http://localhost:80');
    });
})();

// Middleware para autenticação via JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Espera um header no formato "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token not provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid' });
    req.user = user;
    next();
  });
}

// Endpoint para registrar novo usuário
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.json({ message: 'User registered successfully', userId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Endpoint para login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Gerar token com validade de 1 hora
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error during login' });
  }
});

// Endpoint para criar um post (autenticado)

app.get('/posts', async (req, res) => {
    try {
      const result = await db.all(
        'SELECT * FROM posts',
      );
      res.json(JSON.stringify(result));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error getting post' });
    }
});

app.get('/posts/:postId/comments', async (req, res) => {
    const { postId } = req.params;
    try {
        const result = await db.all(
        'SELECT * FROM comments WHERE comments.post_id == ?',
        [postId]
        );
        res.json(JSON.stringify(result));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error adding comment' });
    }
});
app.post('/posts', authenticateToken, async (req, res) => {
  const { content, image } = req.body;
  if (!content && !image)
    return res.status(400).json({ error: 'Content or image is required' });
  try {
    const result = await db.run(
      'INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)',
      [req.user.id, content, image || null]
    );
    res.json({ message: 'Post created successfully', postId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// Endpoint para comentar em um post (autenticado)
app.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;
  if (!comment)
    return res.status(400).json({ error: 'Comment is required' });
  try {
    const result = await db.run(
      'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, req.user.id, comment]
    );
    res.json({ message: 'Comment added successfully', commentId: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

app.post('/posts/:postId/like', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    try {
        const likeCheck = await db.get(
            'SELECT * FROM likes WHERE post_id = ? AND user_id = ?',
            [postId, req.user.id]
        );

        if (likeCheck) {
            // Se já curtiu, remove o like
            await db.run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
            await db.run('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
            return res.json({ message: 'Post unliked successfully' });
        }else{
            await db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
            await db.run('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);

            res.json({ message: 'Post liked successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error liking/unliking post' });
    }
});
