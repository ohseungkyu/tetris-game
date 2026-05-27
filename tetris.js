// 테트리스 게임 로직
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// 게임 상수
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const BLOCK_SIZE = canvas.width / GRID_WIDTH;

// 테트로미노 정의
const TETROMINOS = {
    I: { blocks: [[1, 1, 1, 1]], color: '#00d4ff' },
    O: { blocks: [[1, 1], [1, 1]], color: '#ffff00' },
    T: { blocks: [[0, 1, 0], [1, 1, 1]], color: '#ff00ff' },
    S: { blocks: [[0, 1, 1], [1, 1, 0]], color: '#00ff00' },
    Z: { blocks: [[1, 1, 0], [0, 1, 1]], color: '#ff0000' },
    J: { blocks: [[1, 0, 0], [1, 1, 1]], color: '#0000ff' },
    L: { blocks: [[0, 0, 1], [1, 1, 1]], color: '#ff8800' }
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);

// 게임 상태
let gameBoard = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let dropSpeed = 800;
let dropTimer = 0;

// UI 요소
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const linesDisplay = document.getElementById('lines');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');

// 게임판 초기화
function initializeBoard() {
    gameBoard = [];
    for (let i = 0; i < GRID_HEIGHT; i++) {
        gameBoard[i] = [];
        for (let j = 0; j < GRID_WIDTH; j++) {
            gameBoard[i][j] = null;
        }
    }
}

// 새로운 테트로미노 생성
function createNewPiece() {
    if (nextPiece === null) {
        nextPiece = {
            type: TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)],
            x: 3,
            y: 0,
            rotation: 0
        };
    }
    
    currentPiece = nextPiece;
    nextPiece = {
        type: TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)],
        x: 3,
        y: 0,
        rotation: 0
    };
    
    // 충돌 확인 (게임 오버)
    if (checkCollision(currentPiece)) {
        endGame();
        return false;
    }
    return true;
}

// 현재 테트로미노의 회전된 블록 가져오기
function getRotatedBlocks(piece) {
    let blocks = JSON.parse(JSON.stringify(TETROMINOS[piece.type].blocks));
    
    for (let i = 0; i < piece.rotation; i++) {
        blocks = rotateMatrix(blocks);
    }
    
    return blocks;
}

// 행렬 회전 (90도)
function rotateMatrix(matrix) {
    const n = matrix.length;
    const m = matrix[0].length;
    const rotated = [];
    
    for (let i = 0; i < m; i++) {
        rotated[i] = [];
        for (let j = n - 1; j >= 0; j--) {
            rotated[i][n - 1 - j] = matrix[j][i];
        }
    }
    
    return rotated;
}

// 충돌 감지
function checkCollision(piece, dx = 0, dy = 0) {
    const blocks = getRotatedBlocks(piece);
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks[i].length; j++) {
            if (blocks[i][j]) {
                const x = newX + j;
                const y = newY + i;
                
                if (x < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
                    return true;
                }
                
                if (y >= 0 && gameBoard[y][x] !== null) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 테트로미노 이동
function movePiece(dx) {
    if (!checkCollision(currentPiece, dx, 0)) {
        currentPiece.x += dx;
    }
}

// 테트로미노 회전
function rotatePiece() {
    const originalRotation = currentPiece.rotation;
    currentPiece.rotation = (currentPiece.rotation + 1) % 4;
    
    if (checkCollision(currentPiece)) {
        currentPiece.rotation = originalRotation;
    }
}

// 테트로미노 드롭
function dropPiece() {
    if (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        return false;
    }
    
    // 테트로미노 고정
    lockPiece();
    return true;
}

// 테트로미노 고정
function lockPiece() {
    const blocks = getRotatedBlocks(currentPiece);
    const color = TETROMINOS[currentPiece.type].color;
    
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks[i].length; j++) {
            if (blocks[i][j]) {
                const x = currentPiece.x + j;
                const y = currentPiece.y + i;
                
                if (y >= 0) {
                    gameBoard[y][x] = color;
                }
            }
        }
    }
    
    clearLines();
    createNewPiece();
}

