// Элементы DOM
const grid = document.getElementById('gameGrid');
const infoSeedlings = document.getElementById('seedlings');
const infoCoins = document.getElementById('coins');
const infoScore = document.getElementById('score');
const levelProgress = document.getElementById('levelProgress');
const toast = document.getElementById('toast');
const loading = document.getElementById('loading');
const celebration = document.getElementById('celebration');

let level = 1;
let seedlings = 5; // Начальное количество саженцев
let coins = 0; // Монеты
let score = 0;
const gridSize = 6;
let gameState = [];

// Звуковые эффекты
const plantSound = new Audio('assets/audio/plant.mp3');
const growSound = new Audio('assets/audio/grow.mp3');
const levelUpSound = new Audio('assets/audio/levelup.mp3');
const buySound = new Audio('assets/audio/buy.mp3');

// Загрузка сохранённого прогресса
function loadProgress() {
    const saved = localStorage.getItem('forestGameProgress');
    if (saved) {
        const data = JSON.parse(saved);
        level = data.level || 1;
        seedlings = data.seedlings || 5;
        coins = data.coins || 0;
        score = data.score || 0;
    }
    startLevel();
}

// Сохранение прогресса
function saveProgress() {
    const data = { level, seedlings, coins, score };
    localStorage.setItem('forestGameProgress', JSON.stringify(data));
}

// Инициализация уровня
function startLevel() {
    grid.innerHTML = '';
    gameState = [];
    const fertileCount = Math.min(3 + level, gridSize * gridSize - 1);
    const fertileSpots = generateFertileSpots(fertileCount);

    for (let i = 0; i < gridSize; i++) {
        gameState[i] = [];
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (fertileSpots.some(([x, y]) => x === i && y === j)) {
                cell.classList.add('fertile');
                cell.textContent = ''; // Пустая плодородная земля
            } else {
                cell.classList.add('unfertile');
                cell.textContent = ''; // Пустая неплодородная земля с градиентом
            }
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleClick);
            grid.appendChild(cell);
            gameState[i][j] = { fertile: !!cell.classList.contains('fertile'), content: cell.classList.contains('fertile') ? 'fertile' : 'unfertile' };
        }
    }
    seedlings = Math.max(3, 5 - level);
    coins = Math.max(0, coins - (5 - seedlings) * 2);
    updateProgress();
    updateInfo();
    saveProgress();
}

// Генерация плодородных клеток
function generateFertileSpots(count) {
    const spots = [];
    while (spots.length < count) {
        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);
        if (!spots.some(([sx, sy]) => sx === x && sy === y)) {
            spots.push([x, y]);
        }
    }
    return spots;
}

// Обработка клика
function handleClick(event) {
    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);
    const cell = event.target;

    if (seedlings > 0 && gameState[row][col].fertile && gameState[row][col].content === 'fertile') {
        cell.textContent = '🌱'; // Ростки
        gameState[row][col].content = 'sapling';
        seedlings--;
        plantSound.play();
        setTimeout(() => {
            cell.textContent = '🌲'; // Маленькие деревья
            cell.classList.add('small-tree');
            gameState[row][col].content = 'small-tree';
            growSound.play();
            setTimeout(() => {
                cell.textContent = '🌳'; // Большие деревья
                cell.classList.remove('small-tree');
                cell.classList.add('tree');
                gameState[row][col].content = 'tree';
                score += 5;
                coins += 5;
                checkLevelEnd();
                updateProgress();
                updateInfo();
            }, 2000); // Ещё 2 секунды до больших деревьев
        }, 2000); // 2 секунды до маленьких деревьев
    }
}

// Проверка конца уровня
function checkLevelEnd() {
    const treesLeft = gameState.flat().filter(cell => cell.content === 'tree').length;
    if (treesLeft >= 3 + level) {
        levelUp();
    }
}

// Переход на новый уровень с анимацией
function levelUp() {
    loading.classList.remove('hidden');
    levelUpSound.play();
    setTimeout(() => {
        loading.classList.add('hidden');
        level++;
        seedlings = Math.max(3, 5 - level);
        coins = Math.max(0, coins - (5 - seedlings) * 2);
        score += 10;
        celebrateLevelUp();
        saveProgress();
    }, 2000); // 2 секунды "загрузки"
}

// Празднование прохождения уровня
function celebrateLevelUp() {
    celebration.classList.remove('hidden');
    celebration.innerHTML = '<span>Уровень пройден! ⭐</span>';
    // Фейерверк из звёздочек
    for (let i = 0; i < 20; i++) { // Увеличил количество частиц для эффектного фейерверка
        const star = document.createElement('span');
        star.textContent = '⭐';
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        star.style.animationDelay = `${Math.random() * 1}s`;
        celebration.appendChild(star);
    }
    // Мягкая вибрация на протяжении анимации (200 мс каждые 500 мс)
    if ('vibrate' in navigator) {
        vibrateDuringFireworks();
    }
    setTimeout(() => {
        celebration.classList.add('hidden');
        celebration.innerHTML = '';
        startLevel();
    }, 3000); // 3 секунды на празднование
}

// Функция для вибрации во время фейерверка
function vibrateDuringFireworks() {
    let vibrationInterval = setInterval(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate(200); // Мягкая вибрация 200 мс
        }
    }, 500); // Повтор каждые 500 мс
    setTimeout(() => {
        clearInterval(vibrationInterval); // Останавливаем вибрацию после 3 секунд
        if ('vibrate' in navigator) {
            navigator.vibrate(0); // Останавливаем вибрацию
        }
    }, 3000);
}

// Докупка саженцев за монеты
function buySeedlings() {
    if (coins >= 2) {
        coins -= 2;
        seedlings += 1;
        buySound.play();
        showToast('Саженец куплен за 2 💰!');
        updateInfo();
    } else {
        showToast('Недостаточно монет! Нужно 2 💰 за саженец.');
    }
}

// Показ тоста
function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Обновление прогресса уровня
function updateProgress() {
    const treesNeeded = 3 + level;
    const treesLeft = gameState.flat().filter(cell => cell.content === 'tree').length;
    levelProgress.value = treesLeft;
    levelProgress.max = treesNeeded;
}

// Обновление информации
function updateInfo() {
    infoSeedlings.textContent = seedlings;
    infoCoins.textContent = coins;
    infoScore.textContent = score;
    document.getElementById('current-level').textContent = `Уровень: ${level}`;
}

// Старт игры
loadProgress();