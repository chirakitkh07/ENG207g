<div align="center">

# 🎯 Week 3: Task Board Monolithic App 🛠️
### **ENGSE207 Software Architecture - Week 3 Lab**

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

*A comprehensive starter code template for building a Monolithic Task Board Application.*
*You will implement the missing architectural parts following the TODO comments in the code.*

</div>

---

## 📋 1. Overview

This project serves as a practical implementation guide for understanding **Monolithic Architecture**. You will build a full-stack Task Board app where the frontend, backend API, and database operations reside within a single, cohesive codebase.

---

## 🎓 2. Learning Objectives

By completing this lab, you will master:

| Status | Objective | Description |
| :---: | :--- | :--- |
| ✅ | **Architecture** | Understand Monolithic Architecture structure. |
| ✅ | **Backend** | Build a full-stack application with **Node.js + Express**. |
| ✅ | **API Design** | Implement proper **REST API** endpoints. |
| ✅ | **Database** | Use **SQLite** database with Node.js smoothly. |
| ✅ | **Frontend** | Create an interactive UI with **Vanilla JavaScript**. |
| ✅ | **Async JS** | Practice asynchronous programming (`async`/`await`). |

---

## 📁 3. Project Structure

Here is how the monolithic application is organized:

```text
📦 week3-starter-code/
┣ 📜 server.js              👉 Backend server (TODO: Implement routes)
┣ 📜 package.json           👉 Dependencies (Complete ✓)
┣ 📜 .gitignore             👉 Git ignore file (Complete ✓)
┣ 📜 README.md              👉 Project instructions
┣ 📂 database/
┃ ┗ 📜 schema.sql           👉 Database schema (Complete ✓)
┗ 📂 public/
  ┣ 📜 index.html           👉 Frontend HTML layout (Complete ✓)
  ┣ 📜 style.css            👉 Application styles (Complete ✓)
  ┗ 📜 app.js               👉 Frontend Logic (TODO: Implement logic)
```

### 📊 Task Completion Tracker
> **Focus areas:** You primarily need to work on the files marked with ⚠️ **TODO**.

| File | Status | Description |
|------|--------|-------------|
| 🛠️ `server.js` | ⚠️ **TODO** | Implement **13 parts** (API routes, database queries, etc.) |
| 🛠️ `public/app.js` | ⚠️ **TODO** | Implement **14 parts** (frontend logic & fetch API) |
| 🗄️ `database/schema.sql` | ✅ **Complete** | Database schema ready to use |
| 🌐 `public/index.html` | ✅ **Complete** | HTML structure ready |
| 🎨 `public/style.css` | ✅ **Complete** | All styles provided |

---

## 🚀 4. Quick Start Guide

### Step 1: Install Dependencies
Get your environment ready by installing the required npm packages:
```bash
npm install
```
*Installs: `express` (Web framework), `sqlite3` (Database), `nodemon` (Auto-restart).*

### Step 2: Initialize the Database
Set up your SQLite database tables and sample data:
```bash
# Navigate to database folder
cd database

# Create database and run schema
sqlite3 tasks.db < schema.sql

# Back to root
cd ..
```
> 💡 *Tip: You can verify the data by running: `sqlite3 tasks.db "SELECT * FROM tasks;"`*

### Step 3: Implement TODOs
Open the project in VS Code and hunt for the `TODO` comments.

**Priority Order:**
1. 🥇 **Backend First:** `server.js` (Parts 1-13)
2. 🥈 **Frontend Second:** `public/app.js` (Parts 1-14)

### Step 4: Run the Application
Start your server with auto-reload enabled:
```bash
npm run dev
```
🌐 Your app is now running at **`http://localhost:3000`**

---

## 📝 5. Implementation Guide

### 🔴 Part A: Backend (`server.js`)
We will be implementing standard REST API operations.

<details open>
<summary><b>Click to expand backend parts & testing commands</b></summary>