// 완성된 라인 제거
function clearLines() {
    let linesCleared = 0;
    
    for (let i = GRID_HEIGHT - 1; i >= 0; i--) {
        if (gameBoard[i].every(cell => cell !== null)) {
            gameBoard.splice(i, 1);
            gameBoard.unshift(new Array(GRID_WIDTH).fill(null));
            linesCleared++;
            i++;
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        
        // 레벨 업
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropSpeed = Math.max(200, 800 - (level - 1) * 50);
        }
        
        updateDisplay();
    }
}

// 화면 그리기
function draw() {
    // 게임판 배경
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 고정된 블록 그리기
    for (let i = 0; i < GRID_HEIGHT; i++) {
        for (let j = 0; j < GRID_WIDTH; j++) {
            if (gameBoard[i][j]) {
                drawBlock(ctx, j, i, gameBoard[i][j]);
            }
        }
    }
    
    // 현재 테트로미노 그리기
    if (currentPiece) {
        const blocks = getRotatedBlocks(currentPiece);
        const color = TETROMINOS[currentPiece.type].color;
        
        for (let i = 0; i < blocks.length; i++) {
            for (let j = 0; j < blocks[i].length; j++) {
                if (blocks[i][j]) {
                    drawBlock(ctx, currentPiece.x + j, currentPiece.y + i, color);
                }
            }
        }
    }
    
    // 그리드 선 그리기
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
}

// 블록 그리기
function drawBlock(context, x, y, color) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    
    context.fillStyle = color;
    context.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.lineWidth = 1;
    context.strokeRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
}

// 다음 테트로미노 미리보기
function drawNextPiece() {
    nextCtx.fillStyle = '#f9f9f9';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const blocks = TETROMINOS[nextPiece.type].blocks;
        const color = TETROMINOS[nextPiece.type].color;
        const blockSize = nextCanvas.width / 4;
        
        for (let i = 0; i < blocks.length; i++) {
            for (let j = 0; j < blocks[i].length; j++) {
                if (blocks[i][j]) {
                    nextCtx.fillStyle = color;
                    nextCtx.fillRect(j * blockSize + 10, i * blockSize + 10, blockSize - 2, blockSize - 2);
                }
            }
        }
    }
}

// 화면 업데이트
function updateDisplay() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    linesDisplay.textContent = lines;
    drawNextPiece();
}

// 게임 업데이트
function update(deltaTime) {
    if (!gameRunning || gamePaused) return;
    
    dropTimer += deltaTime;
    
    if (dropTimer >= dropSpeed) {
        if (dropPiece()) {
            dropTimer = 0;
        } else {
            dropTimer = 0;
        }
    }
}

// 게임 루프
let lastTime = Date.now();
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update(deltaTime);
    draw();
    drawNextPiece();
    
    requestAnimationFrame(gameLoop);
}

// 게임 시작
function startGame() {
    if (gameRunning && !gamePaused) return;
    
    if (!gameRunning) {
        initializeBoard();
        score = 0;
        lines = 0;
        level = 1;
        dropSpeed = 800;
        updateDisplay();
        gameOverScreen.classList.remove('show');
    }
    
    gameRunning = true;
    gamePaused = false;
    dropTimer = 0;
    
    if (currentPiece === null) {
        createNewPiece();
    }
    
    startBtn.textContent = '재개';
    pauseBtn.textContent = '일시정지';
}

// 게임 일시정지
function pauseGame() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? '재개' : '일시정지';
}

// 게임 리셋
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    currentPiece = null;
    nextPiece = null;
    initializeBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropSpeed = 800;
    dropTimer = 0;
    updateDisplay();
    draw();
    gameOverScreen.classList.remove('show');
    startBtn.textContent = '게임 시작';
    pauseBtn.textContent = '일시정지';
}

// 게임 오버
function endGame() {
    gameRunning = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.add('show');
    startBtn.textContent = '게임 시작';
}

// 키보드 이벤트
window.addEventListener('keydown', (e) => {
    if (!gameRunning || gamePaused) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            movePiece(-1);
            e.preventDefault();
            break;
        case 'ArrowRight':
            movePiece(1);
            e.preventDefault();
            break;
        case 'ArrowDown':
            dropPiece();
            e.preventDefault();
            break;
        case ' ':
            rotatePiece();
            e.preventDefault();
            break;
    }
});

// 버튼 이벤트
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);

// 게임 초기화 및 시작
initializeBoard();
updateDisplay();
gameLoop();