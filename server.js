const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Połączenie z PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Inicjalizacja tabel
async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'Inne',
            cover TEXT DEFAULT '',
            description TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
            author VARCHAR(100) DEFAULT 'Anonim',
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log('Baza danych gotowa!');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== BOOKS API ====================

// GET /api/books
app.get('/api/books', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/books
app.post('/api/books', async (req, res) => {
    const { title, author, category, cover, description } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'Tytuł i autor są wymagane' });
    try {
        const result = await pool.query(
            'INSERT INTO books (title, author, category, cover, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, author, category || 'Inne', cover || '', description || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/books/:id
app.put('/api/books/:id', async (req, res) => {
    const { title, author, category, cover, description } = req.body;
    try {
        const result = await pool.query(
            'UPDATE books SET title=$1, author=$2, category=$3, cover=$4, description=$5 WHERE id=$6 RETURNING *',
            [title, author, category, cover, description, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono książki' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/books/:id
app.delete('/api/books/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM books WHERE id=$1', [req.params.id]);
        res.json({ message: 'Książka usunięta' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== REVIEWS API ====================

// GET /api/books/:id/reviews
app.get('/api/books/:id/reviews', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM reviews WHERE book_id=$1 ORDER BY created_at ASC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/books/:id/reviews
app.post('/api/books/:id/reviews', async (req, res) => {
    const { author, text } = req.body;
    if (!text || text.trim() === '') return res.status(400).json({ error: 'Treść opinii jest wymagana' });
    try {
        const result = await pool.query(
            'INSERT INTO reviews (book_id, author, text) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, author || 'Anonim', text.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
initDB().then(() => {
    app.listen(PORT, () => console.log(`Serwer działa na http://localhost:${PORT}`));
}).catch(err => {
    console.error('Błąd inicjalizacji bazy:', err);
    process.exit(1);
});
