const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

const db = new sqlite3.Database('./database/tasks.db');

// GET all tasks
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ tasks: rows });
        }
    });
});

// GET single task
app.get('/api/tasks/:id', (req, res) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(row);
    });
});

// POST create task
app.post('/api/tasks', (req, res) => {
    const { title, description, priority } = req.body;
    db.run(
        'INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)',
        [title, description, priority],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ id: this.lastID });
            }
        }
    );
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
    const { title, description, status, priority } = req.body;
    db.run(
        'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, description, status, priority, req.params.id],
        function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ changes: this.changes });
        }
    );
});

// PATCH update status only
app.patch('/api/tasks/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, req.params.id],
        function(err) {
            if (err) res.status(500).json({ error: err.message });
            else res.json({ changes: this.changes });
        }
    );
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ changes: this.changes });
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
