// Элементы DOM
const grid = document.getElementById('gameGrid');
const infoSeedlings = document.getElementById('seedlings');
const infoCoins = document.getElementById('coins');
const infoScore = document.getElementById('score');
const levelProgress = document.getElementById('levelProgress');
const toast = document.getElementById('toast');
const loading = document.getElementById('loading');
const celebration = document.getElementById('celebration');
const rainContainer = document.querySelector('.rain');
const snowContainer = document.querySelector('.snow');
const newsText = document.getElementById('news-text');

let level = 1;
let seedlings = 5; // Начальное количество саженцев
let coins = 0; // Монеты
let score = 0;
let comboMultiplier = 1; // Множитель комбо
let lastPlantTime = 0; // Время последней посадки для комбо
const gridSize = 6;
let gameState = [];
let weatherTimeout = null;
let comboTimeout = null;

// Звуковые эффекты (предварительная загрузка для устранения задержек)
const plantSound = new Audio('assets/audio/plant.mp3');
const growSound = new Audio('assets/audio/grow.mp3');
const levelUpSound = new Audio('assets/audio/levelup.mp3');
const buySound = new Audio('assets/audio/buy.mp3');
const thunderSound = new Audio('assets/audio/thunder.mp3');
const rainSound = new Audio('assets/audio/rain.mp3');
const blizzardSound = new Audio('assets/audio/blizzard.mp3');

// Уменьшение громкости звука покупки
buySound.volume = 0.5; // Уменьшаем громкость в два раза
buySound.preload = 'auto'; // Предварительная загрузка
plantSound.preload = 'auto';
growSound.preload = 'auto';
levelUpSound.preload = 'auto';
thunderSound.preload = 'auto';
rainSound.preload = 'auto';
blizzardSound.preload = 'auto';

// Новости лесничества
const news = [
    "Учёные обнаружили новый вид редких деревьев в Амазонских джунглях!",
    "Международная организация по охране лесов объявила о посадке 1 миллиона деревьев в Африке.",
    "Лесные пожары в Калифорнии удалось остановить благодаря усилиям пожарных и экологов.",
    "В России запущена программа рекультивации лесов после вырубки — уже восстановлено 50 гектаров.",
    "Экологи Австралии призывают к защите коал, чьи леса страдают от изменения климата.",
    "В Канаде началась акция по высадке деревьев для восстановления лесов после урагана.",
    "Новый международный договор направлен на снижение вырубки тропических лесов к 2030 году.",
    "Учёные разработали технологию ускоренного роста деревьев для лесовосстановления в Европе.",
    "В Индии местные сообщества успешно восстановили 10 тысяч гектаров деградированных лесов.",
    "Программа ООН по окружающей среде финансирует проекты по защите лесов в Южной Америке."
];

// Обновление новостей каждые 10 секунд
function updateNews() {
    const randomNews = news[Math.floor(Math.random() * news.length)];
    newsText.textContent = randomNews;
    setTimeout(updateNews, 10000);
}

// Загрузка сохранённого прогресса
function loadProgress() {
    const saved = localStorage.getItem('forestGameProgress');
    if (saved) {
        const data = JSON.parse(saved);
        level = data.level || 1;
        seedlings = data.seedlings || 5;
        coins = data.coins || 0;
        score = data.score || 0;
        comboMultiplier = data.comboMultiplier || 1;
    }
    startLevel();
    updateNews();
}

// Сохранение прогресса
function saveProgress() {
    const data = { level, seedlings, coins, score, comboMultiplier };
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
    startWeatherEvents();
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
    const now = Date.now();

    if (seedlings > 0 && gameState[row][col].fertile && gameState[row][col].content === 'fertile') {
        cell.textContent = '🌱'; // Ростки
        gameState[row][col].content = 'sapling';
        seedlings--;
        plantSound.play();
        checkCombo(now);
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
                score += 5 * comboMultiplier;
                coins += 5 * comboMultiplier;
                checkLevelEnd();
                updateProgress();
                updateInfo();
                resetCombo();
            }, 20000); // 20 секунд до больших деревьев
        }, 20000); // 20 секунд до маленьких деревьев
    } else if (gameState[row][col].content === 'lightning') {
        cell.textContent = ''; // Убираем молнию
        cell.classList.remove('lightning');
        gameState[row][col].content = 'fertile';
        stopWeather();
    } else if (gameState[row][col].content === 'frozen') {
        cell.textContent = ''; // Убираем снежинку
        cell.classList.remove('frozen');
        gameState[row][col].content = 'fertile';
        stopWeather();
    }
}

