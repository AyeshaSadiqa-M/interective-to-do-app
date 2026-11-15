// One array is the source of truth for every task in the interface.
const STORAGE_KEY = 'daymark-tasks-v1';
let tasks = loadFromStorage();

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const errorMessage = document.getElementById('form-error');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskCount = document.getElementById('task-count');
const countLabel = document.getElementById('count-label');

// Parse saved JSON, then keep only records with the shape this app understands.
function loadFromStorage() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (savedValue === null) return [];
    const parsedValue = JSON.parse(savedValue);
    if (!Array.isArray(parsedValue)) throw new Error('Saved tasks were not an array.');
    const validTasks = parsedValue.filter((task) =>
      task && typeof task.id === 'string' && typeof task.text === 'string' &&
      typeof task.completed === 'boolean'
    );
    console.info(`[Daymark] Loaded ${validTasks.length} task(s) from LocalStorage.`);
    if (validTasks.length !== parsedValue.length) console.warn('[Daymark] Ignored invalid saved task records.');
    return validTasks;
  } catch (error) {
    console.error('[Daymark] Could not load saved tasks. Starting with an empty list.', error);
    try { localStorage.removeItem(STORAGE_KEY); } catch (removeError) {
      console.error('[Daymark] Could not clear corrupted saved tasks.', removeError);
    }
    return [];
  }
}

// JSON turns the in-memory array into the string format LocalStorage can store.
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    console.info(`[Daymark] Saved ${tasks.length} task(s) to LocalStorage.`);
  } catch (error) {
    console.error('[Daymark] Could not save tasks to LocalStorage.', error);
    errorMessage.textContent = 'Your changes could not be saved in this browser.';
  }
}

// Validate first, then add one plain object and draw the updated list.
function addTask() {
  const text = input.value.trim();
  if (!text) {
    errorMessage.textContent = 'Add a task first — a few words is all it takes.';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return false;
  }

  tasks.push({ id: createId(), text, completed: false });
  console.info('[Daymark] Task added.');
  input.value = '';
  clearError();
  saveToStorage();
  renderList();
  input.focus();
  return true;
}

// Find a task by its id so its completion state stays in the array.
function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  console.info(`[Daymark] Task ${task.completed ? 'completed' : 'marked incomplete'}.`);
  saveToStorage();
  renderList();
}

// Remove the matching task, redraw, then return keyboard focus to a useful control.
function deleteTask(id) {
  const taskIndex = tasks.findIndex((item) => item.id === id);
  if (taskIndex === -1) return;
  tasks.splice(taskIndex, 1);
  console.info('[Daymark] Task deleted.');
  saveToStorage();
  renderList();
  const nextDeleteButton = taskList.querySelector('.delete-button');
  (nextDeleteButton || input).focus();
}

// Rebuild the list safely. User-entered text is always assigned through textContent.
function renderList() {
  taskList.replaceChildren();
  tasks.forEach((task) => {
    const row = document.createElement('li');
    row.className = `task-item${task.completed ? ' is-complete' : ''}`;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'task-toggle';
    toggle.dataset.action = 'toggle';
    toggle.dataset.id = task.id;
    toggle.setAttribute('aria-label', `${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.text}`);
    toggle.setAttribute('aria-pressed', String(task.completed));
    toggle.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8 3 3 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.dataset.action = 'delete';
    remove.dataset.id = task.id;
    remove.setAttribute('aria-label', `Delete: ${task.text}`);
    remove.textContent = '×';

    row.append(toggle, text, remove);
    taskList.append(row);
  });

  emptyState.hidden = tasks.length > 0;
  updateTaskCounter();
}

// Count only tasks that still need doing.
function updateTaskCounter() {
  const remaining = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = String(remaining);
  countLabel.textContent = remaining === 1 ? ' task left' : ' tasks left';
}

function clearError() {
  errorMessage.textContent = '';
  input.removeAttribute('aria-invalid');
}

function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// The form handles both the button and Enter; delegation handles every task row.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask();
});
input.addEventListener('input', clearError);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    input.value = '';
    clearError();
  }
});
taskList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || !taskList.contains(button)) return;
  if (button.dataset.action === 'toggle') toggleTask(button.dataset.id);
  if (button.dataset.action === 'delete') deleteTask(button.dataset.id);
});

renderList();
