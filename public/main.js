import {
  start as startStopwatch, stop as stopStopwatch, reset as resetStopwatch, getCurrentElapsedTime,
} from './stopwatch.js';
import { initializeCalendar } from './calendar.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeCalendar();
});

const API = {
  async get(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('サーバーからの応答がありません');
      return response.json();
    } catch (error) {
      console.error(`GET Error for ${endpoint}:`, error);
      throw error;
    }
  },
  async post(endpoint, body) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'リクエストに失敗しました');
      return responseData;
    } catch (error) {
      console.error(`POST Error for ${endpoint}:`, error);
      throw error;
    }
  },
  async delete(endpoint) {
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        throw new Error('サーバーからの応答がありません');
      }
      return { success: true };
    } catch (error) {
      console.error(`DELETE Error for ${endpoint}:`, error);
      throw error;
    }
  },
};

const UI = {
  updateExpenseSummary(data) {
    const monthlyTotal = document.getElementById('expenseMonthlyTotalAmount');
    const grandTotal = document.getElementById('expenseGrandTotalAmount');
    if (monthlyTotal) monthlyTotal.textContent = (data.monthly_total || 0).toLocaleString();
    if (grandTotal) grandTotal.textContent = (data.grand_total || 0).toLocaleString();
  },
  updateStudySummary(data) {
    const monthlyTotal = document.getElementById('studyMonthlyTotal');
    const grandTotal = document.getElementById('studyGrandTotal');
    if (monthlyTotal) monthlyTotal.textContent = (data.monthly_total_hours || 0).toFixed(1);
    if (grandTotal) grandTotal.textContent = (data.grand_total_hours || 0).toFixed(1);
  },
  updateStopwatchDisplay(elapsed) {
    const timeDisplay = document.getElementById('timeDisplay');
    if (!timeDisplay) return;
    const pad = (num, size = 2) => (`000${num}`).slice(size * -1);
    const ms = Math.floor((elapsed % 1000) / 10);
    const secs = Math.floor((elapsed / 1000) % 60);
    const mins = Math.floor((elapsed / (1000 * 60)) % 60);
    const hrs = Math.floor(elapsed / (1000 * 60 * 60));
    timeDisplay.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 2)}`;
  },
  updatePlayPauseButton(isRunning) {
    const button = document.getElementById('playPauseButton');
    if (!button) return;
    button.innerHTML = isRunning ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  },
  toggleStopwatchRunningClass(isRunning) {
    const displayDiv = document.querySelector('.study-tracker-sidebar .stopwatch-display');
    if (!displayDiv) return;
    displayDiv.classList.toggle('running', isRunning);
  },
  resetAmountInput() {
    const amountInput = document.getElementById('amountInput');
    if (amountInput) amountInput.value = '';
  },
  createNewListItem(listElement, itemClass, dataAttribute, name) {
    const newItem = document.createElement('li');
    newItem.classList.add(itemClass);
    newItem.dataset[dataAttribute] = name;
    newItem.style.position = 'relative';
    newItem.innerHTML = `${name}<button class="delete-btn" data-type="${dataAttribute}" data-name="${name}" title="削除"><img src="/trash-icon.svg" alt="削除" width="14" height="14"></button>`;
    listElement.appendChild(newItem);
    return newItem;
  },
};

async function loadAndRenderItems(listElement, endpoint, itemClass, dataAttribute) {
  try {
    const items = await API.get(endpoint);
    listElement.innerHTML = '';
    items.forEach((item, index) => {
      const newItem = UI.createNewListItem(listElement, itemClass, dataAttribute, item.name);
      if (index === 0) {
        newItem.classList.add('active');
        if (dataAttribute === 'category') {
          window.selectedCategory = item.name;
        } else {
          window.selectedTask = item.name;
        }
      }
    });
  } catch (error) {
    alert(`${dataAttribute}の読み込みに失敗しました。`);
  }
}

async function handleCategoryTaskDelete(event) {
  const deleteBtn = event.target.closest('.delete-btn');
  if (!deleteBtn) return;

  event.stopPropagation();
  const { type, name } = deleteBtn.dataset;
  const endpoint = type === 'category' ? `/api/expense_categories/${encodeURIComponent(name)}` : `/api/study_categories/${encodeURIComponent(name)}`;

  if (confirm(`${type === 'category' ? 'カテゴリ' : 'タスク'}「${name}」を削除しますか？`)) {
    try {
      await API.delete(endpoint);
      const item = deleteBtn.closest('li');
      if (item) {
        item.remove();
        const firstItem = document.querySelector(`.${type}-item`);
        if (firstItem) {
          firstItem.classList.add('active');
          if (type === 'category') {
            window.selectedCategory = firstItem.dataset.category;
          } else {
            window.selectedTask = firstItem.dataset.task;
          }
        }
      }
    } catch (error) {
      alert('削除に失敗しました。');
    }
  }
}

function setupExpenseTracker() {
  const amountInput = document.getElementById('amountInput');
  const categoryList = document.getElementById('categoryList');
  const addCategoryButton = document.getElementById('addCategoryButton');
  const logExpenseButton = document.getElementById('logExpenseButton');

  loadAndRenderItems(categoryList, '/api/expense_categories', 'category-item', 'category');

  if (categoryList) {
    categoryList.addEventListener('click', (event) => {
      const item = event.target.closest('.category-item');
      if (item) {
        categoryList.querySelectorAll('.category-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        window.selectedCategory = item.dataset.category;
      }
    });
    categoryList.addEventListener('click', handleCategoryTaskDelete);
  }

  if (logExpenseButton) {
    logExpenseButton.addEventListener('click', async () => {
      const amount = parseFloat(amountInput.value);
      if (Number.isNaN(amount) || amount <= 0) {
        alert('有効な金額を入力してください。');
        return false;
      }
      if (!window.selectedCategory) {
        alert('カテゴリーを選択してください。');
        return false;
      }
      try {
        const result = await API.post('/api/expense_logs', { title: window.selectedCategory, amount });
        alert(result.message);
        UI.resetAmountInput();
        document.dispatchEvent(new Event('calendar:refresh'));
        API.get('/api/expense_summary').then(UI.updateExpenseSummary);
        return true;
      } catch (error) {
        alert(`支出の記録中にエラーが発生しました: ${error.message}`);
        return false;
      }
    });
  }

  if (addCategoryButton) {
    addCategoryButton.addEventListener('click', async () => {
      const name = prompt('新しいカテゴリ名を入力してください:');
      if (!name || !name.trim()) return;
      const trimmedName = name.trim();
      try {
        const newCategory = await API.post('/api/expense_categories', { name: trimmedName });
        const newItem = UI.createNewListItem(categoryList, 'category-item', 'category', newCategory.name);
        categoryList.querySelectorAll('.category-item').forEach((i) => i.classList.remove('active'));
        newItem.classList.add('active');
        window.selectedCategory = newCategory.name;
      } catch (error) {
        alert(`カテゴリの追加に失敗しました: ${error.message}`);
      }
    });
  }
}

function setupStudyTracker() {
  const taskList = document.getElementById('taskList');
  const addTaskButton = document.getElementById('addTaskButton');
  const playPauseButton = document.getElementById('playPauseButton');
  const logTimeButton = document.getElementById('logTimeButton');
  let isStopwatchRunning = false;

  loadAndRenderItems(taskList, '/api/study_categories', 'task-item', 'task');

  if (taskList) {
    taskList.addEventListener('click', (event) => {
      const item = event.target.closest('.task-item');
      if (item) {
        taskList.querySelectorAll('.task-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        window.selectedTask = item.dataset.task;
      }
    });
    taskList.addEventListener('click', handleCategoryTaskDelete);
  }

  if (addTaskButton) {
    addTaskButton.addEventListener('click', async () => {
      const name = prompt('新しいタスク名を入力してください:');
      if (!name || !name.trim()) return;
      const trimmedName = name.trim();
      try {
        const newTask = await API.post('/api/study_categories', { name: trimmedName });
        const newItem = UI.createNewListItem(taskList, 'task-item', 'task', newTask.name);
        taskList.querySelectorAll('.task-item').forEach((i) => i.classList.remove('active'));
        newItem.classList.add('active');
        window.selectedTask = newTask.name;
      } catch (error) {
        alert(`タスクの追加に失敗しました: ${error.message}`);
      }
    });
  }

  if (playPauseButton) {
    playPauseButton.addEventListener('click', () => {
      isStopwatchRunning = !isStopwatchRunning;
      if (isStopwatchRunning) {
        startStopwatch();
      } else {
        stopStopwatch();
      }
      UI.updatePlayPauseButton(isStopwatchRunning);
      UI.toggleStopwatchRunningClass(isStopwatchRunning);
    });
  }

  if (logTimeButton) {
    logTimeButton.addEventListener('click', async () => {
      const duration = getCurrentElapsedTime();
      if (duration === 0 && !isStopwatchRunning) {
        alert('記録する時間がありません。ストップウォッチを開始してください。');
        return false;
      }
      if (!window.selectedTask) {
        alert('タスクを選択してください。');
        return false;
      }
      if (isStopwatchRunning) {
        stopStopwatch();
        isStopwatchRunning = false;
      }
      try {
        const result = await API.post('/api/study_logs', { title: window.selectedTask, duration });
        alert(result.message);
        resetStopwatch();
        UI.updateStopwatchDisplay(0);
        UI.updatePlayPauseButton(false);
        UI.toggleStopwatchRunningClass(false);
        document.dispatchEvent(new Event('calendar:refresh'));
        API.get('/api/study_summary').then(UI.updateStudySummary);
        return true;
      } catch (error) {
        alert(`学習時間の記録中にエラーが発生しました: ${error.message}`);
        return false;
      }
    });
  }

  document.addEventListener('timeUpdate', (event) => {
    UI.updateStopwatchDisplay(event.detail.elapsedTime);
  });
}

function initializeApp() {
  setupExpenseTracker();
  setupStudyTracker();
  API.get('/api/expense_summary').then(UI.updateExpenseSummary);
  API.get('/api/study_summary').then(UI.updateStudySummary);
  document.dispatchEvent(new Event('calendar:refresh'));
}

document.addEventListener('DOMContentLoaded', initializeApp);