1. **Part 1-4:** Setup (imports, app, middleware, database)
2. **Part 5:** `GET` all tasks
3. **Part 6:** `GET` single task
4. **Part 7:** `POST` create task
5. **Part 8:** `PUT` update task
6. **Part 9:** `DELETE` task
7. **Part 10:** `PATCH` update status
8. **Part 11-13:** Serve frontend & server startup

**⚡ Testing via cURL or Thunder Client:**
```bash
# POST: Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","priority":"HIGH"}'

# PATCH: Update status
curl -X PATCH http://localhost:3000/api/tasks/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"DONE"}'
```
</details>

### 🔵 Part B: Frontend (`public/app.js`)
Wiring up the UI to talk to our newly built backend.

<details open>
<summary><b>Click to expand frontend parts</b></summary>

1. **Part 1-2:** State & DOM elements
2. **Part 3:** Fetch tasks from API
3. **Part 4:** Create new task
4. **Part 5:** Update task status
5. **Part 6:** Delete task
6. **Part 7-10:** Render functions
7. **Part 11:** Utility functions
8. **Part 12-14:** Event listeners & initialization
</details>

---

## ⚠️ 6. Common Mistakes to Avoid

🛡️ **Backend:**
- ❌ Forgetting `app.use(express.json())` → `req.body` will be undefined!
- ❌ Hardcoding SQL queries leading to injection (ALWAYS use parameterized queries `[param1, param2]`).
- ❌ Crashing the server by not handling database `err` in callbacks.

🛡️ **Frontend:**
- ❌ Missing `await` before calling `fetch()`.
- ❌ Forgetting to use `.json()` to parse response data.
- ❌ Vulnerable to XSS → Always use `escapeHtml()` when injecting user input to the DOM.

---

## 🧪 7. Testing Checklist

Before submitting, verify that your app passes all checkpoints:

### ⚙️ API Tests
- [ ] `GET /api/tasks` → Returns 200 & array of tasks
- [ ] `POST /api/tasks` → Returns 201 & created task
- [ ] `PATCH /api/tasks/:id/status` → Returns 200 & updates task correctly
- [ ] `DELETE /api/tasks/:id` → Returns 200 & deletes task
- [ ] Invalid routes return proper `404` or `400` status codes.

### 🖥️ UI Tests
- [ ] Page renders without console errors.
- [ ] Tasks automatically categorize into correct columns.
- [ ] Drag-and-drop / Status changes update the UI seamlessly.
- [ ] Filtering works as expected.

---

## 📖 8. Helpful Resources

**SQLite3 Methods Quick Reference:**
```javascript
// Multiple rows
db.all(sql, params, (err, rows) => { ... });

// Single row
db.get(sql, params, (err, row) => { ... });

// Insert / Update / Delete
db.run(sql, params, function(err) {
    console.log(this.lastID);  // Inserted ID
    console.log(this.changes); // Affected rows
});
```

---

## 📤 9. Submission & Grading

| Criteria | Pts | Details |
|----------|:---:|---------|
| ⚙️ **Functionality** | **4** | All CRUD operations work seamlessly. |
| 🧼 **Code Quality** | **2** | Clean, structured, well-commented code. |
| 📄 **Documentation** | **2** | README & Reflection completed. |
| 🔀 **Git Usage** | **1** | Logical and meaningful commit history. |
| ✨ **Creativity** | **1** | Extra features (dark mode, animations, etc).|

> **Ready to Submit?**
> 1. Complete your `REFLECTION.md`
> 2. Commit everything: `git commit -m "Week 3: Complete monolithic Task Board"`
> 3. Push to GitHub or compress to `.zip` (Exclude `node_modules`).

---

<div align="center">
  <h3>🎉 You Got This!</h3>
  <p>Start with the backend, write clean code, and test frequently.<br><b>Good luck! 💪</b></p>
  <br>
  <em>ENGSE207 Software Architecture - Week 3 | Version 1.0</em>
</div>