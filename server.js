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
db.defaults({ books: [], reviews: [], nextBookId: 1, nextReviewId: 1 }).write();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==================== BOOKS API ====================

app.get('/api/books', (req, res) => {
    const books = db.get('books').value();
    res.json(books);
});

app.post('/api/books', (req, res) => {
    const { title, author, category, cover, description } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'Tytuł i autor są wymagane' });

    const id = db.get('nextBookId').value();
    const newBook = { id, title, author, category: category || 'Inne', cover: cover || '', description: description || '', createdAt: new Date().toISOString() };

    db.get('books').push(newBook).write();
    db.update('nextBookId', n => n + 1).write();
    res.status(201).json(newBook);
});

app.put('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const book = db.get('books').find({ id }).value();
    if (!book) return res.status(404).json({ error: 'Nie znaleziono książki' });

    const { title, author, category, cover, description } = req.body;
    db.get('books').find({ id }).assign({ title, author, category, cover, description }).write();
    res.json(db.get('books').find({ id }).value());
});

app.delete('/api/books/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!db.get('books').find({ id }).value()) return res.status(404).json({ error: 'Nie znaleziono książki' });

    db.get('books').remove({ id }).write();
    db.get('reviews').remove({ bookId: id }).write(); // usuń też opinie
    res.json({ message: 'Książka usunięta' });
});

// ==================== REVIEWS API ====================

// GET /api/books/:id/reviews — pobierz opinie dla książki
app.get('/api/books/:id/reviews', (req, res) => {
    const bookId = parseInt(req.params.id);
    const reviews = db.get('reviews').filter({ bookId }).value();
    res.json(reviews);
});

// POST /api/books/:id/reviews — dodaj opinię
app.post('/api/books/:id/reviews', (req, res) => {
    const bookId = parseInt(req.params.id);
    const { author, text } = req.body;

    if (!text || text.trim() === '') return res.status(400).json({ error: 'Treść opinii jest wymagana' });

    const id = db.get('nextReviewId').value();
    const newReview = {
        id,
        bookId,
        author: author || 'Anonim',
        text: text.trim(),
        createdAt: new Date().toISOString()
    };

    db.get('reviews').push(newReview).write();
    db.update('nextReviewId', n => n + 1).write();
    res.status(201).json(newReview);
});

// Fallback
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
