class ApiClient {
    static async request(method, endpoint, body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
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

// ユーティリティ関数
const Utils = {
    formatTime: (seconds) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
    },
    
    parseTimeInput: (timeStr) => {
        const padded = timeStr.padStart(6, '0');
        const [hours, minutes, seconds] = [0, 2, 4].map(i => parseInt(padded.substring(i, i + 2), 10));
        
        if (minutes >= 60 || seconds >= 60) {
            throw new Error('時間の形式が不正です（分・秒は59以下で入力してください）');
        }
        
        return hours * 3600 + minutes * 60 + seconds;
    },
    
    formatTimeInput: (seconds) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(Math.floor(seconds / 3600))}${pad(Math.floor((seconds % 3600) / 60))}${pad(seconds % 60)}`;
    },
    
    formatDate: (dateStr) => {
        const date = new Date(dateStr);
        return {
            year: date.getFullYear(),
            monthDay: `${date.getMonth() + 1}/${date.getDate()}`
        };
    }
};

// テンプレート関数
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
    
    listItem: (itemClass, dataAttribute, name, type = null) => {
        const itemType = type || (dataAttribute === 'category' ? 'category' : 'task');
        return `
            <li class="${itemClass}" data-${dataAttribute}="${name}">
                ${name}
                <button class="delete-btn" data-type="${itemType}" data-name="${name}" title="削除">
                    <img src="/trash-icon.svg" alt="削除" width="14" height="14">
                </button>
            </li>
        `;
    }
};

// DOM操作ヘルパー
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
    
    toggleClass: (elements, className, condition) => {
        elements.forEach(el => el.classList.toggle(className, condition));
    },
    
    removeClassFromAll: (selector, className) => {
        Dom.$$(selector).forEach(el => el.classList.remove(className));
    },
    
    addClassToMatching: (selector, dataAttr, value, className) => {
        Dom.$$(selector).forEach(el => {
            if (el.dataset[dataAttr] === value) {
                el.classList.add(className);
            }
        });
    }
};

// UI管理クラス
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
    
    static addListItem(listSelector, itemClass, dataAttribute, name) {
        const list = Dom.$(listSelector);
        if (!list) return null;
        
        // 重複チェック
        const existing = Array.from(list.children)
            .some(item => item.dataset[dataAttribute] === name);
        if (existing) {
            alert("同じ名前の項目が既に存在します。");
            return null;
        }
        
        // typeを判定
        const type = dataAttribute === 'category' ? 'category' : 'task';
        list.insertAdjacentHTML('beforeend', Templates.listItem(itemClass, dataAttribute, name, type));
        const newItem = list.lastElementChild;
        
        Dom.removeClassFromAll(list.children, 'active');
        newItem.classList.add('active');
        
        return newItem;
    }
}

// メインアプリケーションクラス
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
            isNewStudyMode: false
        };
    }
    
    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        this.state.currentDate = urlParams.get('date') || new Date().toISOString().split('T')[0];
        
        UIManager.updateDateDisplay(this.state.currentDate);
        this.setupEventListeners();
        await this.loadDailyData();
        
        // 既存のカテゴリ・タスクに削除ボタンを追加
        this.addDeleteButtonsToExistingItems();
        
        // 初期状態で新規登録モードに設定
        this.startNewExpenseMode();
        this.startNewStudyMode();
        Dom.$('#addExpenseItemButton')?.classList.add('selected');
        Dom.$('#addStudyItemButton')?.classList.add('selected');
    }

    addDeleteButtonsToExistingItems() {
        Dom.$$('.category-item').forEach(item => {
            if (!item.querySelector('.delete-btn')) {
                item.style.position = 'relative';
                const name = item.dataset.category;
                item.innerHTML += `<button class="delete-btn" data-type="category" data-name="${name}" title="削除"><img src="/trash-icon.svg" alt="削除" width="14" height="14"></button>`;
            }
        });

        Dom.$$('.task-item').forEach(item => {
            if (!item.querySelector('.delete-btn')) {
                item.style.position = 'relative';
                const name = item.dataset.task;
                item.innerHTML += `<button class="delete-btn" data-type="task" data-name="${name}" title="削除"><img src="/trash-icon.svg" alt="削除" width="14" height="14"></button>`;
            }
        });
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
        // イベント委譲を使用
        document.addEventListener('click', this.handleClick.bind(this));
        
        // 時間入力の数字制限
        const timeInput = Dom.$('#timeInput');
        if (timeInput) {
            timeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }
        // 日付ナビゲーション
        Dom.$('#prevDay')?.addEventListener('click', () => this.navigateDate(-1));
        Dom.$('#nextDay')?.addEventListener('click', () => this.navigateDate(1));
    }
    
    handleClick(event) {
        const target = event.target;
        const closest = target.closest.bind(target);

        // 削除ボタンのクリック処理
        if (target.classList.contains('delete-btn')) {
            event.stopPropagation();
            this.handleDelete(target);
            return;
        }

        // 項目選択（編集モード）
        if (closest('.expense-item')) {
            const index = parseInt(closest('.expense-item').dataset.index, 10);
            this.editExpenseItem(index);
            return;
        } else if (closest('.study-item')) {
            const index = parseInt(closest('.study-item').dataset.index, 10);
            this.editStudyItem(index);
            return;
        }

        // 支出の「＋」ボタン
        if (target.id === 'addExpenseItemButton') {
            this.startNewExpenseMode();
            target.classList.add('selected');
            document.getElementById('addStudyItemButton')?.classList.remove('selected');
            return;
        }

        // 学習の「＋」ボタン
        if (target.id === 'addStudyItemButton') {
            this.startNewStudyMode();
            target.classList.add('selected');
            document.getElementById('addExpenseItemButton')?.classList.remove('selected');
            return;
        }

        // カテゴリー・タスク選択
        if (target.matches('.category-item')) {
            this.selectCategory(target);
            return;
        } else if (target.matches('.task-item')) {
            this.selectTask(target);
            return;
        }

        // カテゴリー・タスク追加
        if (target.id === 'addCategoryButton') {
            this.addNewCategory();
            return;
        } else if (target.id === 'addTaskButton') {
            this.addNewTask();
            return;
        }

        // 登録ボタン
        if (target.id === 'logExpenseButton') {
            this.handleExpenseRegistration();
            return;
        } else if (target.id === 'logTimeButton') {
            this.handleStudyRegistration();
            return;
        }

        // 戻るボタン
        if (target.matches('.back-btn')) {
            window.location.href = '/';
        }
    }

    async handleDelete(deleteBtn) {
        const type = deleteBtn.dataset.type;
        const id = deleteBtn.dataset.id;
        const name = deleteBtn.dataset.name;

        if (type === 'expense') {
            if (confirm('この支出記録を削除しますか？')) {
                await this.deleteExpense(id);
            }
        } else if (type === 'study') {
            if (confirm('この学習記録を削除しますか？')) {
                await this.deleteStudy(id);
            }
        } else if (type === 'category') {
            if (confirm(`カテゴリ「${name}」を削除しますか？`)) {
                this.deleteCategory(name);
            }
        } else if (type === 'task') {
            if (confirm(`タスク「${name}」を削除しますか？`)) {
                this.deleteTask(name);
            }
        }
    }

    // カテゴリ・タスク削除機能を復活
    deleteCategory(name) {
        const categoryItem = document.querySelector(`[data-category="${name}"]`);
        if (categoryItem) {
            categoryItem.remove();
            if (this.state.selectedCategory === name) {
                // 最初のカテゴリを選択
                const firstCategory = document.querySelector('.category-item');
                if (firstCategory) {
                    firstCategory.classList.add('active');
                    this.state.selectedCategory = firstCategory.dataset.category;
                } else {
                    this.state.selectedCategory = null;
                }
            }
        }
    }

    deleteTask(name) {
        const taskItem = document.querySelector(`[data-task="${name}"]`);
        if (taskItem) {
            taskItem.remove();
            if (this.state.selectedTask === name) {
                // 最初のタスクを選択
                const firstTask = document.querySelector('.task-item');
                if (firstTask) {
                    firstTask.classList.add('active');
                    this.state.selectedTask = firstTask.dataset.task;
                } else {
                    this.state.selectedTask = null;
                }
            }
        }
    }

    // データ記録の削除（API経由）
    async deleteExpense(id) {
        try {
            await ApiClient.delete(`/api/expense_logs/${id}`);
            alert('支出記録を削除しました。');
            await this.loadDailyData();
        } catch (error) {
            alert(`削除中にエラーが発生しました: ${error.message}`);
        }
    }

    async deleteStudy(id) {
        try {
            await ApiClient.delete(`/api/study_logs/${id}`);
            alert('学習記録を削除しました。');
            await this.loadDailyData();
        } catch (error) {
            alert(`削除中にエラーが発生しました: ${error.message}`);
        }
    }

    editExpenseItem(index) {
        Object.assign(this.state, {
            editingExpenseIndex: index,
            isNewExpenseMode: false
        });

        const expense = this.state.expenses[index];
        if (expense) {
            Dom.updateValue('#amountInput', expense.amount);
            UIManager.selectByData('.category-item', 'category', expense.category);
            this.state.selectedCategory = expense.category;
        }

        UIManager.selectItem('.expense-item', index);
        Dom.$('#addExpenseItemButton')?.classList.remove('selected');
    }
    
    editStudyItem(index) {
        Object.assign(this.state, {
            editingStudyIndex: index,
            isNewStudyMode: false
        });

        const study = this.state.studies[index];
        if (study) {
            Dom.updateValue('#timeInput', Utils.formatTimeInput(study.duration_seconds));
            UIManager.selectByData('.task-item', 'task', study.category);
            this.state.selectedTask = study.category;
        }

        UIManager.selectItem('.study-item', index);
        Dom.$('#addStudyItemButton')?.classList.remove('selected');
    }

    navigateDate(days) {
        const currentDate = new Date(this.state.currentDate);
        currentDate.setDate(currentDate.getDate() + days);
        const newDate = currentDate.toISOString().split('T')[0];
        window.location.href = `/details.html?date=${newDate}`;
    }
    
    startNewExpenseMode() {
        Object.assign(this.state, {
            isNewExpenseMode: true,
            editingExpenseIndex: null,
            selectedCategory: null
        });
        
        Dom.removeClassFromAll('.expense-item', 'selected');
        UIManager.resetInput('#amountInput', '.category-item');
    }
    
    startNewStudyMode() {
        Object.assign(this.state, {
            isNewStudyMode: true,
            editingStudyIndex: null,
            selectedTask: null
        });
        
        Dom.removeClassFromAll('.study-item', 'selected');
        UIManager.resetInput('#timeInput', '.task-item');
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
    
    addNewCategory() {
        const name = prompt("新しいカテゴリ名を入力してください:");
        if (!name?.trim()) return;
        
        const newItem = UIManager.addListItem('#categoryList', 'category-item', 'category', name.trim());
        if (newItem) this.state.selectedCategory = name.trim();
    }
    
    addNewTask() {
        const name = prompt("新しいタスク名を入力してください:");
        if (!name?.trim()) return;
        
        const newItem = UIManager.addListItem('#taskList', 'task-item', 'task', name.trim());
        if (newItem) this.state.selectedTask = name.trim();
    }
    
    async handleExpenseRegistration() {
        const amount = parseFloat(Dom.$('#amountInput').value);
        
        if (isNaN(amount) || amount <= 0) {
            return alert("有効な金額を入力してください。");
        }
        if (!this.state.selectedCategory) {
            return alert("カテゴリーを選択してください。");
        }
        
        try {
            let result;
            const payload = { 
                title: this.state.selectedCategory,
                amount,
                date: this.state.currentDate
            };
            
            if (this.state.isNewExpenseMode) {
                result = await ApiClient.post('/api/expense_logs', payload);
            } else if (this.state.editingExpenseIndex !== null) {
                const expense = this.state.expenses[this.state.editingExpenseIndex];
                result = await ApiClient.patch(`/api/expense_logs/${expense.id}`, payload);
            } else {
                return alert("操作モードが不明です。");
            }
            
            alert(result.message);
            await this.loadDailyData();
            this.resetExpenseState();
            
        } catch (error) {
            alert(`支出の記録中にエラーが発生しました: ${error.message}`);
        }
    }
    
    async handleStudyRegistration() {
        const timeStr = Dom.$('#timeInput').value.trim();
        
        if (!timeStr) {
            return alert("時間を入力してください。（例: 013000 = 1時間30分）");
        }
        if (!this.state.selectedTask) {
            return alert("タスクを選択してください。");
        }
        
        try {
            const durationSeconds = Utils.parseTimeInput(timeStr);
            if (durationSeconds === 0) {
                return alert("0より大きい時間を入力してください。");
            }
            
            let result;
            if (this.state.isNewStudyMode) {
            // 新規登録 : ミリ秒を送ってサーバー側で秒に変換
            const postPayload = {
                title:    this.state.selectedTask,
                duration: durationSeconds * 1000,
                date:     this.state.currentDate
            };
            result = await ApiClient.post('/api/study_logs', postPayload);
            } else if (this.state.editingStudyIndex !== null) {
            // 更新     : 秒を送る
            const study = this.state.studies[this.state.editingStudyIndex];
            const patchPayload = {
                title:    this.state.selectedTask,
                duration: durationSeconds,        // ← 秒
                date:     this.state.currentDate
            };
            result = await ApiClient.patch(`/api/study_logs/${study.id}`, patchPayload);
            } else {
                return alert("操作モードが不明です。");
            }
            
            alert(result.message);
            await this.loadDailyData();
            this.resetStudyState();
            
        } catch (error) {
            alert(`学習時間の記録中にエラーが発生しました: ${error.message}`);
        }
    }
    
    resetExpenseState() {
        this.state.editingExpenseIndex = null;
        this.state.isNewExpenseMode = false;
        Dom.updateValue('#amountInput', '');
        
        // 登録後も新規登録モードに戻す
        this.startNewExpenseMode();
        Dom.$('#addExpenseItemButton')?.classList.add('selected');
    }
    
    resetStudyState() {
        this.state.editingStudyIndex = null;
        this.state.isNewStudyMode = false;
        Dom.updateValue('#timeInput', '');
        
        // 登録後も新規登録モードに戻す
        this.startNewStudyMode();
        Dom.$('#addStudyItemButton')?.classList.add('selected');
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new DetailsApp().initialize();
});