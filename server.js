const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Baza danych (plik JSON)
const adapter = new FileSync('books.json');
const db = low(adapter);

// Inicjalizacja bazy danych
db.defaults({ books: [], nextId: 1 }).write();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== API ====================

// GET /api/books — pobierz wszystkie książki
app.get('/api/books', (req, res) => {
    const books = db.get('books').value();
    res.json(books);
});

// GET /api/books/:id — pobierz jedną książkę
app.get('/api/books/:id', (req, res) => {
    const book = db.get('books').find({ id: parseInt(req.params.id) }).value();
    if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });
    res.json(book);
});

// POST /api/books — dodaj nową książkę
app.post('/api/books', (req, res) => {
    const { title, author, category, cover, description } = req.body;

    if (!title || !author) {
        return res.status(400).json({ error: 'Tytuł i autor są wymagane' });
    }

    const id = db.get('nextId').value();
    const newBook = {
        id,
        title,
        author,
        category: category || 'Inne',
        cover: cover || '',
        description: description || '',
        rating: 'Brak ocen',
        createdAt: new Date().toISOString()
    };

    db.get('books').push(newBook).write();
    db.update('nextId', n => n + 1).write();

    res.status(201).json(newBook);
});

// PUT /api/books/:id — edytuj książkę
app.put('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const book = db.get('books').find({ id }).value();

    if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });

    const { title, author, category, cover, description } = req.body;
    db.get('books').find({ id }).assign({ title, author, category, cover, description }).write();

    const updated = db.get('books').find({ id }).value();
    res.json(updated);
});

// DELETE /api/books/:id — usuń książkę
app.delete('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const book = db.get('books').find({ id }).value();

    if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });

    db.get('books').remove({ id }).write();
    res.json({ message: 'Książka usunięta' });
});

// Fallback — zwróć index.html dla wszystkich innych ścieżek
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
