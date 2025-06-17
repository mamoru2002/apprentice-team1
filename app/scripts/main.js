import { start as startStopwatch, stop as stopStopwatch, reset as resetStopwatch, getCurrentElapsedTime } from './stopwatch.js';

document.addEventListener('DOMContentLoaded', () => {

    async function fetchExpenseSummary() {
        try {
            const response = await fetch('/expense_summary');
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();
            
            const expenseMonthlyTotalDisplay = document.getElementById('expenseMonthlyTotalAmount');
            const expenseGrandTotalDisplay = document.getElementById('expenseGrandTotalAmount');

            if(expenseMonthlyTotalDisplay) expenseMonthlyTotalDisplay.textContent = (data.monthly_total || 0).toLocaleString();
            if(expenseGrandTotalDisplay) expenseGrandTotalDisplay.textContent = (data.grand_total || 0).toLocaleString();
        } catch (error) {
            console.error('Error fetching expense summary:', error);
        }
    }

    async function fetchStudySummary() {
        try {
            const response = await fetch('/study_summary');
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();

            const studyMonthlyTotalDisplay = document.getElementById('studyMonthlyTotal');
            const studyGrandTotalDisplay = document.getElementById('studyGrandTotal');

            if(studyMonthlyTotalDisplay) studyMonthlyTotalDisplay.textContent = (data.monthly_total || 0).toFixed(1);
            if(studyGrandTotalDisplay) studyGrandTotalDisplay.textContent = (data.grand_total || 0).toFixed(1);
        } catch (error) {
            console.error('Error fetching study summary:', error);
        }
    }

    const timeDisplay = document.getElementById('timeDisplay');
    const playPauseButton = document.getElementById('playPauseButton');
    const stopwatchDisplayDiv = document.querySelector('.study-tracker-sidebar .stopwatch-display');
    const studyLogTimeButton = document.getElementById('logTimeButton');
    const taskList = document.getElementById('taskList');
    const addTaskButton = document.getElementById('addTaskButton');

    const playIcon = '<i class="fas fa-play"></i>';
    const pauseIcon = '<i class="fas fa-pause"></i>';

    let isStopwatchRunning = false;
    let selectedTask = "Ruby";

    function updatePlayPauseButton() {
        if (!playPauseButton) return;
        playPauseButton.innerHTML = isStopwatchRunning ? pauseIcon : playIcon;
    }

    function updateStopwatchDisplayClass() {
        if (!stopwatchDisplayDiv) return;
        if (isStopwatchRunning) {
            stopwatchDisplayDiv.classList.add('running');
        } else {
            stopwatchDisplayDiv.classList.remove('running');
        }
    }

    function updateStopwatchNumericalDisplay(elapsed) {
        if (!timeDisplay) return;
        const pad = (num, size = 2) => ('000' + num).slice(size * -1);
        const ms = Math.floor((elapsed % 1000) / 10);
        const secs = Math.floor((elapsed / 1000) % 60);
        const mins = Math.floor((elapsed / (1000 * 60)) % 60);
        const hrs = Math.floor(elapsed / (1000 * 60 * 60));
        timeDisplay.textContent = `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 2)}`;
    }

    if (playPauseButton) {
        playPauseButton.addEventListener('click', () => {
            if (isStopwatchRunning) {
                stopStopwatch();
                isStopwatchRunning = false;
            } else {
                startStopwatch();
                isStopwatchRunning = true;
            }
            updatePlayPauseButton();
            updateStopwatchDisplayClass();
        });
    }

    if (taskList) {
        taskList.addEventListener('click', (event) => {
            const clickedItem = event.target.closest('.task-item');
            if (!clickedItem) return;

            taskList.querySelectorAll('.task-item').forEach(i => i.classList.remove('active'));
            clickedItem.classList.add('active');
            selectedTask = clickedItem.dataset.task;
        });
    }

    if (studyLogTimeButton) {
        studyLogTimeButton.addEventListener('click', async () => {
            const elapsedTimeValue = getCurrentElapsedTime();
            if (elapsedTimeValue === 0 && !isStopwatchRunning) {
                 alert("記録する時間がありません。ストップウォッチを開始してください。");
                 return;
            }
            if (isStopwatchRunning) {
                stopStopwatch();
                isStopwatchRunning = false;
            }
            
            const dataToLog = { taskName: selectedTask, duration: elapsedTimeValue };

            try {
                const response = await fetch('/study_logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(dataToLog)
                });
                const responseData = await response.json();
                if (!response.ok) {
                    const errorMessage = responseData.error || `HTTP error! status: ${response.status}`;
                    alert(`学習記録の保存に失敗しました: ${errorMessage}`);
                    return; 
                }
                alert(responseData.message);
                resetStopwatch();
                updateStopwatchNumericalDisplay(0);
                updatePlayPauseButton();
                updateStopwatchDisplayClass();
                await fetchStudySummary();
            } catch (error) {
                console.error("Error logging study time:", error);
                alert("学習記録の保存中にエラーが発生しました。");
            }
        });
    }
    
    if(addTaskButton){
        addTaskButton.addEventListener('click', () => {
            const newTaskName = prompt("新しいタスク名を入力してください:");
            if (!newTaskName || newTaskName.trim() === "") return;
            const trimmedTaskName = newTaskName.trim();
            if (trimmedTaskName.length > 26) {
                alert("タスク名は26文字以内で入力してください。");
                return;
            }
            const existingTasks = taskList.querySelectorAll('.task-item');
            if (Array.from(existingTasks).some(item => item.dataset.task === trimmedTaskName)) {
                alert("同じ名前のタスクが既に存在します。");
                return;
            }
            const newTaskItem = document.createElement('li');
            newTaskItem.classList.add('task-item');
            newTaskItem.dataset.task = trimmedTaskName;
            newTaskItem.textContent = trimmedTaskName;
            taskList.appendChild(newTaskItem);
            
            existingTasks.forEach(item => item.classList.remove('active'));
            newTaskItem.classList.add('active');
            selectedTask = trimmedTaskName;
        });
    }

    document.addEventListener('timeUpdate', (event) => {
        if(timeDisplay && stopwatchDisplayDiv){
            updateStopwatchNumericalDisplay(event.detail.elapsedTime);
        }
    });

    if(playPauseButton && stopwatchDisplayDiv && timeDisplay){
        updatePlayPauseButton();
        updateStopwatchDisplayClass();
        updateStopwatchNumericalDisplay(0);
    }

    const amountInput = document.getElementById('amountInput');
    const categoryList = document.getElementById('categoryList');
    const addCategoryButton = document.getElementById('addCategoryButton');
    const logExpenseButton = document.getElementById('logExpenseButton');

    let selectedCategory = "食費";

    if(amountInput) {
        amountInput.value = "";
        amountInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') event.preventDefault(); 
        });
    }

    if (categoryList) {
        categoryList.addEventListener('click', (event) => {
            const clickedItem = event.target.closest('.category-item');
            if (!clickedItem) return;
            categoryList.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
            clickedItem.classList.add('active');
            selectedCategory = clickedItem.dataset.category;
        });
    }

    if (logExpenseButton) {
        logExpenseButton.addEventListener('click', async () => {
            const amount = parseFloat(amountInput.value);
            if (isNaN(amount) || amount <= 0) {
                alert("有効な金額を入力してください。");
                return;
            }
            if (!selectedCategory) {
                alert("カテゴリを選択してください。");
                return;
            }

            const dataToLog = { title: selectedCategory, amount: amount };

            try {
                const response = await fetch('/expense_logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(dataToLog)
                });
                 const responseData = await response.json();
                if (!response.ok) {
                    const errorMessage = responseData.error || `HTTP error! status: ${response.status}`;
                    alert(`支出記録の保存に失敗しました: ${errorMessage}`);
                    return;
                }
                alert(responseData.message);
                if(amountInput) amountInput.value = "";
                await fetchExpenseSummary();
            } catch(error) {
                console.error("Error logging expense:", error);
                alert("支出記録の保存中にエラーが発生しました。");
            }
        });
    }

    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', () => {
            const newCategoryName = prompt("新しいカテゴリ名を入力してください:");
            if (!newCategoryName || newCategoryName.trim() === "") return;
            const trimmedCategoryName = newCategoryName.trim();
            if (trimmedCategoryName.length > 26) {
                alert("カテゴリ名は26文字以内で入力してください。");
                return;
            }
            const existingCategories = categoryList.querySelectorAll('.category-item');
            if (Array.from(existingCategories).some(item => item.dataset.category === trimmedCategoryName)) {
                alert("同じ名前のカテゴリが既に存在します。");
                return;
            }
            const newCategoryItem = document.createElement('li');
            newCategoryItem.classList.add('category-item');
            newCategoryItem.dataset.category = trimmedCategoryName;
            newCategoryItem.textContent = trimmedCategoryName;
            categoryList.appendChild(newCategoryItem);

            existingCategories.forEach(item => item.classList.remove('active'));
            newCategoryItem.classList.add('active');
            selectedCategory = trimmedCategoryName;
        });
    }
    
    fetchExpenseSummary();
    fetchStudySummary();
});