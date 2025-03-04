// Основные элементы DOM
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
const finalScoreElement = document.getElementById('final-score');
const gameArea = document.getElementById('game-area');
const progressBar = document.getElementById('progress-bar');
const muteButton = document.getElementById('mute-button');
const pauseButton = document.getElementById('pause-button');
const shareVKButton = document.getElementById('share-vk');
const shareTelegramButton = document.getElementById('share-telegram');
const timerElement = document.getElementById('timer');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownTimer = document.getElementById('countdown-timer');

// Конфигурация игры
const config = {
    targetSpeed: 2000,        // Скорость движения мишеней в миллисекундах
    targetInterval: 1000,     // Интервал появления мишеней в миллисекундах
    targetSize: 60,           // Размер мишеней в пикселях
    gameDuration: 90,         // Длительность игры в секундах
    audioPath: 'assets/audio/your-track.mp3' // Путь к вашему аудиофайлу
};

// Состояние игры
let gameState = {
    isPlaying: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    targetsHit: 0,
    targetsMissed: 0,
    timeRemaining: config.gameDuration,
    audioContext: null,
    audioSource: null,
    audioBuffer: null,
    isMuted: false,
    isPaused: false,
    gameTimer: null,
    targetTimers: []
};

// Инициализация аудио
async function initAudio() {
    try {
        // Создаем аудио контекст
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Загружаем аудиофайл
        const response = await fetch(config.audioPath);
        const arrayBuffer = await response.arrayBuffer();
        gameState.audioBuffer = await gameState.audioContext.decodeAudioData(arrayBuffer);
        
        // Вычисляем длительность трека в секундах
        config.gameDuration = gameState.audioBuffer.duration;
        
        console.log('Аудио успешно загружено', `Длительность: ${config.gameDuration} сек`);
    } catch (error) {
        console.error('Ошибка при загрузке аудио:', error);
        alert('Не удалось загрузить аудиофайл. Пожалуйста, проверьте путь и формат файла.');
    }
}

// Воспроизведение аудио
function playAudio() {
    if (!gameState.audioContext || !gameState.audioBuffer) return;
    
    // Создаем источник звука
    gameState.audioSource = gameState.audioContext.createBufferSource();
    gameState.audioSource.buffer = gameState.audioBuffer;
    
    // Создаем анализатор для синхронизации с битами (можно реализовать в будущем)
    const analyser = gameState.audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    // Подключаем источник к анализатору, а затем к выходу
    gameState.audioSource.connect(analyser);
    analyser.connect(gameState.audioContext.destination);
    
    // Запускаем воспроизведение
    gameState.audioSource.start(0);
    
    // Устанавливаем обработчик окончания трека
    gameState.audioSource.onended = endGame;
}


// Остановка аудио
function stopAudio() {
    if (gameState.audioSource) {
        gameState.audioSource.stop();
        gameState.audioSource = null;
    }
}

// Включение/выключение звука
function toggleMute() {
    if (!gameState.audioContext) return;
    
    if (gameState.isMuted) {
        gameState.audioContext.resume();
        muteButton.textContent = 'Выключить звук';
    } else {
        gameState.audioContext.suspend();
        muteButton.textContent = 'Включить звук';
    }
    
    gameState.isMuted = !gameState.isMuted;
}

// Пауза/возобновление игры
function togglePause() {
    if (gameState.isPaused) {
        // Возобновляем игру
        gameState.isPaused = false;
        if (!gameState.isMuted && gameState.audioContext) {
            gameState.audioContext.resume();
        }
        pauseButton.textContent = 'Пауза';
        
        // Возобновляем таймер игры
        startGameTimer();
    } else {
        // Приостанавливаем игру
        gameState.isPaused = true;
        if (gameState.audioContext) {
            gameState.audioContext.suspend();
        }
        pauseButton.textContent = 'Продолжить';
        
        // Останавливаем таймер игры
        clearInterval(gameState.gameTimer);
    }
}

// Создание мишени
function createTarget() {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Создаем элемент мишени
    const target = document.createElement('div');
    target.classList.add('target');
    
    // Определяем случайную позицию мишени
    const maxX = gameArea.clientWidth - config.targetSize;
    const maxY = gameArea.clientHeight - config.targetSize;
    const posX = Math.floor(Math.random() * maxX);
    const posY = Math.floor(Math.random() * maxY);
    
    // Устанавливаем позицию мишени
    target.style.left = `${posX}px`;
    target.style.top = `${posY}px`;
    
    // Добавляем обработчик клика
    target.addEventListener('click', () => hitTarget(target));
    
    // Добавляем мишень в игровую область
    gameArea.appendChild(target);
    
    // Устанавливаем таймер исчезновения мишени
    const timer = setTimeout(() => {
        if (target.parentElement === gameArea) {
            // Мишень не была нажата
            missTarget();
            gameArea.removeChild(target);
        }
    }, config.targetSpeed);
    
    // Сохраняем таймер для возможной очистки при завершении игры
    gameState.targetTimers.push(timer);
}

