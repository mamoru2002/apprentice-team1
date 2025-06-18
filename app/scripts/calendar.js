const workData = [
  { date: '2025-06-01', expense: '¥1,560', hours: '6.5h' },
  { date: '2025-06-02', expense: '¥980', hours: '7h' },
  { date: '2025-06-04', expense: '¥440', hours: '3.4h' },
  { date: '2025-06-06', expense: '¥2,480', hours: '6.5h' },
];

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-index

function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar-dates');
  calendar.innerHTML = '';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const totalCells = 42;

  const prevMonthLastDate = new Date(year, month, 0).getDate();

  // 年月表示を更新
  document.getElementById('current-year').textContent = `${year}`;
  document.getElementById('current-month').textContent = `${month + 1}`;

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement('div');
    cell.className = 'date';

    const dayNum = document.createElement('div');
    dayNum.className = 'day-number';

    let dateStr = '';
    let displayDay = '';

    if (i < startDay) {
      // 前月
      displayDay = prevMonthLastDate - (startDay - 1 - i);
      dayNum.textContent = displayDay;
      cell.classList.add('other-month');
      const prevDate = new Date(year, month - 1, displayDay);
      dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    } else if (i >= startDay + daysInMonth) {
      // 翌月
      displayDay = i - (startDay + daysInMonth) + 1;
      dayNum.textContent = displayDay;
      cell.classList.add('other-month');
      const nextDate = new Date(year, month + 1, displayDay);
      dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    } else {
      // 今月
      displayDay = i - startDay + 1;
      dayNum.textContent = displayDay;
      const thisDate = new Date(year, month, displayDay);
      dateStr = `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(displayDay).padStart(2, '0')}`;
    }

    cell.appendChild(dayNum); // 先に日付を追加

    if (dateStr === todayStr) {
      cell.classList.add('today');
    }

    const dayData = workData.find((entry) => entry.date === dateStr);
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

    // ホバー時のグレーのオーバレイ要素を追加
    const overlay = document.createElement('div');
    overlay.className = 'date-overlay';
    cell.appendChild(overlay);

    // 編集・詳細リンクを追加
    const links = document.createElement('div');
    links.className = 'date-links';

    const detailLink = document.createElement('a');
    detailLink.href = `#detail-${dateStr}`;
    detailLink.className = 'detail-link';
    detailLink.innerHTML = `
      <span class="link-main">詳細</span><br>
      <span class="link-sub">(編集)</span>
    `;

    links.appendChild(detailLink);
    cell.appendChild(links);

    // 日付セルクリック時のイベント処理
    cell.dataset.date = dateStr;
    cell.addEventListener('click', (e) => {
      const clickedDate = e.currentTarget.dataset.date;
      console.log('Clicked date:', clickedDate);
    });

    calendar.appendChild(cell);
  }
}

renderCalendar(currentYear, currentMonth);

document.getElementById('prev-month').addEventListener('click', () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar(currentYear, currentMonth);
});

document.getElementById('next-month').addEventListener('click', () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar(currentYear, currentMonth);
});
