// --- Game Variables ---
let board;
let boardWidth = 360;
let boardHeight = 700;
let context;

let birdWidth = 54;
let birdHeight = 54;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let selectedBirdImg;
let birdImg1 = new Image();
let birdImg2 = new Image();
let bird = { x: birdX, y: birdY, width: birdWidth, height: birdHeight };
let birdVelocityY = 0;
let birdSpeed = 0.3;
let birdMaxSpeed = 5;

let canPlacePipes = true;

let pipeIntervalId;
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;
let topPipeImg;
let bottomPipeImg;

let velocityX = -2;
let baseVelocityX = -2;
let originalBaseVelocityX = -2;
let keys = {};

let gameOver = false;
let score = 0;
let currentLevel = 1;
let levelTextVisible = false;
let levelText = "";

let backgrounds = [];
let currentBgIndex = 0;
let gameStarted = false;

let levelSpeedIncrease = 0.5;
let gameLoopRequest;
let isFrozen = false;

let pointSound = new Audio("./assets/audio/point.mp3");
let hitSound = new Audio("./assets/audio/hit.mp3");

let isMuted = false;
let isPaused = false;

let endlessMode = false;

// --- Mute Button ---
const muteButton = document.getElementById("mute-button");
muteButton.onclick = function () {
    isMuted = !isMuted;
    muteButton.innerText = isMuted ? "🔇" : "🔊";
};

// --- Load & Start ---
window.onload = function () {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    birdImg1.src = "./assets/images/flappybird.png";
    birdImg2.src = "./assets/images/flappybird2.png";

    topPipeImg = new Image();
    topPipeImg.src = "./assets/images/toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./assets/images/bottompipe.png";

    for (let i = 0; i < 10; i++) {
        backgrounds[i] = new Image();
        backgrounds[i].src = `./assets/images/bg-${i + 1}.png`;
    }

    pointSound.load();
    hitSound.load();

    document.getElementById("char1").onclick = function () {
        selectedBirdImg = birdImg1;
        document.getElementById("play-button").style.display = "block";
    };

    document.getElementById("char2").onclick = function () {
        selectedBirdImg = birdImg2;
        document.getElementById("play-button").style.display = "block";
    };

    document.getElementById("play-button").onclick = function () {
        document.getElementById("character-selection").style.display = "none";
        startGame();
    };

    document.getElementById("pause-button").onclick = function () {
        isPaused = !isPaused;
        if (isPaused) {
            cancelAnimationFrame(gameLoopRequest);
            this.innerText = "▶️";
        } else {
            gameLoopRequest = requestAnimationFrame(update);
            this.innerText = "⏸️";
        }
    };

    document.getElementById("replay-button").onclick = function () {
        document.getElementById("game-over-screen").classList.add("hidden");
        resetGame();
    };
    
    document.getElementById("change-character-button").onclick = function () {
        cancelAnimationFrame(gameLoopRequest);
      
        gameStarted = false;
        isFrozen = true;              // now re-set it
      
        document.getElementById("game-over-screen").classList.add("hidden");
        document.getElementById("character-selection").style.display = "block";
        document.getElementById("play-button").style.display = "none";
         resetGame();  
      };
      

    document.addEventListener("keydown", function (e) {
        if (
            e.code === "Space" &&
            document.getElementById("popup") &&
            !document.getElementById("popup").classList.contains("hidden")
        ) {
            document.getElementById("popup-button").click();
        }
        if (e.code === "KeyP" && gameStarted && !gameOver) {
            document.getElementById("pause-button").click();
        }
    });
};

function startGame() {
    if (!gameStarted) {
        isFrozen = false;
        gameLoopRequest = requestAnimationFrame(update);
        clearInterval(pipeIntervalId);
        pipeIntervalId = setInterval(placePipes, 1500);
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
        document.addEventListener("click", moveBird);
        board.addEventListener("touchstart", moveBird);
        gameStarted = true;
    }
}