// Проверка комбо
function checkCombo(currentTime) {
    if (currentTime - lastPlantTime <= 2000) { // Если посадка в течение 2 секунд после предыдущей
        comboMultiplier *= 2;
        showComboToast(`Комбо x${comboMultiplier}!`);
    } else {
        resetCombo();
    }
    lastPlantTime = currentTime;
}

// Сброс комбо
function resetCombo() {
    comboMultiplier = 1;
    if (comboTimeout) clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        comboMultiplier = 1; // Сброс через 5 секунд без действий
    }, 5000);
}

// Показ тоста комбо
function showComboToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
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
    celebration.innerHTML = '<span>Уровень пройден! 🎉</span>';
    // Фейерверк из эмодзи
    for (let i = 0; i < 30; i++) { // Увеличенное количество частиц для эффектного фейерверка
        const emoji = ['🎉', '🎊', '🪄'][Math.floor(Math.random() * 3)];
        const particle = document.createElement('span');
        particle.textContent = emoji;
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.top = `${Math.random() * 100}vh`;
        particle.style.animationDelay = `${Math.random() * 1}s`;
        celebration.appendChild(particle);
    }
    // Одна мягкая вибрация
    if ('vibrate' in navigator) {
        navigator.vibrate(200); // Мягкая вибрация 200 мс
    }
    setTimeout(() => {
        celebration.classList.add('hidden');
        celebration.innerHTML = '';
        startLevel();
    }, 3000); // 3 секунды на празднование
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

// Старт погодных событий
function startWeatherEvents() {
    if (weatherTimeout) clearTimeout(weatherTimeout);
    weatherTimeout = setTimeout(checkWeather, 5000); // Проверяем погоду каждые 5 секунд
}

// Проверка погоды (редкие события)
function checkWeather() {
    const chance = Math.random();
    if (chance < 0.10) { // 10% шанс на событие (увеличен шанс)
        const eventType = Math.random() < 0.5 ? 'lightning' : 'frozen';
        const fertileCells = gameState.flat().filter(cell => cell.fertile && (cell.content === 'sapling' || cell.content === 'small-tree'));
        if (fertileCells.length > 0) {
            const randomCell = fertileCells[Math.floor(Math.random() * fertileCells.length)];
            const [row, col] = [randomCell.row, randomCell.col];
            const cell = grid.children[row * gridSize + col];
            if (eventType === 'lightning') {
                cell.textContent = '⚡';
                cell.classList.add('lightning');
                gameState[row][col].content = 'lightning';
                showRain();
            } else {
                cell.textContent = '❄';
                cell.classList.add('frozen');
                gameState[row][col].content = 'frozen';
                showSnow();
            }
        }
    }
    weatherTimeout = setTimeout(checkWeather, 5000); // Повторяем проверку
}

// Имитация дождя
function showRain() {
    rainContainer.innerHTML = '';
    thunderSound.play();
    rainSound.play();
    for (let i = 0; i < 50; i++) {
        const drop = document.createElement('span');
        drop.className = 'drop';
        drop.textContent = '💧';
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDelay = `${Math.random() * 2}s`;
        rainContainer.appendChild(drop);
    }
    setTimeout(stopWeather, 5000); // Дождь длится 5 секунд
}

// Имитация снега
function showSnow() {
    snowContainer.innerHTML = '';
    blizzardSound.play();
    for (let i = 0; i < 50; i++) {
        const flake = document.createElement('span');
        flake.className = 'flake';
        flake.textContent = '❄';
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDelay = `${Math.random() * 2}s`;
        snowContainer.appendChild(flake);
    }
    setTimeout(stopWeather, 5000); // Снег длится 5 секунд
}

// Остановка погодных эффектов
function stopWeather() {
    rainContainer.innerHTML = '';
    snowContainer.innerHTML = '';
    thunderSound.pause();
    thunderSound.currentTime = 0;
    rainSound.pause();
    rainSound.currentTime = 0;
    blizzardSound.pause();
    blizzardSound.currentTime = 0;
}

// Старт игры
loadProgress();