// Обработка попадания по мишени
function hitTarget(target) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    // Увеличиваем счет и комбо
    gameState.targetsHit++;
    gameState.combo++;
    gameState.score += 10 * gameState.combo;
    
    // Обновляем максимальное комбо
    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }
    
    // Обновляем элементы интерфейса
    scoreElement.textContent = gameState.score;
    comboElement.textContent = gameState.combo;
    
    // Анимация попадания
    target.classList.add('hit');
    
    // Удаляем мишень после анимации
    setTimeout(() => {
        if (target.parentElement === gameArea) {
            gameArea.removeChild(target);
        }
    }, 300);
}

// Обработка промаха мишени
function missTarget() {
    if (!gameState.isPlaying) return;
    
    // Сбрасываем комбо и увеличиваем счетчик промахов
    gameState.combo = 0;
    gameState.targetsMissed++;
    
    // Обновляем элементы интерфейса
    comboElement.textContent = gameState.combo;
}

// Функция конвертации музыкальных тактов в секунды
function beatsToSeconds(beat, bpm, timeSignature) {
    // Вычисляем длительность одной доли в секундах
    const beatDuration = 60 / bpm;
    
    // Конвертируем музыкальную долю в секунды
    return beat * beatDuration;
}

// Обновленная функция загрузки временной шкалы
async function loadTargetTimeline(path) {
    try {
        const response = await fetch(path);
        const timeline = await response.json();
        
        // Конвертируем метки тактов в секунды
        timeline.targets = timeline.targets.map(target => ({
            ...target,
            time: beatsToSeconds(target.beat, timeline.bpm, timeline.time_signature)
        }));
        
        return timeline;
    } catch (error) {
        console.error('Ошибка загрузки временной шкалы:', error);
        return null;
    }
}

// Функция для синхронизированного создания мишеней
function syncTargetsWithMusic(timeline) {
    // Находим текущий аудио контекст
    const audioContext = gameState.audioContext;
    
    // Проходим по всем меткам времени
    timeline.targets.forEach(targetData => {
        // Создаем event для каждой метки времени
        const targetEvent = new CustomEvent('create-target', { 
            detail: targetData 
        });
        
        // Планируем событие создания мишени
        setTimeout(() => {
            document.dispatchEvent(targetEvent);
        }, targetData.time * 1000);
    });
}

// Обработчик события создания мишеней
document.addEventListener('create-target', (event) => {
    const targetData = event.detail;
    
    // Логика создания мишеней в зависимости от типа
    switch(targetData.type) {
        case 'stationary':
            createStationaryTarget(targetData);
            break;
        case 'moving':
            createMovingTarget(targetData);
            break;
        case 'burst':
            createBurstTargets(targetData);
            break;
    }
});

// Функция для создания статической мишени
function createStationaryTarget(targetData) {
    const target = document.createElement('div');
    target.classList.add('target', 'stationary');
    
    // Позиционирование относительно размеров экрана
    const x = targetData.x * gameArea.clientWidth;
    const y = targetData.y * gameArea.clientHeight;
    
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    
    target.addEventListener('click', () => hitTarget(target));
    gameArea.appendChild(target);
}

// Функция для создания движущейся мишени
function createMovingTarget(targetData) {
    const target = document.createElement('div');
    target.classList.add('target', 'moving');
    
    const startX = targetData.start_x * gameArea.clientWidth;
    const startY = targetData.start_y * gameArea.clientHeight;
    const endX = targetData.end_x * gameArea.clientWidth;
    const endY = targetData.end_y * gameArea.clientHeight;
    
    target.style.left = `${startX}px`;
    target.style.top = `${startY}px`;
    
    // Анимация движения
    target.animate([
        { transform: `translate(0, 0)` },
        { transform: `translate(${endX - startX}px, ${endY - startY}px)` }
    ], {
        duration: 2000,  // Длительность анимации
        easing: 'linear'
    });
    
    target.addEventListener('click', () => hitTarget(target));
    gameArea.appendChild(target);
}

// Функция для создания серии мишеней
function createBurstTargets(targetData) {
    for (let i = 0; i < targetData.count; i++) {
        const target = document.createElement('div');
        target.classList.add('target', 'burst');
        
        // Случайное позиционирование в указанной области
        const x = (0.4 + Math.random() * 0.2) * gameArea.clientWidth;
        const y = (0.4 + Math.random() * 0.2) * gameArea.clientHeight;
        
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        
        target.addEventListener('click', () => hitTarget(target));
        gameArea.appendChild(target);
    }
}

// Запуск игрового таймера
function startGameTimer() {
    // Сбрасываем предыдущий таймер, если он существует
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
    }
    
    // Сначала обновляем отображение таймера
    updateTimerDisplay();
    
    gameState.gameTimer = setInterval(() => {
        gameState.timeRemaining--;
        
        // Обновляем отображение таймера
        updateTimerDisplay();
        
        // Обновляем индикатор прогресса
        const progress = 100 - (gameState.timeRemaining / config.gameDuration * 100);
        progressBar.style.width = `${progress}%`;
    }, 1000);
}


