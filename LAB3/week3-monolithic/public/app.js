let currentTasks = [];

// Fetch all tasks
async function fetchTasks() {
    const response = await fetch('/api/tasks');
    const data = await response.json();
    currentTasks = data.tasks;
    renderTasks();
}

// Create task
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value
    };
    await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });
    document.getElementById('task-form').reset();
    fetchTasks();
});

// Update Status
async function updateStatus(id, newStatus) {
    await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    fetchTasks();
}

// Delete Task
async function deleteTask(id) {
    if(confirm('Delete this task?')) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
    }
}

// Render Tasks
function renderTasks() {
    const filter = document.getElementById('filter-status').value;
    const filteredTasks = currentTasks.filter(t => filter === 'ALL' || t.status === filter);
    
    document.getElementById('col-todo').innerHTML = '';
    document.getElementById('col-in-progress').innerHTML = '';
    document.getElementById('col-done').innerHTML = '';
    
    filteredTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task priority-${task.priority}`;
        div.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description || ''}</p>
            <div class="task-actions">
                ${task.status === 'TODO' ? `<button class="btn-move" onclick="updateStatus(${task.id}, 'IN_PROGRESS')">Move ➡️</button>` : ''}
                ${task.status === 'IN_PROGRESS' ? `
                    <button class="btn-move" onclick="updateStatus(${task.id}, 'TODO')">⬅️ Back</button>
                    <button class="btn-move" onclick="updateStatus(${task.id}, 'DONE')">Done ✅</button>
                ` : ''}
                ${task.status === 'DONE' ? `<button class="btn-move" onclick="updateStatus(${task.id}, 'IN_PROGRESS')">Undo 🔄</button>` : ''}
                <button class="btn-delete" onclick="deleteTask(${task.id})">Delete 🗑️</button>
            </div>
        `;
        
        if (task.status === 'TODO') document.getElementById('col-todo').appendChild(div);
        else if (task.status === 'IN_PROGRESS') document.getElementById('col-in-progress').appendChild(div);
        else if (task.status === 'DONE') document.getElementById('col-done').appendChild(div);
    });
}

document.getElementById('filter-status').addEventListener('change', renderTasks);

document.addEventListener('DOMContentLoaded', fetchTasks);
