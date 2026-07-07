document.addEventListener('DOMContentLoaded', () => {
  // --- DATA MODELS ---
  // Every part must have 15 points total across 5 stats.
  const partsData = {
    top: [
      { id: 't1', name: 'Valkyrie Ring', attack: 7, defense: 2, stamina: 2, weight: 3, speed: 1 },
      { id: 't2', name: 'Spriggan Ring', attack: 4, defense: 3, stamina: 3, weight: 3, speed: 2 },
      { id: 't3', name: 'Ragnaruk Ring', attack: 2, defense: 4, stamina: 6, weight: 2, speed: 1 },
      { id: 't4', name: 'Longinus Ring', attack: 8, defense: 1, stamina: 1, weight: 4, speed: 1 },
      { id: 't5', name: 'Fafnir Ring', attack: 1, defense: 5, stamina: 5, weight: 3, speed: 1 },
      { id: 't6', name: 'Pegasus Ring', attack: 5, defense: 2, stamina: 2, weight: 2, speed: 4 }
    ],
    middle: [
      { id: 'm1', name: 'Wing Disk', attack: 1, defense: 2, stamina: 3, weight: 4, speed: 5 },
      { id: 'm2', name: 'Heavy Disk', attack: 2, defense: 5, stamina: 1, weight: 7, speed: 0 },
      { id: 'm3', name: 'Boost Disk', attack: 3, defense: 2, stamina: 2, weight: 3, speed: 5 },
      { id: 'm4', name: 'Aero Disk', attack: 2, defense: 1, stamina: 4, weight: 2, speed: 6 },
      { id: 'm5', name: 'Armor Disk', attack: 0, defense: 7, stamina: 1, weight: 6, speed: 1 },
      { id: 'm6', name: 'Magnum Disk', attack: 4, defense: 4, stamina: 2, weight: 4, speed: 1 }
    ],
    bottom: [
      { id: 'b1', name: 'Accel Tip', attack: 3, defense: 1, stamina: 2, weight: 1, speed: 8, style: 'direct' },
      { id: 'b2', name: 'Survive Tip', attack: 1, defense: 3, stamina: 8, weight: 2, speed: 1, style: 'circular' },
      { id: 'b3', name: 'Defense Tip', attack: 1, defense: 7, stamina: 4, weight: 3, speed: 0, style: 'circular' },
      { id: 'b4', name: 'Zephyr Tip', attack: 4, defense: 0, stamina: 1, weight: 1, speed: 9, style: 'star' },
      { id: 'b5', name: 'Eternal Tip', attack: 0, defense: 2, stamina: 10, weight: 2, speed: 1, style: 'circular' },
      { id: 'b6', name: 'Destroy Tip', attack: 5, defense: 2, stamina: 3, weight: 2, speed: 3, style: 'star' }
    ]
  };

  const levels = [
    { id: 1, name: 'Rookie Blader', opponentName: 'Tyson', loadout: { top: 't2', middle: 'm1', bottom: 'b2' } },
    { id: 2, name: 'Pro Blader', opponentName: 'Kai', loadout: { top: 't1', middle: 'm2', bottom: 'b1' } },
    { id: 3, name: 'Champion', opponentName: 'Ray', loadout: { top: 't3', middle: 'm3', bottom: 'b3' } },
    { id: 4, name: 'Legend', opponentName: 'Lui', loadout: { top: 't4', middle: 'm5', bottom: 'b6' } },
    { id: 5, name: 'World Master', opponentName: 'Free', loadout: { top: 't5', middle: 'm2', bottom: 'b5' } }
  ];

  // --- STATE ---
  let playerLoadout = { top: 't1', middle: 'm1', bottom: 'b1' };
  let currentLevel = null;
  let currentOpponentLoadout = null;

  // --- UI ELEMENTS ---
  const screens = document.querySelectorAll('.screen');
  const btnStart = document.getElementById('btn-start');
  const btnGarageBack = document.getElementById('btn-garage-back');
  const btnToLevels = document.getElementById('btn-to-levels');
  const btnLevelsBack = document.getElementById('btn-levels-back');
  const btnBattleLeave = document.getElementById('btn-battle-leave');

  const statBars = {
    attack: document.getElementById('stat-attack'),
    defense: document.getElementById('stat-defense'),
    stamina: document.getElementById('stat-stamina'),
    weight: document.getElementById('stat-weight'),
    speed: document.getElementById('stat-speed')
  };
  const statVals = {
    attack: document.getElementById('val-attack'),
    defense: document.getElementById('val-defense'),
    stamina: document.getElementById('val-stamina'),
    weight: document.getElementById('val-weight'),
    speed: document.getElementById('val-speed')
  };
  const moveStyleDisplay = document.getElementById('move-style-display');

  // --- NAVIGATION ---
  function showScreen(id) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  if (btnStart) btnStart.addEventListener('click', () => showScreen('garage-screen'));
  if (btnGarageBack) btnGarageBack.addEventListener('click', () => showScreen('main-menu'));
  if (btnToLevels) btnToLevels.addEventListener('click', () => showScreen('level-select-screen'));
  if (btnLevelsBack) btnLevelsBack.addEventListener('click', () => showScreen('garage-screen'));
  if (btnBattleLeave) {
    btnBattleLeave.addEventListener('click', () => {
      document.getElementById('result-overlay').classList.add('hidden');
      showScreen('level-select-screen');
      if (animationId) cancelAnimationFrame(animationId);
      cleanupBattle();
    });
  }

  // --- GARAGE LOGIC ---
  function renderParts(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    partsData[category].forEach(part => {
      const el = document.createElement('div');
      el.className = `part-item ${playerLoadout[category] === part.id ? 'selected' : ''}`;
      
      let statsHTML = `ATK: ${part.attack} | DEF: ${part.defense} | STM: ${part.stamina} | WGT: ${part.weight} | SPD: ${part.speed}`;
      let styleBadge = part.style ? `<span style="color: var(--accent-gold); font-size: 0.8rem; float:right;">[${part.style.toUpperCase()}]</span>` : '';
      
      el.innerHTML = `<div class="part-name">${part.name} ${styleBadge}</div><div class="part-stats">${statsHTML}</div>`;
      el.addEventListener('click', () => {
        playerLoadout[category] = part.id;
        renderParts(category, containerId); 
        updateStats();
      });
      container.appendChild(el);
    });
  }

  function calcTotalStats(loadout) {
    const t = partsData.top.find(p => p.id === loadout.top);
    const m = partsData.middle.find(p => p.id === loadout.middle);
    const b = partsData.bottom.find(p => p.id === loadout.bottom);

    return {
      attack: t.attack + m.attack + b.attack,
      defense: t.defense + m.defense + b.defense,
      weight: t.weight + m.weight + b.weight,
      speed: t.speed + m.speed + b.speed,
      stamina: t.stamina + m.stamina + b.stamina,
      style: b.style
    };
  }

  function updateStats() {
    const stats = calcTotalStats(playerLoadout);
    const MAX_STAT = 20; // Hardcapped to 20
    
    const updateBar = (key) => {
      if (statBars[key]) {
        statBars[key].style.width = `${Math.min(100, (stats[key] / MAX_STAT) * 100)}%`;
      }
      if (statVals[key]) {
        statVals[key].innerText = `${stats[key]} / ${MAX_STAT}`;
      }
    };

    ['attack', 'defense', 'weight', 'speed', 'stamina'].forEach(updateBar);
    if (moveStyleDisplay) {
      moveStyleDisplay.innerText = stats.style.toUpperCase();
    }
  }

  renderParts('top', 'list-top');
  renderParts('middle', 'list-middle');
  renderParts('bottom', 'list-bottom');
  
  // Create UI element for movement style if it doesn't exist
  if (!document.getElementById('move-style-display')) {
    const statsCard = document.querySelector('.stats-card');
    if (statsCard) {
      const styleEl = document.createElement('div');
      styleEl.className = 'stat-item mt-4';
      styleEl.innerHTML = `<div class="stat-header"><span>Movement Style</span><span id="move-style-display" style="color:var(--accent-gold);"></span></div>`;
      statsCard.insertBefore(styleEl, document.getElementById('btn-to-levels'));
    }
  }
  updateStats();

  // --- LEVEL SELECT LOGIC ---
  const levelListContainer = document.getElementById('level-list');
  if (levelListContainer) {
    levels.forEach(level => {
      const el = document.createElement('div');
      el.className = 'level-card';
      el.innerHTML = `
        <h3>Level ${level.id}</h3>
        <p>Vs. ${level.opponentName}</p>
        <button class="btn btn-primary btn-play-level">Battle!</button>
      `;
      el.querySelector('.btn-play-level').addEventListener('click', () => {
        currentLevel = level;
        currentOpponentLoadout = level.loadout;
        startBattleSetup();
      });
      levelListContainer.appendChild(el);
    });
  }

  // --- BATTLE ENGINE ---
  const canvas = document.getElementById('battle-canvas');
  let ctx;
  if (canvas) {
    ctx = canvas.getContext('2d');
  }
  let animationId;
  let playerTop, enemyTop;
  let battleActive = false;
  let particles = [];

  // Launch variables
  let launchPhase = 'angle'; // 'angle', 'power', 'launched'
  let launchAngle = 0; // 0 to Math.PI*2
  let launchCursorPos = 0;
  let launchDirection = 1;
  let launchSpeed = 2.5;

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 10;
      this.vy = (Math.random() - 0.5) * 10;
      this.life = 1;
      this.color = color;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= 0.05;
    }
    draw(ctx) {
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  class Beyblade {
    constructor(x, y, stats, color, isPlayer) {
      this.x = x;
      this.y = y;
      this.radius = 25 + (stats.weight * 1.5);
      this.stats = stats;
      this.color = color;
      this.isPlayer = isPlayer;
      
      this.maxStamina = 5000 + (stats.stamina * 250);
      this.stamina = this.maxStamina;
      
      this.vx = 0;
      this.vy = 0;
      this.baseSpeed = 1.5 + (stats.speed * 0.4);
      this.style = stats.style || 'direct';
      this.angle = 0; // For star movement tracking
    }

    update(arena, enemy) {
      this.stamina -= 0.5;
      this.vx *= 0.985;
      this.vy *= 0.985;

      const distFromCenter = Math.sqrt(Math.pow(arena.x - this.x, 2) + Math.pow(arena.y - this.y, 2));
      
      if (this.stamina > 0) {
        if (this.style === 'direct') {
          // Direct: Chase the enemy
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist > 5) {
            this.vx += (dx / dist) * this.baseSpeed * 0.1;
            this.vy += (dy / dist) * this.baseSpeed * 0.1;
          }
        } else if (this.style === 'circular') {
          // Circular: Orbit the center at a distance
          const targetRadius = arena.radius * 0.5;
          const dx = this.x - arena.x;
          const dy = this.y - arena.y;
          const angleToCenter = Math.atan2(dy, dx);
          
          // Move tangentially
          const tangentAngle = angleToCenter + Math.PI/2;
          this.vx += Math.cos(tangentAngle) * this.baseSpeed * 0.08;
          this.vy += Math.sin(tangentAngle) * this.baseSpeed * 0.08;
          
          // Pull towards target radius
          const radialDiff = targetRadius - distFromCenter;
          this.vx += Math.cos(angleToCenter) * radialDiff * 0.002;
          this.vy += Math.sin(angleToCenter) * radialDiff * 0.002;
        } else if (this.style === 'star') {
          // Star: Bounce wildly in straight lines
          const speedMod = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
          if (speedMod < this.baseSpeed) {
            this.vx += Math.cos(this.angle) * this.baseSpeed * 0.2;
            this.vy += Math.sin(this.angle) * this.baseSpeed * 0.2;
          }
        }
      }

      this.x += this.vx;
      this.y += this.vy;

      // Arena bounds collision
      if (distFromCenter + this.radius > arena.radius) {
        const nx = (this.x - arena.x) / distFromCenter;
        const ny = (this.y - arena.y) / distFromCenter;
        
        // Bounce
        const dotProduct = this.vx * nx + this.vy * ny;
        if (dotProduct > 0) {
            this.vx -= 2 * dotProduct * nx * 0.8;
            this.vy -= 2 * dotProduct * ny * 0.8;
        }
        
        // Push inside
        this.x = arena.x + nx * (arena.radius - this.radius);
        this.y = arena.y + ny * (arena.radius - this.radius);
        
        this.stamina -= 15; 
        
        if (this.style === 'star') {
          // Pick a new random angle across the arena
          this.angle = Math.atan2(-ny, -nx) + (Math.random() - 0.5);
          this.vx += Math.cos(this.angle) * this.baseSpeed * 5;
          this.vy += Math.sin(this.angle) * this.baseSpeed * 5;
        }
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.lineWidth = 6;
      ctx.strokeStyle = this.isPlayer ? '#3b82f6' : '#ef4444';
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();

      if (this.stamina > 0) {
        const speedMultiplier = Math.max(0.1, this.stamina / this.maxStamina);
        const drawAngle = (Date.now() * speedMultiplier / 50) % (Math.PI * 2);
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(drawAngle) * this.radius, this.y + Math.sin(drawAngle) * this.radius);
        ctx.lineTo(this.x + Math.cos(drawAngle + Math.PI/2) * this.radius, this.y + Math.sin(drawAngle + Math.PI/2) * this.radius);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  function resolveCollision(b1, b2) {
    if (b1.stamina <= 0 && b2.stamina <= 0) return;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < b1.radius + b2.radius) {
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Separate them slightly to prevent sticking
      const overlap = (b1.radius + b2.radius) - distance;
      b1.x -= nx * overlap * 0.5;
      b1.y -= ny * overlap * 0.5;
      b2.x += nx * overlap * 0.5;
      b2.y += ny * overlap * 0.5;

      const dvx = b1.vx - b2.vx;
      const dvy = b1.vy - b2.vy;
      const speed = dvx * nx + dvy * ny;

      if (speed < 0) return; // moving apart

      const b1Mass = b1.stats.weight || 1;
      const b2Mass = b2.stats.weight || 1;
      const impulse = 2 * speed / (b1Mass + b2Mass);

      b1.vx -= impulse * b2Mass * nx;
      b1.vy -= impulse * b2Mass * ny;
      b2.vx += impulse * b1Mass * nx;
      b2.vy += impulse * b1Mass * ny;

      // Damage formula - scaled down so they don't one-shot each other at high speeds
      const b1Damage = Math.max(1, (b2.stats.attack * 2) - (b1.stats.defense * 1.2)) * (Math.abs(speed) * 0.15);
      const b2Damage = Math.max(1, (b1.stats.attack * 2) - (b2.stats.defense * 1.2)) * (Math.abs(speed) * 0.15);
      
      b1.stamina -= b1Damage;
      b2.stamina -= b2Damage;

      // Particles
      for(let i=0; i<5; i++) {
        particles.push(new Particle(b1.x + dx/2, b1.y + dy/2, '#fcd34d'));
      }
      
      // Deflection for star style
      if (b1.style === 'star') b1.angle = Math.atan2(-ny, -nx);
      if (b2.style === 'star') b2.angle = Math.atan2(ny, nx);
    }
  }

  const arena = {
    get x() { return canvas ? canvas.width / 2 : 0; },
    get y() { return canvas ? canvas.height / 2 : 0; },
    get radius() { return canvas ? Math.min(canvas.width, canvas.height) * 0.4 : 300; }
  };

  function startBattleSetup() {
    showScreen('battle-screen');
    document.getElementById('enemy-name').innerText = currentLevel.opponentName;
    
    const pStats = calcTotalStats(playerLoadout);
    const eStats = calcTotalStats(currentOpponentLoadout);

    // Initial positions for launch
    playerTop = new Beyblade(arena.x - arena.radius*0.7, arena.y, pStats, '#1f2937', true);
    enemyTop = new Beyblade(arena.x + arena.radius*0.7, arena.y, eStats, '#1f2937', false);
    
    document.getElementById('result-overlay').classList.add('hidden');
    particles = [];
    
    launchPhase = 'angle';
    battleActive = false;
    launchAngle = 0;
    launchCursorPos = 0;
    
    const overlay = document.getElementById('launch-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('launch-status').innerText = "READY...";
    document.getElementById('launch-status').style.color = "var(--text-muted)";
    document.getElementById('launch-bar-wrapper').classList.add('hidden'); // hide power bar initially
    
    // Remove old listeners to prevent double triggers
    window.removeEventListener('keydown', handleLaunchInput);
    
    // Add small delay before allowing launch to prevent mashing
    setTimeout(() => {
      document.getElementById('launch-status').innerText = "SPACE to lock Angle";
      window.addEventListener('keydown', handleLaunchInput);
    }, 600);
    
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
  }

  function cleanupBattle() {
    window.removeEventListener('keydown', handleLaunchInput);
    battleActive = false;
    launchPhase = 'none';
  }

  function handleLaunchInput(e) {
    if (e.code === 'Space') {
      if (launchPhase === 'angle') {
        launchPhase = 'power';
        document.getElementById('launch-status').innerText = "SPACE to launch Power!";
        document.getElementById('launch-status').style.color = "var(--text-main)";
        document.getElementById('launch-bar-wrapper').classList.remove('hidden');
      } else if (launchPhase === 'power') {
        window.removeEventListener('keydown', handleLaunchInput);
        launchPhase = 'launched';
        
        let boostMultiplier = 1;
        let message = "Weak Launch...";
        let color = "var(--accent-red)";
        
        if (launchCursorPos >= 75 && launchCursorPos <= 85) {
          boostMultiplier = 3.5; 
          message = "PERFECT LAUNCH!";
          color = "var(--accent-green)";
        } else if (launchCursorPos >= 65 && launchCursorPos <= 95) {
          boostMultiplier = 2.0; 
          message = "Good Launch!";
          color = "var(--accent-gold)";
        }

        const statusEl = document.getElementById('launch-status');
        statusEl.innerText = message;
        statusEl.style.color = color;
        
        // Apply player angle and boost
        playerTop.vx = Math.cos(launchAngle) * 10 * boostMultiplier;
        playerTop.vy = Math.sin(launchAngle) * 10 * boostMultiplier;
        if (playerTop.style === 'star') playerTop.angle = launchAngle;
        
        // Enemy AI launch
        const eAngle = Math.PI - (Math.random() - 0.5); // Towards left
        enemyTop.vx = Math.cos(eAngle) * 25;
        enemyTop.vy = Math.sin(eAngle) * 25;
        if (enemyTop.style === 'star') enemyTop.angle = eAngle;

        setTimeout(() => {
          document.getElementById('launch-overlay').classList.add('hidden');
          battleActive = true;
        }, 1000);
      }
    }
  }

  function updateUI() {
    const pStaminaPct = Math.max(0, playerTop.stamina / playerTop.maxStamina) * 100;
    const eStaminaPct = Math.max(0, enemyTop.stamina / enemyTop.maxStamina) * 100;
    
    document.getElementById('player-stamina').style.width = `${pStaminaPct}%`;
    document.getElementById('enemy-stamina').style.width = `${eStaminaPct}%`;
  }

  function checkWinCondition() {
    if (playerTop.stamina <= 0 && enemyTop.stamina <= 0) {
      showResult("DRAW", "Both Beyblades stopped spinning.", "draw");
      return true;
    }
    if (playerTop.stamina <= 0) {
      showResult("DEFEAT", `${currentLevel.opponentName} out-spun you!`, "defeat");
      return true;
    }
    if (enemyTop.stamina <= 0) {
      showResult("VICTORY!", "You crushed them!", "victory");
      return true;
    }
    return false;
  }

  function showResult(title, desc, type) {
    battleActive = false;
    document.getElementById('battle-result-title').innerText = title;
    document.getElementById('battle-result-desc').innerText = desc;
    
    const box = document.getElementById('result-box-el');
    box.className = 'result-box ' + type;
    
    document.getElementById('result-overlay').classList.remove('hidden');
  }

  function drawBattle() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Arena
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, arena.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.stroke();
    
    // Arena center ring
    ctx.beginPath();
    ctx.arc(arena.x, arena.y, arena.radius * 0.3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    playerTop.draw(ctx);
    enemyTop.draw(ctx);
    
    // Draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw(ctx);
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Draw Launch Angle Arrow during Angle Phase
    if (launchPhase === 'angle' || launchPhase === 'power') {
      ctx.beginPath();
      ctx.moveTo(playerTop.x, playerTop.y);
      const arrowLength = 80;
      const endX = playerTop.x + Math.cos(launchAngle) * arrowLength;
      const endY = playerTop.y + Math.sin(launchAngle) * arrowLength;
      ctx.lineTo(endX, endY);
      
      // Arrow head
      ctx.lineTo(endX - Math.cos(launchAngle - Math.PI/6) * 15, endY - Math.sin(launchAngle - Math.PI/6) * 15);
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - Math.cos(launchAngle + Math.PI/6) * 15, endY - Math.sin(launchAngle + Math.PI/6) * 15);
      
      ctx.strokeStyle = launchPhase === 'angle' ? '#f59e0b' : '#10b981';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function gameLoop() {
    if (launchPhase === 'angle') {
      launchAngle += 0.05;
      drawBattle();
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (launchPhase === 'power') {
      launchCursorPos += launchSpeed * launchDirection;
      if (launchCursorPos >= 100 || launchCursorPos <= 0) {
        launchDirection *= -1;
      }
      document.getElementById('launch-cursor').style.left = `${launchCursorPos}%`;
      drawBattle();
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (launchPhase === 'launched' && !battleActive) {
      drawBattle();
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    if (!battleActive) return;

    playerTop.update(arena, enemyTop);
    enemyTop.update(arena, playerTop);
    resolveCollision(playerTop, enemyTop);
    
    updateUI();
    drawBattle();

    if (!checkWinCondition()) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }
});
