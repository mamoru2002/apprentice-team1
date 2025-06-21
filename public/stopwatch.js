let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;

export function start() {
  if (isRunning) return;
  isRunning = true;
  startTime = Date.now() - elapsedTime;
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    document.dispatchEvent(new CustomEvent('timeUpdate', { detail: { elapsedTime } }));
  }, 10);
  console.log('Stopwatch started');
}

export function stop() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  console.log('Stopwatch stopped. Elapsed:', elapsedTime);
  return elapsedTime;
}

export function reset() {
  if (isRunning) {
    clearInterval(timerInterval);
  }
  elapsedTime = 0;
  isRunning = false;
  document.dispatchEvent(new CustomEvent('timeUpdate', { detail: { elapsedTime } }));
  console.log('Stopwatch reset');
}

export function getCurrentElapsedTime() {
  return elapsedTime;
}
