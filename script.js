class RacingGame {
    constructor() {
        console.log('Racing game initialized!');
        this.canvas = null;
    this.ctx = null;
    this.gameState = "menu"; // menu, playing, paused, gameOver
    this.gameMode = "normal";

    // Game settings
    this.settings = {
      easy: { enemySpeed: 2, enemySpawnRate: 0.01, playerMaxSpeed: 8 },
      normal: { enemySpeed: 3, enemySpawnRate: 0.015, playerMaxSpeed: 10 },
      hard: { enemySpeed: 4, enemySpawnRate: 0.02, playerMaxSpeed: 12 },
    };

    // Game state
    this.score = 0;
    this.distance = 0;
    this.lives = 3;
    this.level = 1;
    this.maxSpeed = 0;

    // Player car
    this.player = {
      x: 375,
      y: 500,
      width: 50,
      height: 80,
      speed: 0,
      maxSpeed: 10,
      acceleration: 0.3,
      friction: 0.15,
      color: "#ff6b6b",
    };

    // Game objects
    this.enemies = [];
    this.roadLines = [];
    this.powerUps = [];

    // Input handling
    this.keys = {};
    this.touchControls = {
      up: false,
      down: false,
      left: false,
      right: false,
      brake: false,
    };

    // Game timing
    this.lastTime = 0;
    this.gameSpeed = 1;

    // Road animation
    this.roadOffset = 0;

    this.init();
  }

  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.setupRoadLines();
    this.showStartScreen();
    // Set default game mode
    this.selectGameMode('normal');
  }

  setupCanvas() {
    this.canvas = document.getElementById("game-canvas");
    if (this.canvas) {
      this.ctx = this.canvas.getContext("2d");
      // Set canvas size
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
    } else {
      console.error('Canvas element not found!');
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 200);

    this.canvas.width = maxWidth;
    this.canvas.height = maxHeight;

    // Update player position if canvas size changed
    this.player.x = Math.min(
      this.player.x,
      this.canvas.width - this.player.width
    );
    this.player.y = this.canvas.height - this.player.height - 20;
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Game mode selection
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.selectGameMode(e.target.dataset.mode)
      );
    });

    // Button controls
    document
      .getElementById("start-game")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("play-again")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("back-to-menu")
      .addEventListener("click", () => this.showStartScreen());

    // Mobile controls
    this.setupMobileControls();

    // Pause on click
    document
      .getElementById("pause-overlay")
      .addEventListener("click", () => this.togglePause());
  }

  setupMobileControls() {
    const controls = {
      "up-btn": "up",
      "down-btn": "down",
      "left-btn": "left",
      "right-btn": "right",
      "brake-btn": "brake",
    };

    Object.entries(controls).forEach(([id, action]) => {
      const btn = document.getElementById(id);
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.touchControls[action] = true;
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.touchControls[action] = false;
      });
      btn.addEventListener(
        "mousedown",
        () => (this.touchControls[action] = true)
      );
      btn.addEventListener(
        "mouseup",
        () => (this.touchControls[action] = false)
      );
      btn.addEventListener(
        "mouseleave",
        () => (this.touchControls[action] = false)
      );
    });
  }

  handleKeyDown(e) {
    this.keys[e.code] = true;

    if (e.code === "Escape") {
      this.togglePause();
    }

    // Prevent default for game keys
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Space",
        "KeyW",
        "KeyS",
        "KeyA",
        "KeyD",
      ].includes(e.code)
    ) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  selectGameMode(mode) {
    console.log('Game mode selected:', mode);
    this.gameMode = mode;
    document
      .querySelectorAll(".mode-btn")
      .forEach((btn) => btn.classList.remove("selected"));
    const selectedBtn = document.querySelector(`[data-mode="${mode}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add("selected");
    }
  }

  showStartScreen() {
    this.gameState = "menu";
    document.getElementById("start-screen").classList.remove("hidden");
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("pause-overlay").classList.add("hidden");
  }

  startGame() {
    console.log('Start game clicked!');
    this.gameState = "playing";
    this.resetGame();

    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("pause-overlay").classList.add("hidden");

    this.gameLoop();
  }

  resetGame() {
    // Reset game state
    this.score = 0;
    this.distance = 0;
    this.lives = 3;
    this.level = 1;
    this.maxSpeed = 0;
    this.gameSpeed = 1;

    // Reset player
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - this.player.height - 20;
    this.player.speed = 0;
    this.player.maxSpeed = this.settings[this.gameMode].playerMaxSpeed;

    // Clear arrays
    this.enemies = [];
    this.powerUps = [];

    // Setup road
    this.setupRoadLines();
    this.roadOffset = 0;

    this.updateHUD();
  }

  setupRoadLines() {
    this.roadLines = [];
    for (let i = 0; i < 20; i++) {
      this.roadLines.push({
        x: this.canvas.width / 2 - 5,
        y: i * 40,
        width: 10,
        height: 20,
      });
    }
  }

  togglePause() {
    if (this.gameState === "playing") {
      this.gameState = "paused";
      document.getElementById("pause-overlay").classList.remove("hidden");
    } else if (this.gameState === "paused") {
      this.gameState = "playing";
      document.getElementById("pause-overlay").classList.add("hidden");
      this.gameLoop();
    }
  }

  gameLoop(currentTime = 0) {
    if (this.gameState !== "playing") return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    this.updatePlayer();
    this.updateEnemies();
    this.updatePowerUps();
    this.updateRoad();
    this.spawnEnemies();
    this.spawnPowerUps();
    this.checkCollisions();
    this.updateScore();
    this.updateLevel();
    this.updateHUD();
  }

  updatePlayer() {
    // Get input
    const left =
      this.keys["ArrowLeft"] || this.keys["KeyA"] || this.touchControls.left;
    const right =
      this.keys["ArrowRight"] || this.keys["KeyD"] || this.touchControls.right;
    const up =
      this.keys["ArrowUp"] || this.keys["KeyW"] || this.touchControls.up;
    const down =
      this.keys["ArrowDown"] || this.keys["KeyS"] || this.touchControls.down;
    const brake = this.keys["Space"] || this.touchControls.brake;

    // Handle acceleration/deceleration
    if (up && !brake) {
      this.player.speed = Math.min(
        this.player.speed + this.player.acceleration,
        this.player.maxSpeed
      );
    } else if (down || brake) {
      this.player.speed = Math.max(
        this.player.speed - this.player.acceleration * 2,
        0
      );
    } else {
      this.player.speed = Math.max(this.player.speed - this.player.friction, 0);
    }

    // Handle steering (slower when not moving much)
    const steerSpeed = 5 + this.player.speed * 0.3;
    if (left) {
      this.player.x = Math.max(this.player.x - steerSpeed, 50);
    }
    if (right) {
      this.player.x = Math.min(
        this.player.x + steerSpeed,
        this.canvas.width - this.player.width - 50
      );
    }

    // Update max speed achieved
    this.maxSpeed = Math.max(this.maxSpeed, this.player.speed);

    // Update distance based on speed
    this.distance += this.player.speed * 0.1;
  }

  updateEnemies() {
    const settings = this.settings[this.gameMode];
    const totalSpeed = settings.enemySpeed + this.player.speed + this.gameSpeed;

    this.enemies.forEach((enemy) => {
      enemy.y += totalSpeed;
    });

    // Remove enemies that are off screen
    this.enemies = this.enemies.filter(
      (enemy) => enemy.y < this.canvas.height + 100
    );
  }

  updatePowerUps() {
    const totalSpeed =
      this.settings[this.gameMode].enemySpeed +
      this.player.speed +
      this.gameSpeed;

    this.powerUps.forEach((powerUp) => {
      powerUp.y += totalSpeed;
      powerUp.rotation += 0.1;
    });

    // Remove power-ups that are off screen
    this.powerUps = this.powerUps.filter(
      (powerUp) => powerUp.y < this.canvas.height + 50
    );
  }

  updateRoad() {
    const totalSpeed =
      this.settings[this.gameMode].enemySpeed +
      this.player.speed +
      this.gameSpeed;
    this.roadOffset += totalSpeed;

    // Reset road offset to prevent overflow
    if (this.roadOffset >= 40) {
      this.roadOffset = 0;
    }

    // Update road line positions
    this.roadLines.forEach((line) => {
      line.y = (line.y + totalSpeed) % (this.canvas.height + 40);
    });
  }

  spawnEnemies() {
    const settings = this.settings[this.gameMode];
    if (Math.random() < settings.enemySpawnRate) {
      const laneWidth = (this.canvas.width - 100) / 3;
      const lane = Math.floor(Math.random() * 3);

      this.enemies.push({
        x: 50 + lane * laneWidth + Math.random() * (laneWidth - 60),
        y: -80,
        width: 50,
        height: 80,
        color: this.getRandomEnemyColor(),
        type: Math.random() < 0.1 ? "truck" : "car",
      });
    }
  }

  spawnPowerUps() {
    if (Math.random() < 0.003) {
      this.powerUps.push({
        x: 60 + Math.random() * (this.canvas.width - 120),
        y: -30,
        width: 30,
        height: 30,
        type: Math.random() < 0.5 ? "coin" : "heart",
        rotation: 0,
      });
    }
  }

  getRandomEnemyColor() {
    const colors = [
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
      "#00d2d3",
      "#ff9f43",
      "#ee5a52",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  checkCollisions() {
    // Check enemy collisions
    this.enemies.forEach((enemy, index) => {
      if (this.isColliding(this.player, enemy)) {
        this.handleEnemyCollision(index);
      }
    });

    // Check power-up collisions
    this.powerUps.forEach((powerUp, index) => {
      if (this.isColliding(this.player, powerUp)) {
        this.handlePowerUpCollision(powerUp, index);
      }
    });
  }

  isColliding(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  handleEnemyCollision(enemyIndex) {
    this.enemies.splice(enemyIndex, 1);
    this.lives--;

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Flash effect or invincibility frames could be added here
      this.player.speed *= 0.5; // Slow down on collision
    }
  }

  handlePowerUpCollision(powerUp, index) {
    this.powerUps.splice(index, 1);

    if (powerUp.type === "coin") {
      this.score += 100;
    } else if (powerUp.type === "heart" && this.lives < 5) {
      this.lives++;
    }
  }

  updateScore() {
    // Score based on distance and speed
    this.score += Math.floor(this.player.speed * 0.1);

    // Bonus for maintaining high speed
    if (this.player.speed > this.player.maxSpeed * 0.8) {
      this.score += 2;
    }
  }

  updateLevel() {
    const newLevel = Math.floor(this.distance / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.gameSpeed += 0.2; // Increase difficulty
    }
  }

  updateHUD() {
    document.getElementById("score").textContent = Math.floor(this.score);
    document.getElementById("distance").textContent = Math.floor(this.distance);
    document.getElementById("speed").textContent = Math.floor(
      this.player.speed * 10
    );
    document.getElementById("lives").textContent = this.lives;
    document.getElementById("level").textContent = this.level;
  }

  gameOver() {
    this.gameState = "gameOver";

    // Update final stats
    document.getElementById("final-score").textContent = Math.floor(this.score);
    document.getElementById("final-distance").textContent =
      Math.floor(this.distance) + "m";
    document.getElementById("max-speed").textContent =
      Math.floor(this.maxSpeed * 10) + " km/h";
    document.getElementById("final-level").textContent = this.level;

    // Calculate performance rating
    this.updatePerformanceRating();

    // Show game over screen
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("game-over-screen").classList.remove("hidden");
  }

  updatePerformanceRating() {
    const ratingText = document.getElementById("rating-text");
    const ratingEmoji = document.getElementById("rating-emoji");

    if (this.score > 5000) {
      ratingText.textContent = "Racing Legend!";
      ratingEmoji.textContent = "🏆";
    } else if (this.score > 3000) {
      ratingText.textContent = "Speed Demon!";
      ratingEmoji.textContent = "🔥";
    } else if (this.score > 1500) {
      ratingText.textContent = "Good Driver!";
      ratingEmoji.textContent = "⭐";
    } else if (this.score > 500) {
      ratingText.textContent = "Keep Practicing!";
      ratingEmoji.textContent = "👍";
    } else {
      ratingText.textContent = "Try Again!";
      ratingEmoji.textContent = "🏁";
    }
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#2d3436";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawRoad();
    this.drawPlayer();
    this.drawEnemies();
    this.drawPowerUps();
    this.drawEffects();
  }

  drawRoad() {
    const ctx = this.ctx;

    // Draw road surface
    ctx.fillStyle = "#636e72";
    ctx.fillRect(50, 0, this.canvas.width - 100, this.canvas.height);

    // Draw road edges
    ctx.fillStyle = "#fdcb6e";
    ctx.fillRect(45, 0, 10, this.canvas.height);
    ctx.fillRect(this.canvas.width - 55, 0, 10, this.canvas.height);

    // Draw center line
    ctx.fillStyle = "#fdcb6e";
    this.roadLines.forEach((line) => {
      ctx.fillRect(line.x, line.y - this.roadOffset, line.width, line.height);
    });

    // Draw lane markers
    const laneWidth = (this.canvas.width - 100) / 3;
    for (let i = 1; i < 3; i++) {
      const x = 50 + i * laneWidth - 2;
      for (let y = -this.roadOffset; y < this.canvas.height; y += 40) {
        ctx.fillStyle = "#ddd";
        ctx.fillRect(x, y, 4, 20);
      }
    }
  }

  drawPlayer() {
    const ctx = this.ctx;

    // Draw player car
    ctx.fillStyle = this.player.color;
    ctx.fillRect(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    // Draw car details
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(
      this.player.x + 5,
      this.player.y + 10,
      this.player.width - 10,
      15
    );
    ctx.fillRect(
      this.player.x + 5,
      this.player.y + 35,
      this.player.width - 10,
      25
    );

    // Draw wheels
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(this.player.x - 5, this.player.y + 15, 8, 15);
    ctx.fillRect(
      this.player.x + this.player.width - 3,
      this.player.y + 15,
      8,
      15
    );
    ctx.fillRect(this.player.x - 5, this.player.y + 50, 8, 15);
    ctx.fillRect(
      this.player.x + this.player.width - 3,
      this.player.y + 50,
      8,
      15
    );
  }

  drawEnemies() {
    const ctx = this.ctx;

    this.enemies.forEach((enemy) => {
      // Draw enemy car
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

      // Draw car details
      ctx.fillStyle = "#2d3436";
      if (enemy.type === "truck") {
        // Truck design
        ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 10, 20);
        ctx.fillRect(enemy.x + 5, enemy.y + 30, enemy.width - 10, 45);
      } else {
        // Regular car design
        ctx.fillRect(enemy.x + 5, enemy.y + 10, enemy.width - 10, 15);
        ctx.fillRect(enemy.x + 5, enemy.y + 35, enemy.width - 10, 25);
      }

      // Draw wheels
      ctx.fillStyle = "#2d3436";
      ctx.fillRect(enemy.x - 3, enemy.y + 15, 6, 12);
      ctx.fillRect(enemy.x + enemy.width - 3, enemy.y + 15, 6, 12);
      ctx.fillRect(enemy.x - 3, enemy.y + 53, 6, 12);
      ctx.fillRect(enemy.x + enemy.width - 3, enemy.y + 53, 6, 12);
    });
  }

  drawPowerUps() {
    const ctx = this.ctx;

    this.powerUps.forEach((powerUp) => {
      ctx.save();
      ctx.translate(
        powerUp.x + powerUp.width / 2,
        powerUp.y + powerUp.height / 2
      );
      ctx.rotate(powerUp.rotation);

      if (powerUp.type === "coin") {
        ctx.fillStyle = "#fdcb6e";
        ctx.fillRect(
          -powerUp.width / 2,
          -powerUp.height / 2,
          powerUp.width,
          powerUp.height
        );
        ctx.fillStyle = "#f39c12";
        ctx.fillRect(
          -powerUp.width / 2 + 5,
          -powerUp.height / 2 + 5,
          powerUp.width - 10,
          powerUp.height - 10
        );
      } else if (powerUp.type === "heart") {
        ctx.fillStyle = "#e17055";
        ctx.fillRect(
          -powerUp.width / 2,
          -powerUp.height / 2,
          powerUp.width,
          powerUp.height
        );
        ctx.fillStyle = "#d63031";
        ctx.fillRect(
          -powerUp.width / 2 + 3,
          -powerUp.height / 2 + 3,
          powerUp.width - 6,
          powerUp.height - 6
        );
      }

      ctx.restore();
    });
  }

  drawEffects() {
    const ctx = this.ctx;

    // Speed lines when going fast
    if (this.player.speed > this.player.maxSpeed * 0.7) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;

      for (let i = 0; i < 10; i++) {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const length = 20 + this.player.speed * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + length);
        ctx.stroke();
      }
    }

    // Low health warning
    if (this.lives === 1) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new RacingGame();
});
