/**
 * Spider-Man: Brand New Day - Procedural City & Building Anchor Generator (v2 Overhaul)
 * Eliminates floating sky anchors by making ALL web swing anchor points physical
 * building corners, rooftop ledges, and crane arms attached to skyscrapers.
 */

class WorldManager {
  constructor() {
    this.buildings = [];
    this.bgBuildings = []; // Atmospheric background skyscrapers
    this.anchorNodes = []; // All physical building corners & crane arms
    this.tokens = [];
    this.hazards = [];

    this.lastSpawnX = -300;
    this.lastBgSpawnX = -400;
    this.groundY = 1500; // Deep city pit

    // Visual assets
    this.bgImage = new Image();
    this.bgImage.src = 'assets/skyline_bg.jpg';

    // Color palettes for cyberpunk NYC skyscrapers
    this.buildingColors = [
      { body: 'hsl(222, 32%, 12%)', border: 'hsl(222, 40%, 25%)', window: 'hsl(190, 100%, 50%)' },
      { body: 'hsl(228, 28%, 14%)', border: 'hsl(228, 35%, 28%)', window: 'hsl(354, 95%, 55%)' },
      { body: 'hsl(218, 25%, 16%)', border: 'hsl(218, 30%, 30%)', window: 'hsl(43, 96%, 58%)' },
      { body: 'hsl(238, 28%, 11%)', border: 'hsl(238, 38%, 24%)', window: 'hsl(280, 95%, 65%)' }
    ];

    this.bgColors = [
      'hsl(230, 35%, 8%)',
      'hsl(225, 30%, 10%)',
      'hsl(240, 40%, 9%)'
    ];

    this.reset();
  }

  reset() {
    this.buildings = [];
    this.bgBuildings = [];
    this.anchorNodes = [];
    this.tokens = [];
    this.hazards = [];
    this.lastSpawnX = -400;
    this.lastBgSpawnX = -500;

    // Spawn initial starting zone
    this.spawnInitialZone();
  }

  spawnInitialZone() {
    // Starting rooftop so Spidey has a safe landing platform at x=0
    this.addBuilding(-300, 750, 700, 800, false);
    
    // Generate initial stretch of skyscrapers and physical anchors
    for (let i = 0; i < 8; i++) {
      this.generateNextChunk();
    }
    for (let i = 0; i < 12; i++) {
      this.generateNextBgBuilding();
    }
  }

