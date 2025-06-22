class ApiClient {
  static async request(method, endpoint, body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(endpoint, options);
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'リクエストに失敗しました');
      return data;
    } catch (error) {
      console.error(`${method} Error for ${endpoint}:`, error);
      throw error;
    }
  }

  static get = (endpoint) => this.request('GET', endpoint);

  static post = (endpoint, body) => this.request('POST', endpoint, body);

  static patch = (endpoint, body) => this.request('PATCH', endpoint, body);

  static delete = (endpoint) => this.request('DELETE', endpoint);
}

const Utils = {
  formatTime: (seconds) => {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '00:00:00';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  },

  parseTimeInput: (timeStr) => {
    const padded = timeStr.padStart(6, '0');
    const [hours, minutes, seconds] = [0, 2, 4].map((i) => parseInt(padded.substring(i, i + 2), 10));

    if (minutes >= 60 || seconds >= 60) {
      throw new Error('時間の形式が不正です（分・秒は59以下で入力してください）');
    }

    return hours * 3600 + minutes * 60 + seconds;
  },

  formatTimeInput: (seconds) => {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '';
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(Math.floor(seconds / 3600))}${pad(Math.floor((seconds % 3600) / 60))}${pad(seconds % 60)}`;
  },

  formatDate: (dateStr) => {
    const date = new Date(dateStr);
    return {
      year: date.getFullYear(),
      monthDay: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  },
};

const Templates = {
  expenseItem: (expense, index) => `
        <div class="expense-item" data-index="${index}" data-id="${expense.id}">
            <span class="category-tag">${expense.category}</span>
            <span class="amount-value">¥${expense.amount.toLocaleString()}</span>
            <button class="delete-btn" data-type="expense" data-id="${expense.id}" title="削除">
                <img src="/trash-icon.svg" alt="削除" width="16" height="16">
            </button>
        </div>
    `,

  studyItem: (study, index) => `
        <div class="study-item" data-index="${index}" data-id="${study.id}">
            <span class="subject-tag">${study.category}</span>
            <span class="time-value">${Utils.formatTime(study.duration_seconds)}</span>
            <button class="delete-btn" data-type="study" data-id="${study.id}" title="削除">
                <img src="/trash-icon.svg" alt="削除" width="16" height="16">
            </button>
        </div>
    `,

  listItem: (itemClass, dataAttribute, name) => `
            <li class="${itemClass}" data-${dataAttribute}="${name}">
                ${name}
                <button class="delete-btn" data-type="${dataAttribute}" data-name="${name}" title="削除">
                    <img src="/trash-icon.svg" alt="削除" width="14" height="14">
                </button>
            </li>
        `,
};

const Dom = {
  $: (selector) => document.querySelector(selector),
  $$: (selector) => document.querySelectorAll(selector),

  updateText: (selector, text) => {
    const el = Dom.$(selector);
    if (el) el.textContent = text;
  },

  updateValue: (selector, value) => {
    const el = Dom.$(selector);
    if (el) el.value = value;
  },

  removeClassFromAll: (selector, className) => {
    Dom.$$(selector).forEach((el) => el.classList.remove(className));
  },

  addClassToMatching: (selector, dataAttr, value, className) => {
    Dom.$$(selector).forEach((el) => {
      if (el.dataset[dataAttr] === value) {
        el.classList.add(className);
      }
    });
  },
};

class UIManager {
  static updateDateDisplay(dateStr) {
    const { year, monthDay } = Utils.formatDate(dateStr);
    Dom.updateText('#yearDisplay', year);
    Dom.updateText('#dateDisplay', monthDay);
  }

  static updateTotals(expenses, studies) {
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const studyTotal = studies.reduce((sum, s) => sum + s.duration_seconds, 0);

    Dom.updateText('#expenseTotalAmount', expenseTotal.toLocaleString());
    Dom.updateText('#studyTotalTime', Utils.formatTime(studyTotal));
  }

  static renderItems(containerId, items, templateFn) {
    const container = Dom.$(containerId);
    if (container) {
      container.innerHTML = items.map(templateFn).join('');
    }
  }

  static selectItem(selector, index) {
    Dom.removeClassFromAll(selector, 'selected');
    const item = Dom.$(`${selector}[data-index="${index}"]`);
    if (item) item.classList.add('selected');
  }

  static selectByData(selector, dataAttr, value) {
    Dom.removeClassFromAll(selector, 'active');
    Dom.addClassToMatching(selector, dataAttr, value, 'active');
  }

  static resetInput(inputSelector, itemSelector) {
    Dom.updateValue(inputSelector, '');
    Dom.removeClassFromAll(itemSelector, 'active');
  }
}

class DetailsApp {
  constructor() {
    this.state = {
      currentDate: null,
      expenses: [],
      studies: [],
      editingExpenseIndex: null,
      editingStudyIndex: null,
      selectedCategory: null,
      selectedTask: null,
      isNewExpenseMode: false,
      isNewStudyMode: false,
    };
  }

  async initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    this.state.currentDate = urlParams.get('date') || new Date().toISOString().split('T')[0];

    UIManager.updateDateDisplay(this.state.currentDate);
    this.setupEventListeners();

    await this.loadAllCategories();
    await this.loadDailyData();

    this.startNewExpenseMode();
    this.startNewStudyMode();
    Dom.$('#addExpenseItemButton')?.classList.add('selected');
    Dom.$('#addStudyItemButton')?.classList.add('selected');
  }

  async loadAllCategories() {
    const expensePromise = this.loadAndRenderCategories('#categoryList', '/api/expense_categories', 'category-item', 'category');
    const studyPromise = this.loadAndRenderCategories('#taskList', '/api/study_categories', 'task-item', 'task');
    await Promise.all([expensePromise, studyPromise]);
  }

  async loadAndRenderCategories(listId, endpoint, itemClass, dataAttribute) {
    const list = Dom.$(listId);
    if (!list) return;
    try {
      const items = await ApiClient.get(endpoint);
      list.innerHTML = '';
      items.forEach((item) => {
        list.insertAdjacentHTML('beforeend', Templates.listItem(itemClass, dataAttribute, item.name));
      });
    } catch (error) {
      console.error(`Failed to load ${dataAttribute}s:`, error);
    }
  }

  async loadDailyData() {
    try {
      const data = await ApiClient.get(`/api/daily_details?date=${this.state.currentDate}`);
      this.state.expenses = data.expenses || [];
      this.state.studies = data.studies || [];

      UIManager.updateTotals(this.state.expenses, this.state.studies);
      UIManager.renderItems('#expenseItemsList', this.state.expenses, Templates.expenseItem);
      UIManager.renderItems('#studyItemsList', this.state.studies, Templates.studyItem);
    } catch (error) {
      console.error('日次データの読み込みに失敗しました:', error);
      alert('データの読み込みに失敗しました。');
    }
  }

  setupEventListeners() {
    document.addEventListener('click', this.handleClick.bind(this));
    const timeInput = Dom.$('#timeInput');
    if (timeInput) {
      timeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
      });
    }
    Dom.$('#prevDay')?.addEventListener('click', () => this.navigateDate(-1));
    Dom.$('#nextDay')?.addEventListener('click', () => this.navigateDate(1));
  }

  handleClick(event) {
    const { target } = event;
    const closest = target.closest.bind(target);

    const deleteBtn = closest('.delete-btn');
    if (deleteBtn) {
      event.stopPropagation();
      this.handleDelete(deleteBtn);
      return;
    }

    if (closest('.expense-item')) {
      const index = parseInt(closest('.expense-item').dataset.index, 10);
      this.editExpenseItem(index);
      return;
    }
    if (closest('.study-item')) {
      const index = parseInt(closest('.study-item').dataset.index, 10);
      this.editStudyItem(index);
      return;
    }

    if (target.id === 'addExpenseItemButton') {
      this.startNewExpenseMode();
      return;
    }
    if (target.id === 'addStudyItemButton') {
      this.startNewStudyMode();
      return;
    }

    if (closest('.category-item')) {
      this.selectCategory(closest('.category-item'));
      return;
    }
    if (closest('.task-item')) {
      this.selectTask(closest('.task-item'));
      return;
    }

    if (target.id === 'addCategoryButton') {
      this.addNewCategory();
      return;
    }
    if (target.id === 'addTaskButton') {
      this.addNewTask();
      return;
    }

    if (target.id === 'logExpenseButton') {
      this.handleExpenseRegistration();
      return;
    }
    if (target.id === 'logTimeButton') {
      this.handleStudyRegistration();
      return;
    }

    if (closest('.back-btn')) {
      window.location.href = '/';
    }
  }

  async handleDelete(deleteBtn) {
    const { type, id, name } = deleteBtn.dataset;
    switch (type) {
      case 'expense':
        if (confirm('この支出記録を削除しますか？')) await this.deleteExpense(id);
        break;
      case 'study':
        if (confirm('この学習記録を削除しますか？')) await this.deleteStudy(id);
        break;
      case 'category':
        if (confirm(`カテゴリ「${name}」を削除しますか？`)) await this.deleteCategory(name);
        break;
      case 'task':
        if (confirm(`タスク「${name}」を削除しますか？`)) await this.deleteTask(name);
        break;
      default:
        break;
    }
  }

  async deleteCategory(name) {
    try {
      await ApiClient.delete(`/api/expense_categories/${encodeURIComponent(name)}`);
      const categoryItem = Dom.$(`[data-category="${name}"]`);
      if (categoryItem) categoryItem.remove();
      if (this.state.selectedCategory === name) {
        const firstCategory = Dom.$('.category-item');
        if (firstCategory) {
          firstCategory.classList.add('active');
          this.state.selectedCategory = firstCategory.dataset.category;
        } else {
          this.state.selectedCategory = null;
        }
      }
    } catch (error) {
      alert(`カテゴリの削除中にエラーが発生しました: ${error.message}`);
    }
  }

  async deleteTask(name) {
    try {
      await ApiClient.delete(`/api/study_categories/${encodeURIComponent(name)}`);
      const taskItem = Dom.$(`[data-task="${name}"]`);
      if (taskItem) taskItem.remove();
      if (this.state.selectedTask === name) {
        const firstTask = Dom.$('.task-item');
        if (firstTask) {
          firstTask.classList.add('active');
          this.state.selectedTask = firstTask.dataset.task;
        } else {
          this.state.selectedTask = null;
        }
      }
    } catch (error) {
      alert(`タスクの削除中にエラーが発生しました: ${error.message}`);
    }
  }

  async deleteExpense(id) {
    try {
      await ApiClient.delete(`/api/expense_logs/${id}`);
      alert('支出記録を削除しました。');
      await this.loadDailyData();
      this.startNewExpenseMode();
    } catch (error) {
      alert(`削除中にエラーが発生しました: ${error.message}`);
    }
  }

  async deleteStudy(id) {
    try {
      await ApiClient.delete(`/api/study_logs/${id}`);
      alert('学習記録を削除しました。');
      await this.loadDailyData();
      this.startNewStudyMode();
    } catch (error) {
      alert(`削除中にエラーが発生しました: ${error.message}`);
    }
  }

  editExpenseItem(index) {
    this.state.isNewExpenseMode = false;
    this.state.editingExpenseIndex = index;
    Dom.removeClassFromAll('.expense-item', 'selected');
    Dom.$('#addExpenseItemButton')?.classList.remove('selected');

    const expense = this.state.expenses[index];
    if (expense) {
      Dom.updateValue('#amountInput', expense.amount);
      UIManager.selectByData('.category-item', 'category', expense.category);
      this.state.selectedCategory = expense.category;
      Dom.$(`.expense-item[data-index="${index}"]`)?.classList.add('selected');
    }
  }

  editStudyItem(index) {
    this.state.isNewStudyMode = false;
    this.state.editingStudyIndex = index;
    Dom.removeClassFromAll('.study-item', 'selected');
    Dom.$('#addStudyItemButton')?.classList.remove('selected');

    const study = this.state.studies[index];
    if (study) {
      Dom.updateValue('#timeInput', Utils.formatTimeInput(study.duration_seconds));
      UIManager.selectByData('.task-item', 'task', study.category);
      this.state.selectedTask = study.category;
      Dom.$(`.study-item[data-index="${index}"]`)?.classList.add('selected');
    }
  }

  navigateDate(days) {
    const currentDate = new Date(this.state.currentDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split('T')[0];
    window.location.href = `/details.html?date=${newDate}`;
  }

  startNewExpenseMode() {
    this.state.isNewExpenseMode = true;
    this.state.editingExpenseIndex = null;
    UIManager.resetInput('#amountInput', '.category-item');
    Dom.removeClassFromAll('.expense-item', 'selected');
    Dom.$('#addExpenseItemButton')?.classList.add('selected');
    this.state.selectedCategory = null;
  }

  startNewStudyMode() {
    this.state.isNewStudyMode = true;
    this.state.editingStudyIndex = null;
    UIManager.resetInput('#timeInput', '.task-item');
    Dom.removeClassFromAll('.study-item', 'selected');
    Dom.$('#addStudyItemButton')?.classList.add('selected');
    this.state.selectedTask = null;
  }

  selectCategory(target) {
    Dom.removeClassFromAll('.category-item', 'active');
    target.classList.add('active');
    this.state.selectedCategory = target.dataset.category;
  }

  selectTask(target) {
    Dom.removeClassFromAll('.task-item', 'active');
    target.classList.add('active');
    this.state.selectedTask = target.dataset.task;
  }

  async addNewCategory() {
    const name = prompt('新しいカテゴリ名を入力してください:');
    if (!name?.trim()) return;
    try {
      const newCategory = await ApiClient.post('/api/expense_categories', { name: name.trim() });
      const list = Dom.$('#categoryList');
      list.insertAdjacentHTML('beforeend', Templates.listItem('category-item', 'category', newCategory.name));
      this.selectCategory(list.lastElementChild);
    } catch (error) {
      alert(`カテゴリの追加に失敗しました: ${error.message}`);
    }
  }

  async addNewTask() {
    const name = prompt('新しいタスク名を入力してください:');
    if (!name?.trim()) return;
    try {
      const newTask = await ApiClient.post('/api/study_categories', { name: name.trim() });
      const list = Dom.$('#taskList');
      list.insertAdjacentHTML('beforeend', Templates.listItem('task-item', 'task', newTask.name));
      this.selectTask(list.lastElementChild);
    } catch (error) {
      alert(`タスクの追加に失敗しました: ${error.message}`);
    }
  }

  async handleExpenseRegistration() {
    const amount = parseFloat(Dom.$('#amountInput').value);
    if (Number.isNaN(amount) || amount <= 0) return alert('有効な金額を入力してください。');
    if (!this.state.selectedCategory) return alert('カテゴリーを選択してください。');

    try {
      const payload = {
        title: this.state.selectedCategory,
        amount,
        date: this.state.currentDate,
      };
      let result;
      if (this.state.isNewExpenseMode) {
        result = await ApiClient.post('/api/expense_logs', payload);
      } else if (this.state.editingExpenseIndex !== null) {
        const expenseId = this.state.expenses[this.state.editingExpenseIndex].id;
        result = await ApiClient.patch(`/api/expense_logs/${expenseId}`, payload);
      } else {
        return alert('操作モードが不明です。');
      }
      alert(result.message);
      await this.loadDailyData();
      this.startNewExpenseMode();
    } catch (error) {
      alert(`支出の記録中にエラーが発生しました: ${error.message}`);
    }
  }

  async handleStudyRegistration() {
    const timeStr = Dom.$('#timeInput').value.trim();
    if (!timeStr) return alert('時間を入力してください。（例: 013000 = 1時間30分）');
    if (!this.state.selectedTask) return alert('タスクを選択してください。');

    try {
      const durationSeconds = Utils.parseTimeInput(timeStr);
      if (durationSeconds <= 0) return alert('0より大きい時間を入力してください。');

      let result;
      if (this.state.isNewStudyMode) {
        result = await ApiClient.post('/api/study_logs', {
          title: this.state.selectedTask,
          duration: durationSeconds * 1000,
          date: this.state.currentDate,
        });
      } else if (this.state.editingStudyIndex !== null) {
        const studyId = this.state.studies[this.state.editingStudyIndex].id;
        result = await ApiClient.patch(`/api/study_logs/${studyId}`, {
          title: this.state.selectedTask,
          duration: durationSeconds,
          date: this.state.currentDate,
        });
      } else {
        return alert('操作モードが不明です。');
      }
      alert(result.message);
      await this.loadDailyData();
      this.startNewStudyMode();
    } catch (error) {
      alert(`学習時間の記録中にエラーが発生しました: ${error.message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DetailsApp().initialize();
});