const API_URL = `${window.location.origin}/api/books`;

let allBooks = [];
let isEditMode = false;
let currentBookId = null;

const bookForm = document.getElementById('book-form');
const bookList = document.getElementById('book-list');
const adminPanel = document.getElementById('admin-panel');
const editModeBtn = document.getElementById('edit-mode-btn');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('book-modal');
const modalBody = document.getElementById('modal-body');

// Tryb edycji
editModeBtn.addEventListener('click', () => {
    isEditMode = !isEditMode;
    editModeBtn.innerText = isEditMode ? "Zakończ edycję" : "Edytuj";
    adminPanel.style.display = isEditMode ? "block" : "none";
    renderBooks(allBooks);
});

// Pobieranie książek
async function fetchBooks() {
    try {
        const response = await fetch(API_URL);
        allBooks = await response.json();
        renderBooks(allBooks);
    } catch (error) {
        console.error('Błąd połączenia z serwerem:', error);
        bookList.innerHTML = '<p style="text-align:center; color:red; grid-column:1/-1;">Błąd połączenia z serwerem.</p>';
    }
}

// Wyszukiwarka
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allBooks.filter(book =>
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
    );
    renderBooks(filtered);
});

// Wyświetlanie książek
function renderBooks(books) {
    bookList.innerHTML = '';
    if (books.length === 0) {
        bookList.innerHTML = '<p style="text-align:center; color:#999; grid-column:1/-1;">Brak książek. Dodaj pierwszą!</p>';
        return;
    }
    books.forEach(book => {
        const card = document.createElement('div');
        card.classList.add('book-card');
        const coverSrc = book.cover || 'https://covers.storytel.com/jpg-640/0408311119686.ed958adf-e147-46bc-bf5f-d7da6e1305a5?optimize=high&quality=70&width=600';
        card.innerHTML = `
            <img src="${coverSrc}" class="book-cover" alt="Okładka">
            <span class="book-category">${book.category || 'Inne'}</span>
            <h3>${book.title}</h3>
            <p class="author-text">Autor: ${book.author}</p>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') openDetails(book);
        });
        if (isEditMode) {
            const controls = document.createElement('div');
            controls.classList.add('admin-controls');
            controls.innerHTML = `
                <button class="btn-edit" onclick="editBook(${book.id})">Edytuj</button>
                <button class="btn-danger" onclick="deleteBook(${book.id})">Usuń</button>
            `;
            card.appendChild(controls);
        }
        bookList.appendChild(card);
    });
}

// Dodawanie/edytowanie książki
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('book-id').value;
    const bookData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        category: document.getElementById('category').value,
        cover: document.getElementById('cover').value,
        description: document.getElementById('description').value
    };
    try {
        if (id) {
            await fetch(`${API_URL}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookData) });
        } else {
            await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookData) });
        }
        bookForm.reset();
        document.getElementById('book-id').value = '';
        document.getElementById('form-title').innerText = "Dodaj nową książkę";
        fetchBooks();
    } catch (error) {
        console.error("Błąd zapisu:", error);
    }
});

window.editBook = function(id) {
    const book = allBooks.find(b => b.id === id);
    if (book) {
        document.getElementById('book-id').value = book.id;
        document.getElementById('title').value = book.title;
        document.getElementById('author').value = book.author;
        document.getElementById('category').value = book.category;
        document.getElementById('cover').value = book.cover || '';
        document.getElementById('description').value = book.description;
        document.getElementById('form-title').innerText = "Edytuj książkę";
        window.scrollTo(0, 0);
    }
}

window.deleteBook = async function(id) {
    if (confirm("Czy na pewno chcesz usunąć tę książkę?")) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchBooks();
        } catch (error) {
            console.error("Błąd usuwania:", error);
        }
    }
}

// ==================== MODAL + OPINIE ====================

async function openDetails(book) {
    currentBookId = book.id;
    modalBody.innerHTML = `
        <h2>${book.title}</h2>
        <h4>Autor: ${book.author}</h4>
        <p><strong>Kategoria:</strong> ${book.category}</p>
        <p style="margin-top:10px;"><strong>Opis:</strong> ${book.description || 'Brak opisu'}</p>
    `;
    modal.style.display = 'flex';
    await loadReviews(book.id);
}

async function loadReviews(bookId) {
    const reviewsList = document.getElementById('reviews-list');
    try {
        const res = await fetch(`${API_URL}/${bookId}/reviews`);
        const reviews = await res.json();

        if (reviews.length === 0) {
            reviewsList.innerHTML = '<p style="color:#999;">Brak opinii. Bądź pierwszy!</p>';
        } else {
            reviewsList.innerHTML = reviews.map(r => `
                <div style="border-bottom:1px solid #eee; padding:8px 0;">
                    <strong>${r.author}</strong>
                    <span style="font-size:12px; color:#999; margin-left:8px;">${new Date(r.createdAt).toLocaleDateString('pl-PL')}</span>
                    <p style="margin-top:4px;">${r.text}</p>
                </div>
            `).join('');
        }
    } catch (e) {
        reviewsList.innerHTML = '<p style="color:red;">Błąd ładowania opinii.</p>';
    }
}

// Dodaj opinię
document.getElementById('add-review-btn').addEventListener('click', async () => {
    const textarea = document.getElementById('review-text');
    const text = textarea.value.trim();
    if (!text) return alert('Napisz coś przed dodaniem opinii!');

    try {
        await fetch(`${API_URL}/${currentBookId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: 'Użytkownik', text })
        });
        textarea.value = '';
        await loadReviews(currentBookId);
    } catch (e) {
        console.error('Błąd dodawania opinii:', e);
    }
});

// Zamykanie modala
document.querySelector('.close-btn').addEventListener('click', () => {
    modal.style.display = 'none';
    currentBookId = null;
});
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        currentBookId = null;
    }
});

fetchBooks();
