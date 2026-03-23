let currentTasks = [];

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Fetch all tasks
async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        currentTasks = data.tasks;
        renderTasks();
    } catch (error) {
        console.error("Failed to fetch tasks", error);
    }
}

// Create task
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalContent = btn.innerHTML;
    
    // Add loading state
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.style.opacity = '0.7';
    btn.disabled = true;

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
    
    // Restore button
    btn.innerHTML = originalContent;
    btn.style.opacity = '1';
    btn.disabled = false;
    
    fetchTasks();
});

// Update Status
async function updateStatus(id, newStatus) {
    if(newStatus === 'DONE') {
        // Optional confetti or success animation could go here
    }
    
    await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    fetchTasks();
}

// Delete Task
async function deleteTask(id) {
    if(confirm('Are you sure you want to delete this task?')) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        fetchTasks();
    }
}

// Render Tasks
function renderTasks() {
    const filter = document.getElementById('filter-status').value;
    const filteredTasks = currentTasks.filter(t => filter === 'ALL' || t.status === filter);
    
    const colTodo = document.getElementById('col-todo');
    const colInProgress = document.getElementById('col-in-progress');
    const colDone = document.getElementById('col-done');
    
    colTodo.innerHTML = '';
    colInProgress.innerHTML = '';
    colDone.innerHTML = '';
    
    let countTodo = 0;
    let countInProgress = 0;
    let countDone = 0;
    
    filteredTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-card priority-${task.priority}`;
        
        let actionsHtml = '';
        
        // Build Action Buttons based on status
        if (task.status === 'TODO') {
            actionsHtml = `
                <div class="move-actions">
                    <button class="btn-icon btn-move-next" onclick="updateStatus(${task.id}, 'IN_PROGRESS')" title="Start Progress">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="btn-icon btn-done" onclick="updateStatus(${task.id}, 'DONE')" title="Mark as Done">
                        <i class="fa-solid fa-check-double"></i>
                    </button>
                </div>
            `;
            countTodo++;
        } else if (task.status === 'IN_PROGRESS') {
            actionsHtml = `
                <div class="move-actions">
                    <button class="btn-icon btn-move-prev" onclick="updateStatus(${task.id}, 'TODO')" title="Move Back">
                        <i class="fa-solid fa-backward-step"></i>
                    </button>
                    <button class="btn-icon btn-done" onclick="updateStatus(${task.id}, 'DONE')" title="Mark as Done">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            `;
            countInProgress++;
        } else if (task.status === 'DONE') {
            actionsHtml = `
                <div class="move-actions">
                    <button class="btn-icon btn-move-prev" onclick="updateStatus(${task.id}, 'IN_PROGRESS')" title="Reopen Task">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            `;
            countDone++;
        }
        
        div.innerHTML = `
            <div class="card-badges">
                <span class="priority-badge">${task.priority}</span>
                <span class="date-badge"><i class="fa-regular fa-clock"></i> ${formatDate(task.created_at)}</span>
            </div>
            <h3>${task.title}</h3>
            ${task.description ? `<p>${task.description}</p>` : ''}
            <div class="task-actions">
                ${actionsHtml}
                <button class="btn-icon btn-delete" onclick="deleteTask(${task.id})" title="Delete Task">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;
        
        if (task.status === 'TODO') colTodo.appendChild(div);
        else if (task.status === 'IN_PROGRESS') colInProgress.appendChild(div);
        else if (task.status === 'DONE') colDone.appendChild(div);
    });
    
    // Update counts
    document.getElementById('count-todo').textContent = countTodo;
    document.getElementById('count-in-progress').textContent = countInProgress;
    document.getElementById('count-done').textContent = countDone;
    
    // Add empty states if columns are empty
    if(countTodo === 0) colTodo.innerHTML = '<div class="empty-state"><i class="fa-solid fa-mug-hot"></i><p>Nothing to do!</p></div>';
    if(countInProgress === 0) colInProgress.innerHTML = '<div class="empty-state"><i class="fa-solid fa-ghost"></i><p>No active tasks.</p></div>';
    if(countDone === 0) colDone.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No completed tasks yet.</p></div>';
}

document.getElementById('filter-status').addEventListener('change', renderTasks);

document.addEventListener('DOMContentLoaded', fetchTasks);
