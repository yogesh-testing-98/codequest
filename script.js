'use strict';

const LEVELS = [
  { id: 1, title: 'First steps', icon: '👣', topic: 'Sequence', description: 'Move four tiles to reach the flag.', lessonTitle: 'Sequence: one instruction at a time', lessonText: 'Python runs instructions from top to bottom. Each move() command moves the robot one tile to the right.', tip: 'Four steps forward means four move() calls.', start: [0, 2], goal: [4, 2], walls: [], coins: [], commands: ['move()'], starter: 'move()\nmove()\nmove()\nmove()', solution: 'move()\nmove()\nmove()\nmove()', hint: 'The flag is four tiles to the right. Use move() four times.', allowed: ['move'] },
  { id: 2, title: 'Collect the coin', icon: '🪙', topic: 'Commands', description: 'Collect the coin and then reach the flag.', lessonTitle: 'Commands: do things in order', lessonText: 'A program is a sequence of instructions. Collect the coin on the way to the goal.', tip: 'The robot moves along the middle row.', start: [0, 2], goal: [5, 2], walls: [], coins: [[2, 2]], commands: ['move()', 'collect_coin()'], starter: 'move()\nmove()\ncollect_coin()\nmove()\nmove()\nmove()', solution: 'move()\nmove()\ncollect_coin()\nmove()\nmove()\nmove()', hint: 'Move onto the coin at column 2, collect it, then continue.', allowed: ['move', 'collect_coin'] },
  { id: 3, title: 'Avoid the wall', icon: '🧱', topic: 'Turns', description: 'Navigate around the wall to reach the flag.', lessonTitle: 'Turning: change your direction', lessonText: 'The robot starts facing right. turn_down() and turn_up() change the direction for the next move.', tip: 'Go up to row 1, cross above the wall, then go down to the flag.', start: [0, 2], goal: [5, 2], walls: [[2, 2]], coins: [], commands: ['move()', 'turn_up()', 'turn_down()'], starter: 'move()\nturn_up()\nmove()\nmove()\nmove()\nmove()\nmove()\nturn_down()\nmove()', solution: 'move()\nturn_up()\nmove()\nmove()\nmove()\nmove()\nmove()\nturn_down()\nmove()', hint: 'Go one tile right, turn up, cross above the wall, then turn down at the far right.', allowed: ['move', 'turn_up', 'turn_down'] },
  { id: 4, title: 'Loop it!', icon: '🔁', topic: 'Loops', description: 'Use a for loop to repeat moves.', lessonTitle: 'Loops: repeat without copying', lessonText: 'A for loop repeats an indented block. range(4) runs the block four times.', tip: 'for step in range(4): followed by an indented move().', start: [0, 2], goal: [4, 2], walls: [], coins: [], commands: ['move()', 'for ... in range(...)'], starter: 'for step in range(4):\n    move()', solution: 'for step in range(4):\n    move()', hint: 'Use a for loop with range(4), then indent move() underneath it.', allowed: ['move', 'for'] },
  { id: 5, title: 'Loop challenge', icon: '⚡', topic: 'Loops', description: 'Collect the coin using a loop, then finish.', lessonTitle: 'Loops: repeat a useful action', lessonText: 'Loops are helpful when the same action must happen several times. Collect the coin after moving onto its tile.', tip: 'Move twice in a loop, collect, then move three more times.', start: [0, 2], goal: [5, 2], walls: [], coins: [[2, 2]], commands: ['move()', 'collect_coin()', 'for ... in range(...)'], starter: 'for step in range(2):\n    move()\ncollect_coin()\nfor step in range(3):\n    move()', solution: 'for step in range(2):\n    move()\ncollect_coin()\nfor step in range(3):\n    move()', hint: 'Use range(2) to reach the coin, collect it, then use range(3) to reach the flag.', allowed: ['move', 'collect_coin', 'for'] },
  { id: 6, title: 'Your first function', icon: '🧩', topic: 'Functions', description: 'Create and call a function to move the robot.', lessonTitle: 'Functions: give a set of steps a name', lessonText: 'A function groups instructions under a name. Define a function with def, indent its body, then call it.', tip: 'Define walk(): with four move() calls inside, then call walk().', start: [0, 2], goal: [4, 2], walls: [], coins: [], commands: ['move()', 'def walk():', 'walk()'], starter: 'def walk():\n    for step in range(4):\n        move()\n\nwalk()', solution: 'def walk():\n    for step in range(4):\n        move()\n\nwalk()', hint: 'Define walk() with a loop inside it. Then call walk() on a new line.', allowed: ['move', 'for', 'def'] }
];

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'codequest-progress-v1';
let currentLevelId = 1;
let position = [0, 2];
let direction = 'right';
let collected = new Set();
let isRunning = false;
let activeWorker = null;
let runTimer = null;
let toastTimer = null;
let progress = loadProgress();

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { completed: Array.isArray(parsed.completed) ? parsed.completed.filter(Number.isInteger) : [], stars: Number.isFinite(parsed.stars) ? parsed.stars : 0 };
  } catch { return { completed: [], stars: 0 }; }
}
function saveProgress() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {} }
function levelData(id = currentLevelId) { return LEVELS.find(level => level.id === id) || LEVELS[0]; }
function isUnlocked(id) { return id === 1 || progress.completed.includes(id - 1); }
function coordKey(point) { return `${point[0]},${point[1]}`; }
function showToast(text) { const toast = $('toast'); toast.textContent = text; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2400); }
function setMessage(text, type = '') { const box = $('gameMessage'); box.textContent = text; box.className = `game-message ${type}`.trim(); }
function updateProgressUI() {
  const done = progress.completed.length;
  $('headerProgressText').textContent = `${done} / ${LEVELS.length} levels`;
  $('headerProgress').style.width = `${done / LEVELS.length * 100}%`;
  $('heroCompleted').textContent = done;
  $('heroStars').textContent = progress.stars;
  $('levelSummary').textContent = `${done} of ${LEVELS.length} completed`;
  renderLevelCards();
}
function renderLevelCards() {
  $('levelCards').innerHTML = '';
  LEVELS.forEach(level => {
    const unlocked = isUnlocked(level.id);
    const completed = progress.completed.includes(level.id);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card${currentLevelId === level.id ? ' active' : ''}${unlocked ? '' : ' locked'}`;
    card.disabled = !unlocked;
    card.innerHTML = `<div class="level-top"><span class="level-icon">${level.icon}</span><span class="level-number">LEVEL ${String(level.id).padStart(2, '0')}</span></div><h3>${level.title}</h3><p>${level.description}</p><div class="level-bottom"><span>${completed ? '✓ Completed' : unlocked ? level.topic : '🔒 Locked'}</span><span class="stars">${completed ? '★ ★ ★' : unlocked ? '○ ○ ○' : '—'}</span></div>`;
    card.addEventListener('click', () => selectLevel(level.id));
    $('levelCards').appendChild(card);
  });
}
function selectLevel(id) {
  if (!isUnlocked(id)) { showToast('Complete the previous level to unlock this one.'); return; }
  stopExecution(); currentLevelId = id; const level = levelData();
  $('gameTitle').textContent = `Level ${level.id}: ${level.title}`;
  $('gameDescription').textContent = level.description;
  $('lessonTitle').textContent = level.lessonTitle;
  $('lessonText').textContent = level.lessonText;
  $('lessonTip').textContent = level.tip;
  $('codeEditor').value = level.starter;
  $('commandChips').innerHTML = '';
  level.commands.forEach(command => { const chip = document.createElement('span'); chip.className = 'command-chip'; chip.textContent = command; $('commandChips').appendChild(chip); });
  $('showSolutionButton').textContent = 'Show example';
  resetGame(); renderLevelCards();
  
history.replaceState(null, '', location.pathname + location.search);

}
function resetGame() {
  stopExecution(); const level = levelData(); position = [...level.start]; direction = 'right'; collected = new Set();
  setMessage('Ready when you are. Write code, then press Run.'); renderBoard();
}
function stopExecution() {
  if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
  if (runTimer) { clearTimeout(runTimer); runTimer = null; }
  isRunning = false; $('runButton').disabled = false; $('runButton').textContent = '▶ Run code';
}
function renderBoard() {
  const level = levelData(); const grid = $('gameGrid'); grid.innerHTML = '';
  for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) {
    const cell = document.createElement('div'); cell.className = 'tile'; const key = `${x},${y}`;
    if (level.walls.some(point => coordKey(point) === key)) { cell.classList.add('wall'); cell.textContent = '🧱'; }
    if (level.coins.some(point => coordKey(point) === key) && !collected.has(key)) { cell.classList.add('coin'); cell.textContent = '🪙'; }
    if (coordKey(level.goal) === key) { cell.classList.add('goal'); if (coordKey(position) !== key) cell.textContent = '🏁'; }
    if (coordKey(position) === key) { cell.classList.add('robot'); cell.textContent = direction === 'right' ? '🤖' : direction === 'up' ? '🤖⬆️' : '🤖⬇️'; }
    grid.appendChild(cell);
  }
  $('positionLabel').textContent = `Position: (${position[0]}, ${position[1]})`;
}
function parsePythonSubset(source, level) {
  // The browser worker uses the real Python runtime (Pyodide). This check is a helpful
  // front-end guard, not a Python sandbox; execution isolation and timeout are in worker.
  if (!source.trim()) throw new Error('Write some code before pressing Run.');
  if (source.length > 8000) throw new Error('Keep each solution under 8,000 characters for this learning game.');
  if (/\b(import|from|open|eval|exec|compile|input|globals|locals|__import__)\b/.test(source)) throw new Error('This game only needs robot commands. Imports, file access and dynamic execution are disabled.');
  if (/\b(while|class|lambda|async|await|yield|try|except|with|raise|del|global|nonlocal)\b/.test(source)) throw new Error('That Python feature is not part of this level yet. Try the commands shown below the editor.');
  if (!level.allowed.includes('for') && /^\s*for\b/m.test(source)) throw new Error('Loops unlock in Level 4.');
  if (!level.allowed.includes('def') && /^\s*def\b/m.test(source)) throw new Error('Functions unlock in Level 6.');
  if (!level.allowed.includes('turn_up') && /turn_(up|down)\s*\(/.test(source)) throw new Error('Turning unlocks in Level 3.');
  if (!level.allowed.includes('collect_coin') && /collect_coin\s*\(/.test(source)) throw new Error('Coin collection unlocks in Level 2.');
}
function createWorker() {
  const worker = new Worker('python-worker.js');
  return worker;
}
function runCode() {
  if (isRunning) return;
  const level = levelData(); const source = $('codeEditor').value;
  try { parsePythonSubset(source, level); } catch (error) { setMessage(error.message, 'error'); return; }
  resetGame(); isRunning = true; $('runButton').disabled = true; $('runButton').textContent = '⏳ Running…'; setMessage('Starting Python runtime…');
  try { activeWorker = createWorker(); } catch { stopExecution(); setMessage('Could not start the Python worker. Open the project through a local web server, not directly as a file.', 'error'); return; }
  let finished = false;
  runTimer = setTimeout(() => { if (finished) return; finished = true; stopExecution(); setMessage('Python is taking too long to start. Check your internet connection and try again.', 'error'); }, 30000);
  activeWorker.onmessage = async (event) => {
    const data = event.data;
    if (data.type === 'ready') {
      if (runTimer) clearTimeout(runTimer);
      runTimer = setTimeout(() => { if (finished) return; finished = true; stopExecution(); setMessage('Time limit reached. Check for an infinite loop and try again.', 'error'); }, 4000);
      setMessage('Python is ready. Running your solution…'); activeWorker.postMessage({ type: 'run', code: source });
    }
    else if (data.type === 'result') {
      if (finished) return; finished = true; clearTimeout(runTimer); runTimer = null;
      try {
        if (data.error) { stopExecution(); setMessage(data.error, 'error'); return; }
        if (!Array.isArray(data.commands)) { stopExecution(); setMessage('The Python worker returned an unexpected result.', 'error'); return; }
        if (data.commands.length > 100) { stopExecution(); setMessage('Your solution generated too many actions. Use a shorter solution.', 'error'); return; }
        await playCommands(data.commands, level);
      } catch (error) { stopExecution(); setMessage(`Game error: ${error.message}`, 'error'); }
    } else if (data.type === 'boot-error') {
      if (finished) return; finished = true; clearTimeout(runTimer); runTimer = null; stopExecution(); setMessage(`Python could not load. Check your internet connection and local server. Details: ${data.error}`, 'error');
    }
  };
  activeWorker.onerror = (event) => { if (finished) return; finished = true; clearTimeout(runTimer); runTimer = null; stopExecution(); setMessage(`Python worker error: ${event.message || 'unknown error'}`, 'error'); };
}
async function playCommands(commands, level) {
  for (const action of commands) {
    if (!isRunning) return;
    if (!['move', 'turn_up', 'turn_down', 'collect_coin'].includes(action)) { stopExecution(); setMessage(`Unknown robot action: ${action}`, 'error'); return; }
    if (action === 'turn_up') direction = 'up';
    else if (action === 'turn_down') direction = 'down';
    else if (action === 'move') {
      const next = [...position]; if (direction === 'right') next[0]++; else if (direction === 'up') next[1]--; else next[1]++;
      if (next[0] < 0 || next[0] > 5 || next[1] < 0 || next[1] > 4) { stopExecution(); setMessage('The robot hit the edge of the world. Reset and try another route.', 'error'); return; }
      if (level.walls.some(point => coordKey(point) === coordKey(next))) { stopExecution(); setMessage('Crash! The robot hit a wall. Try a different route.', 'error'); return; }
      position = next;
    } else if (action === 'collect_coin') {
      const key = coordKey(position); const coinExists = level.coins.some(point => coordKey(point) === key);
      if (!coinExists || collected.has(key)) { stopExecution(); setMessage('There is no uncollected coin under the robot. Move onto a coin first.', 'error'); return; }
      collected.add(key);
    }
    renderBoard(); await new Promise(resolve => setTimeout(resolve, 240));
  }
  if (!isRunning) return;
  const atGoal = coordKey(position) === coordKey(level.goal);
  const allCoins = level.coins.every(point => collected.has(coordKey(point)));
  stopExecution();
  if (atGoal && allCoins) {
    const wasCompleted = progress.completed.includes(level.id);
    if (!wasCompleted) { progress.completed.push(level.id); progress.completed.sort((a,b) => a-b); progress.stars += 3; saveProgress(); updateProgressUI(); }
    setMessage(`🎉 Level ${level.id} complete! ${wasCompleted ? 'Great practice — you can replay it anytime.' : 'You earned 3 stars and unlocked your next level.'}`, 'success');
    showToast(wasCompleted ? 'Level replay complete!' : `Level ${level.id} cleared! +3 stars`);
  } else if (atGoal && !allCoins) setMessage('You reached the flag, but you missed a coin. Collect every coin first.', 'error');
  else setMessage('The robot finished running, but has not reached the flag. Adjust your code and try again.');
}
function showHint() { const level = levelData(); setMessage(`💡 Hint: ${level.hint}`); }
function showExample() { const level = levelData(); const button = $('showSolutionButton'); if (button.textContent === 'Hide example') { $('codeEditor').value = level.starter; button.textContent = 'Show example'; } else { $('codeEditor').value = level.solution; button.textContent = 'Hide example'; showToast('Example loaded into the editor.'); } updateLineNumbers(); }
function updateLineNumbers() { const count = $('codeEditor').value.split('\n').length; $('lineNumbers').innerHTML = Array.from({length: Math.max(4, count)}, (_,i) => i+1).join('<br>'); }

$('runButton').addEventListener('click', runCode);
$('resetButton').addEventListener('click', resetGame);
$('hintButton').addEventListener('click', showHint);
$('showSolutionButton').addEventListener('click', showExample);
$('continueButton').addEventListener('click', () => { const next = LEVELS.find(level => isUnlocked(level.id) && !progress.completed.includes(level.id)); selectLevel(next ? next.id : 1); });
$('codeEditor').addEventListener('input', updateLineNumbers);
$('codeEditor').addEventListener('keydown', (event) => {
  if (event.key === 'Tab') { event.preventDefault(); const field = event.currentTarget; const start = field.selectionStart; const end = field.selectionEnd; field.setRangeText('    ', start, end, 'end'); updateLineNumbers(); }
});
updateProgressUI(); selectLevel(1); updateLineNumbers();