  addBuilding(x, y, width, height, canHaveHazards = true) {
    const theme = this.buildingColors[Math.floor(Math.random() * this.buildingColors.length)];
    const building = {
      x,
      y,
      width,
      height,
      theme,
      windows: [],
      hasCrane: canHaveHazards && Math.random() > 0.45,
      hasWaterTower: Math.random() > 0.6,
      hasAntenna: Math.random() > 0.5
    };

    // Precompute window grid for full-height cyberpunk skyscraper glow down to the very bottom
    const cols = Math.floor((width - 30) / 36);
    const rows = Math.floor((height - 15) / 44);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.3) {
          building.windows.push({
            x: 22 + c * 36,
            y: 25 + r * 44,
            lit: Math.random() > 0.2
          });
        }
      }
    }

    this.buildings.push(building);

    // =========================================================================
    // 1. PHYSICAL BUILDING ANCHOR POINTS (No floating air anchors!)
    // =========================================================================
    // Top-Left Corner of Skyscraper
    this.anchorNodes.push({
      x: x + 10,
      y: y + 10,
      type: 'CORNER_LEFT',
      radius: 14,
      building: building,
      pulse: Math.random() * Math.PI
    });

    // Top-Right Corner of Skyscraper
    this.anchorNodes.push({
      x: x + width - 10,
      y: y + 10,
      type: 'CORNER_RIGHT',
      radius: 14,
      building: building,
      pulse: Math.random() * Math.PI
    });

    // Optional Construction Crane extending above building roof
    if (building.hasCrane) {
      const craneHeight = y - (110 + Math.random() * 90);
      const craneX = x + width * 0.5;
      this.anchorNodes.push({
        x: craneX,
        y: craneHeight,
        type: 'CRANE_ARM',
        radius: 16,
        building: building,
        craneBaseX: x + width * 0.5,
        craneBaseY: y,
        pulse: Math.random() * Math.PI
      });
    }

    // 2. Collectibles: Daily Bugle Photos / Spider Emblems floating in gap ahead
    if (Math.random() > 0.3) {
      const tokenType = Math.random() > 0.35 ? 'BUGLE_PHOTO' : 'SPIDER_EMBLEM';
      this.tokens.push({
        x: x + width + 100 + Math.random() * 80,
        y: y - (80 + Math.random() * 160),
        type: tokenType,
        radius: 20,
        collected: false,
        hoverOffset: Math.random() * Math.PI
      });
    }

    // 3. Hazards (Rooftop Steam Vent or Gap Drone)
    if (canHaveHazards && Math.random() > 0.55) {
      if (Math.random() > 0.5) {
        // Patrol Drone hovering between buildings
        this.hazards.push({
          type: 'DRONE',
          x: x + width + 140,
          y: y - 120 - Math.random() * 100,
          baseY: y - 120 - Math.random() * 100,
          radius: 22,
          patrolSpeed: 2.2 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2
        });
      } else {
        // Rooftop Steam Vent Boost
        this.hazards.push({
          type: 'STEAM_VENT',
          x: x + width * 0.5 - 28,
          y: y - 10,
          width: 56,
          height: 220
        });
      }
    }
  }

  generateNextChunk() {
    // Gap between skyscrapers (160 to 280 px)
    const gap = 160 + Math.random() * 260;
    const nextX = this.lastSpawnX + gap;
    const width = 340 + Math.random() * 420;
    // Skyscraper height variations (rooftop y between 180 and 500 - towering city canyons!)
    const y = 180 + Math.random() * 320;
    const height = 1500 - y;

    this.addBuilding(nextX, y, width, height, true);
    this.lastSpawnX = nextX + width;
  }

  generateNextBgBuilding() {
    const gap = 40 + Math.random() * 120;
    const nextX = this.lastBgSpawnX + gap;
    const width = 200 + Math.random() * 300;
    const y = 350 + Math.random() * 300;
    const height = 1500 - y;
    const color = this.bgColors[Math.floor(Math.random() * this.bgColors.length)];

    this.bgBuildings.push({
      x: nextX,
      y,
      width,
      height,
      color
    });
    this.lastBgSpawnX = nextX + width;
  }

  /**
   * Updates world generation and animated hazards based on camera position
   */
  update(cameraX, dt) {
    // Generate new foreground chunk ahead of camera
    if (this.lastSpawnX < cameraX + 2800) {
      this.generateNextChunk();
    }
    // Generate background skyscrapers
    if (this.lastBgSpawnX < cameraX + 3200) {
      this.generateNextBgBuilding();
    }

    // Clean up far-behind objects
    const removeThresholdX = cameraX - 1400;
    if (this.buildings.length > 0 && this.buildings[0].x + this.buildings[0].width < removeThresholdX) {
      this.buildings.shift();
    }
    if (this.bgBuildings.length > 0 && this.bgBuildings[0].x + this.bgBuildings[0].width < removeThresholdX) {
      this.bgBuildings.shift();
    }
    this.anchorNodes = this.anchorNodes.filter(n => n.x > removeThresholdX);
    this.tokens = this.tokens.filter(t => !t.collected && t.x > removeThresholdX);
    this.hazards = this.hazards.filter(h => h.x > removeThresholdX);

    // Animate tokens & anchor pulse
    const dtScaled = performance.now() * 0.003;
    this.anchorNodes.forEach(node => {
      node.pulse = (node.pulse + dt * 4) % (Math.PI * 2);
    });

    this.tokens.forEach(token => {
      token.hoverOffset = (token.hoverOffset + dt * 3) % (Math.PI * 2);
    });

    // Animate drones
    this.hazards.forEach(hazard => {
      if (hazard.type === 'DRONE') {
        hazard.phase += hazard.patrolSpeed * dt;
        hazard.y = hazard.baseY + Math.sin(hazard.phase) * 75;
      }
    });
  }

  /**
   * Finds the best forward physical building anchor point for keyboard targeting
   */
  getBestAnchor(playerX, playerY, maxRange = 850) {
    let bestAnchor = null;
    let bestScore = -Infinity;

    for (const node of this.anchorNodes) {
      const dx = node.x - playerX;
      const dy = node.y - playerY;
      const dist = Math.hypot(dx, dy);

      // Must be within range, ahead of player (dx > -60), and above player (dy < 120)
      if (dist < maxRange && dx > -60 && dy < 120) {
        // Score favors forward distance, height, and cranes
        let score = dx * 1.9 - Math.abs(dy) * 0.4 - dist * 0.25;
        if (node.type === 'CRANE_ARM') score += 180;
        if (score > bestScore) {
          bestScore = score;
          bestAnchor = node;
        }
      }
    }
    return bestAnchor;
  }

  /**
   * Finds physical building anchor nearest to mouse click coordinates
   */
  getAnchorNearPoint(worldX, worldY, tolerance = 180) {
    let closest = null;
    let minDist = Infinity;
    for (const node of this.anchorNodes) {
      const dist = Math.hypot(node.x - worldX, node.y - worldY);
      if (dist < tolerance && dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }
    return closest;
  }
}

window.worldManager = new WorldManager();
