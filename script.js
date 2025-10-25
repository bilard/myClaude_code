// Sélection des éléments du DOM
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clearCompleted');
const allCount = document.getElementById('allCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');

// Initialisation Supabase
let supabase = null;
let useSupabase = false;

try {
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' &&
        SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
        supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        console.log('✅ Supabase connecté avec succès');
    } else {
        console.log('⚠️ Supabase non configuré, utilisation du localStorage');
    }
} catch (error) {
    console.log('⚠️ Erreur de configuration Supabase, utilisation du localStorage:', error);
}

// État de l'application
let tasks = [];
let currentFilter = 'all';

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    await loadTasks();
    renderTasks();
    updateCounts();
});

// Charger les tâches depuis Supabase ou localStorage
async function loadTasks() {
    if (useSupabase) {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            tasks = data.map(task => ({
                id: task.id,
                text: task.text,
                completed: task.completed,
                createdAt: task.created_at
            }));
        } catch (error) {
            console.error('Erreur lors du chargement depuis Supabase:', error);
            // Fallback vers localStorage en cas d'erreur
            tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        }
    } else {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    }
}

// Ajouter une tâche
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

async function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        taskInput.focus();
        taskInput.style.borderColor = 'var(--danger-color)';
        setTimeout(() => {
            taskInput.style.borderColor = '';
        }, 500);
        return;
    }

    const newTask = {
        text: taskText,
        completed: false,
        created_at: new Date().toISOString()
    };

    if (useSupabase) {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert([newTask])
                .select()
                .single();

            if (error) throw error;

            tasks.unshift({
                id: data.id,
                text: data.text,
                completed: data.completed,
                createdAt: data.created_at
            });
        } catch (error) {
            console.error('Erreur lors de l\'ajout dans Supabase:', error);
            alert('Erreur lors de l\'ajout de la tâche. Vérifiez votre connexion.');
            return;
        }
    } else {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.unshift(task);
        saveTasks();
    }

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
async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newCompletedState = !task.completed;

    if (useSupabase) {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ completed: newCompletedState })
                .eq('id', id);

            if (error) throw error;

            tasks = tasks.map(task =>
                task.id === id ? { ...task, completed: newCompletedState } : task
            );
        } catch (error) {
            console.error('Erreur lors de la mise à jour dans Supabase:', error);
            alert('Erreur lors de la mise à jour de la tâche.');
            return;
        }
    } else {
        tasks = tasks.map(task =>
            task.id === id ? { ...task, completed: newCompletedState } : task
        );
        saveTasks();
    }

    renderTasks();
    updateCounts();
}

// Supprimer une tâche
async function deleteTask(id) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    taskElement.style.animation = 'slideOut 0.3s ease';

    setTimeout(async () => {
        if (useSupabase) {
            try {
                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                tasks = tasks.filter(task => task.id !== id);
            } catch (error) {
                console.error('Erreur lors de la suppression dans Supabase:', error);
                alert('Erreur lors de la suppression de la tâche.');
                return;
            }
        } else {
            tasks = tasks.filter(task => task.id !== id);
            saveTasks();
        }

        renderTasks();
        updateCounts();
    }, 300);
}

// Supprimer toutes les tâches terminées
clearCompletedBtn.addEventListener('click', async () => {
    const completedTasks = tasks.filter(task => task.completed);

    if (completedTasks.length === 0) {
        return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les tâches terminées ?')) {
        if (useSupabase) {
            try {
                const completedIds = completedTasks.map(task => task.id);

                const { error } = await supabase
                    .from('tasks')
                    .delete()
                    .in('id', completedIds);

                if (error) throw error;

                tasks = tasks.filter(task => !task.completed);
            } catch (error) {
                console.error('Erreur lors de la suppression dans Supabase:', error);
                alert('Erreur lors de la suppression des tâches terminées.');
                return;
            }
        } else {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
        }

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

// Sauvegarder les tâches dans le localStorage (fallback)
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