function update() {
    if (gameOver || isFrozen || isPaused) return;
    gameLoopRequest = requestAnimationFrame(update);
    context.drawImage(backgrounds[currentBgIndex], 0, 0, board.width, board.height);

    if (levelTextVisible) {
        context.font = "48px sans-serif";
        context.fillStyle = "white";
        context.textAlign = "center";
        context.fillText(levelText, boardWidth / 2, boardHeight / 2);
    }

    if (keys["ArrowUp"] || keys["KeyW"]) birdVelocityY -= birdSpeed;
    if (keys["ArrowDown"] || keys["KeyS"]) birdVelocityY += birdSpeed;
    birdVelocityY = Math.max(Math.min(birdVelocityY, birdMaxSpeed), -birdMaxSpeed);
    bird.y += birdVelocityY;
    if (!keys["ArrowUp"] && !keys["KeyW"] && !keys["ArrowDown"] && !keys["KeyS"]) birdVelocityY *= 0.9;

    bird.y = Math.max(0, Math.min(bird.y, board.height - bird.height));
    context.drawImage(selectedBirdImg, bird.x, bird.y, bird.width, bird.height);

    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && pipe.img === bottomPipeImg && bird.x > pipe.x + pipe.width) {
            score++;
            pipe.passed = true;
            if (!isMuted) pointSound.play();

            if (score % 20 === 0) {
                if (currentLevel < 5 || !endlessMode) {
                    endGame("طرش", true); // Level up popup
                } else {
                    nextLevel();
                }
                return;
            }
        }

        if (detectCollision(bird, pipe)) {
            if (!isMuted) hitSound.play();
            endGame("عيط");
            return;
        }
    }

    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    document.getElementById("score-label").innerText = Math.floor(score);
}

function placePipes() {
    if (gameOver || !canPlacePipes) return;
    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    let openingSpace = board.height / 4 + (score / 10);
    let pipeStartX = board.width;

    let topPipe = {
        img: topPipeImg,
        x: pipeStartX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
    };

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeStartX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false,
    };

    pipeArray.push(topPipe, bottomPipe);
}

function moveBird(e) {
    if (gameOver || isFrozen) return;
    let clickY = e.type === "click" ? e.clientY : e.touches[0].clientY;
    bird.y += clickY < boardHeight / 2 ? -30 : 30;
}

function keyDown(e) {
    keys[e.code] = true;
}

function keyUp(e) {
    keys[e.code] = false;
}

function detectCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function endGame(message, isLevelComplete = false) {
    if (isLevelComplete) {
        if (isFrozen) return;

        isFrozen = true;

        const popup = document.getElementById("popup");
        const popupMessage = document.getElementById("popup-message");

        popup.classList.remove("hidden");
        popupMessage.innerText = message;

        setTimeout(() => {
            popup.classList.add("hidden");
            nextLevel();
        }, 2000);

        return;
    } else if (isFrozen) {
        return;
    }

    cancelAnimationFrame(gameLoopRequest);
    gameOver = true;
    isFrozen = false;

    const gameOverScreen = document.getElementById("game-over-screen");
    const messageLabel = document.getElementById("message-label");

    gameOverScreen.classList.remove("hidden");
    messageLabel.innerText = message;

    document.getElementById("replay-button").style.display = "inline-block";
    document.getElementById("change-character-button").style.display = "inline-block";
}

function nextLevel() {
    document.getElementById("score-label").style.display = "block";

    currentLevel++;
    currentBgIndex = Math.floor(Math.random() * backgrounds.length);
    velocityX -= levelSpeedIncrease;
    baseVelocityX = velocityX;

    pipeArray = [];
    bird.y = birdY;
    gameOver = false;
    canPlacePipes = true;

    levelText = `LEVEL ${currentLevel}`;

    isFrozen = false;
    gameLoopRequest = requestAnimationFrame(update);
}

function resetGame() {
    clearInterval(pipeIntervalId);
    cancelAnimationFrame(gameLoopRequest);
    // isFrozen = false;
    gameStarted = false;
    gameOver = false;

    document.getElementById("popup").classList.add("hidden");
    document.getElementById("game-over-screen").classList.add("hidden");

    context.clearRect(0, 0, board.width, board.height);
    bird.y = birdY;
    pipeArray = [];
    score = 0;
    currentLevel = 1;
    currentBgIndex = 0;
    velocityX = originalBaseVelocityX;
    baseVelocityX = originalBaseVelocityX;
    keys = {};
    levelTextVisible = false;
    pipeIntervalId = setInterval(placePipes, 1500);
    gameLoopRequest = requestAnimationFrame(update);
}
