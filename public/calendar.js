let calendarData = [];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed month

const calendarEl = document.getElementById('calendar-dates');
const yearEl = document.getElementById('current-year');
const monthEl = document.getElementById('current-month');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

async function loadCalendarData() {
  try {
    const res = await fetch('/api/calendar_data');
    const data = await res.json();

    calendarData = data.map(entry => ({
      date: entry.date,
      expense: entry.total_expense > 0
        ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(entry.total_expense)
        : null,
      hours: entry.total_hours > 0
        ? `${entry.total_hours}h`
        : null
    }));

    renderCalendar(currentYear, currentMonth);
  } catch (error) {
    console.error('カレンダーデータの取得に失敗しました:', error);
  }
}

function renderCalendar(year, month) {
  calendarEl.innerHTML = '';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const totalCells = 42;
  const prevMonthLastDate = new Date(year, month, 0).getDate();

  yearEl.textContent = `${year}`;
  monthEl.textContent = `${month + 1}`;

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'date';

    const dayNum = document.createElement('div');
    dayNum.className = 'day-number';

    let dateStr = '';
    let displayDay = 0;

    if (i < startDay) {
      displayDay = prevMonthLastDate - (startDay - 1 - i);
      const prevDate = new Date(year, month - 1, displayDay);
      dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
      cell.classList.add('other-month');
    } else if (i >= startDay + daysInMonth) {
      displayDay = i - (startDay + daysInMonth) + 1;
      const nextDate = new Date(year, month + 1, displayDay);
      dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
      cell.classList.add('other-month');
    } else {
      displayDay = i - startDay + 1;
      const thisDate = new Date(year, month, displayDay);
      dateStr = `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    }

    dayNum.textContent = displayDay;
    cell.appendChild(dayNum);

    if (dateStr === todayStr) {
      cell.classList.add('today');
    }

    const dayData = calendarData.find(entry => entry.date === dateStr);
    if (dayData) {
      if (dayData.expense) {
        const expense = document.createElement('span');
        expense.className = 'expense';
        expense.textContent = dayData.expense;
        cell.appendChild(expense);
      }
      if (dayData.hours) {
        const hours = document.createElement('span');
        hours.className = 'hours';
        hours.textContent = dayData.hours;
        cell.appendChild(hours);
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'date-overlay';
    cell.appendChild(overlay);

    const links = document.createElement('div');
    links.className = 'date-links';
    links.innerHTML = `
      <a href="#detail-${dateStr}" class="detail-link">
        <span class="link-main">詳細</span><br>
        <span class="link-sub">(編集)</span>
      </a>`;
    cell.appendChild(links);

    cell.dataset.date = dateStr;
    cell.addEventListener('click', (e) => {
      console.log('Clicked date:', e.currentTarget.dataset.date);
    });

    calendarEl.appendChild(cell);
  }
}

function handlePrevMonth() {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar(currentYear, currentMonth);
}

function handleNextMonth() {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar(currentYear, currentMonth);
}

export function initializeCalendar() {
  if (!calendarEl || !yearEl || !monthEl || !prevBtn || !nextBtn) {
    console.error('カレンダーの描画に必要なDOM要素が見つかりません。');
    return;
  }

  loadCalendarData(); // ← 最初にデータを取得して描画
  prevBtn.addEventListener('click', handlePrevMonth);
  nextBtn.addEventListener('click', handleNextMonth);
}

document.addEventListener('calendar:refresh', () => {
  loadCalendarData(); // ← サーバーから再取得して再描画
});