function updateTimerDisplay() {
    // Обновляем текст таймера с округлением до целого
    timerElement.textContent = Math.round(gameState.timeRemaining);
    
    // Добавляем анимацию, когда времени мало (меньше 10 секунд)
    if (gameState.timeRemaining <= 10) {
        timerElement.parentElement.classList.add('low-time');
    } else {
        timerElement.parentElement.classList.remove('low-time');
    }
  }

// Запуск создания мишеней
function startTargetGeneration() {
    // Создаем первую мишень
    createTarget();
    
    // Запускаем интервал создания мишеней
    const targetInterval = setInterval(() => {
        if (!gameState.isPaused && gameState.isPlaying) {
            createTarget();
        }
    }, config.targetInterval);
    
    // Сохраняем интервал для возможной очистки при завершении игры
    gameState.targetTimers.push(targetInterval);
}

// Начало игры
// Добавьте async перед функцией
async function startGame() {
    // Переключаем экраны
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    endScreen.classList.add('hidden');
    
    // Добавляем обратный отсчет
    await startCountdown();
    
    // Сбрасываем состояние игры
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.targetsHit = 0;
    gameState.targetsMissed = 0;
    gameState.timeRemaining = config.gameDuration;
    gameState.isPaused = false;
    gameState.isMuted = false;
    
    // Обновляем элементы интерфейса
    scoreElement.textContent = gameState.score;
    comboElement.textContent = gameState.combo;
    progressBar.style.width = '0%';
    
    // Очищаем все мишени из предыдущей игры
    gameArea.innerHTML = '';
    
    // Очищаем все таймеры из предыдущей игры
    gameState.targetTimers.forEach(timer => clearTimeout(timer));
    gameState.targetTimers = [];
    
    // Загружаем временную шкалу
    const timeline = await loadTargetTimeline('assets/targets-timeline.json');
    
    // Запускаем игровые компоненты
    playAudio();
    startGameTimer();
    
    // Запускаем создание мишеней
    if (timeline) {
        syncTargetsWithMusic(timeline);
    } else {
        // Если timeline не загрузился, используем старый метод
        startTargetGeneration();
    }
}

// Функция для обратного отсчета
function startCountdown() {
    return new Promise((resolve) => {
        countdownOverlay.style.display = 'flex';
        
        const countdownValues = [3, 2, 1, 'Старт!'];
        let index = 0;
        
        function updateCountdown() {
            if (index < countdownValues.length) {
                // Сбрасываем анимацию
                countdownTimer.style.animation = 'none';
                countdownTimer.offsetHeight; // Триггер перерисовки
                
                // Устанавливаем текст
                countdownTimer.textContent = countdownValues[index];
                
                // Возвращаем анимацию
                countdownTimer.style.animation = 'countdown 1s linear forwards';
                
                index++;
                
                // Планируем следующее обновление через 1 секунду
                setTimeout(updateCountdown, 1000);
            } else {
                countdownOverlay.style.display = 'none';
                resolve();
            }
        }
        
        // Запускаем первый цикл
        updateCountdown();
    });
}

// Окончание игры
function endGame() {
  if (!gameState.isPlaying) return;
  
  // Устанавливаем флаг окончания игры
  gameState.isPlaying = false;
  
  // Останавливаем аудио
  stopAudio();
  
  // Очищаем все таймеры
  clearInterval(gameState.gameTimer);
  gameState.targetTimers.forEach(timer => clearTimeout(timer));
  gameState.targetTimers = [];
  
  // Переключаем экраны
  gameScreen.classList.add('hidden');
  endScreen.classList.remove('hidden');
  
  // Вычисляем дополнительную статистику
  const accuracy = gameState.targetsHit / (gameState.targetsHit + gameState.targetsMissed) * 100 || 0;
  
  // Создаем HTML для отображения подробной статистики
  const detailedStats = `
      <div class="stat-item">Очки: <span class="stat-value">${gameState.score}</span></div>
      <div class="stat-item">Макс. комбо: <span class="stat-value">${gameState.maxCombo}x</span></div>
      <div class="stat-item">Точность: <span class="stat-value">${accuracy.toFixed(1)}%</span></div>
      <div class="stat-item">Попаданий: <span class="stat-value">${gameState.targetsHit}</span></div>
  `;
  
  // Обновляем финальный счет с подробной статистикой
  finalScoreElement.innerHTML = detailedStats;
}

// Функции шеринга (заготовки, нужно настроить свои URL и текст)
function shareVK() {
    // Настройте свой URL и текст
    const text = `Я набрал ${gameState.score} очков в игре "Музыкальный Шутер"! Попробуй и ты!`;
    const url = window.location.href;
    window.open(`https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, '_blank');
}

function shareTelegram() {
    // Настройте свой URL и текст
    const text = `Я набрал ${gameState.score} очков в игре "Музыкальный Шутер"! Попробуй и ты!`;
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', async () => {
    // Инициализируем аудио
    await initAudio();
    
    // Назначаем обработчики событий
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    muteButton.addEventListener('click', toggleMute);
    pauseButton.addEventListener('click', togglePause);
    shareVKButton.addEventListener('click', shareVK);
    shareTelegramButton.addEventListener('click', shareTelegram);
});