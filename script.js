// Sélection des éléments du DOM
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompleted');
const allCount = document.getElementById('allCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');

// État de l'application
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    updateCounts();
});

// Ajouter une tâche
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        taskInput.focus();
        taskInput.style.borderColor = 'var(--danger-color)';
        setTimeout(() => {
            taskInput.style.borderColor = '';
        }, 500);
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateCounts();

    taskInput.value = '';
    taskInput.focus();

    // Animation de confirmation
    addBtn.innerHTML = '<i class="fas fa-check"></i><span>Ajouté!</span>';
    setTimeout(() => {
        addBtn.innerHTML = '<i class="fas fa-plus"></i><span>Ajouter</span>';
    }, 1000);
}

// Basculer l'état de complétion d'une tâche
function toggleTask(id) {
    tasks = tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks();
    renderTasks();
    updateCounts();
}

// Supprimer une tâche
function deleteTask(id) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    taskElement.style.animation = 'slideOut 0.3s ease';

    setTimeout(() => {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        updateCounts();
    }, 300);
}

// Supprimer toutes les tâches terminées
clearCompletedBtn.addEventListener('click', () => {
    if (tasks.filter(task => task.completed).length === 0) {
        return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les tâches terminées ?')) {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        updateCounts();
    }
});

// Filtrer les tâches
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

// Afficher les tâches
function renderTasks() {
    const filteredTasks = getFilteredTasks();

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-inbox"></i>
                <p>Aucune tâche pour le moment</p>
                <p style="font-size: 0.9rem; margin-top: 8px; opacity: 0.7;">Ajoutez votre première tâche ci-dessus!</p>
            </div>
        `;
        clearCompletedBtn.disabled = true;
        return;
    }

    if (filteredTasks.length === 0) {
        let message = '';
        if (currentFilter === 'active') {
            message = 'Aucune tâche active';
        } else if (currentFilter === 'completed') {
            message = 'Aucune tâche terminée';
        }

        taskList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-filter"></i>
                <p>${message}</p>
            </div>
        `;
        clearCompletedBtn.disabled = tasks.filter(task => task.completed).length === 0;
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="checkbox" onclick="toggleTask(${task.id})">
                <i class="fas fa-check"></i>
            </div>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </button>
        </li>
    `).join('');

    clearCompletedBtn.disabled = tasks.filter(task => task.completed).length === 0;
}

// Obtenir les tâches filtrées
function getFilteredTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(task => !task.completed);
        case 'completed':
            return tasks.filter(task => task.completed);
        default:
            return tasks;
    }
}

// Mettre à jour les compteurs
function updateCounts() {
    const total = tasks.length;
    const active = tasks.filter(task => !task.completed).length;
    const completed = tasks.filter(task => task.completed).length;

    allCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;
}

// Sauvegarder les tâches dans le localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Échapper les caractères HTML pour éviter les injections XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Animation de sortie pour la suppression
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Gestion du focus sur l'input au chargement
window.addEventListener('load', () => {
    taskInput.focus();
});
