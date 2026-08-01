/**
 * Spider-Man: Brand New Day - Canvas Renderer & Animated Pixel-Art Hero (v2 Overhaul)
 * Renders 60FPS viewport, dynamic zoom, atmospheric background skyscrapers,
 * physical building anchor knots, predictive trajectory arc, and a custom-animated
 * multi-pose Pixel-Art Spider-Man character.
 */

class GameRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.cameraX = 0;
    this.cameraY = 550;
    this.zoom = 1.0;

    this.showTrajectory = true;
    this.particles = [];

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';

    this.ctx.scale(dpr, dpr);
    this.width = width;
    this.height = height;
  }

  /**
   * Smooth camera follow with forward look-ahead and speed zoom
   */
  updateCamera(player, dt) {
    const lookAheadX = player.x + Math.min(650, player.vx * 0.45);
    const lookAheadY = Math.min(950, Math.max(380, player.y - 60));

    const smooth = 1 - Math.pow(0.015, dt);
    this.cameraX += (lookAheadX - this.cameraX) * smooth;
    this.cameraY += (lookAheadY - this.cameraY) * smooth;

    const speed = Math.hypot(player.vx, player.vy);
    const targetZoom = Math.max(0.72, 1.0 - (speed / 3200) * 0.28);
    this.zoom += (targetZoom - this.zoom) * (smooth * 0.85);
  }

  /**
   * Main viewport render frame
   */
  render(player, world, dt) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Dramatic Sky & Atmospheric Background Skyscrapers
    this.drawSkyAndBgBuildings(world);

    this.ctx.save();
    this.ctx.translate(this.width * 0.3, this.height * 0.6);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // 2. Draw Playable Foreground Skyscrapers & Physical Anchor Nodes
    this.drawForegroundBuildings(world);
    this.drawAnchorNodes(world, player);

    // 3. Draw Collectibles & Hazards
    this.drawTokens(world);
    this.drawHazards(world);

    // 4. Draw Predictive Trajectory Arc (Spider-Sense)
    if (this.showTrajectory && player.state !== 'DEAD') {
      this.drawTrajectoryArc(player, world);
    }

    // 5. Draw Web Line from Spidey's Wrist to Physical Building Corner
    if (player.state === 'SWINGING' && player.activeAnchor) {
      this.drawWebLine(player, player.activeAnchor);
    }

    // 6. Draw Animated Pixel-Art Spider-Man
    this.drawPixelSpidey(player);

    // 7. Draw Particle Systems
    this.updateAndDrawParticles(dt);

    this.ctx.restore();

    // 8. Sonic boom speed lines at high velocities
    const speedKmH = player.getCurrentSpeedKmH();
    if (speedKmH > 80) {
      this.drawSonicBoomLines(speedKmH, dt);
    }
  }

  drawSkyAndBgBuildings(world) {
    // Sunset-to-Night Brand New Day sky gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, 'hsl(255, 50%, 10%)');
    skyGrad.addColorStop(0.5, 'hsl(285, 60%, 20%)');
    skyGrad.addColorStop(0.8, 'hsl(15, 90%, 32%)');
    skyGrad.addColorStop(1, 'hsl(225, 45%, 7%)');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Atmospheric Background Skyscrapers (parallax layer)
    this.ctx.save();
    this.ctx.translate(this.width * 0.3, this.height * 0.6);
    this.ctx.scale(this.zoom * 0.8, this.zoom * 0.8);
    this.ctx.translate(-this.cameraX * 0.4, -this.cameraY * 0.5);

    for (const bg of world.bgBuildings) {
      this.ctx.fillStyle = bg.color;
      this.ctx.fillRect(bg.x, bg.y, bg.width, bg.height);

      // Simple faint window lights
      this.ctx.fillStyle = 'hsla(190, 100%, 70%, 0.12)';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          this.ctx.fillRect(bg.x + 20 + c * 40, bg.y + 30 + r * 60, 14, 24);
        }
      }
    }
    this.ctx.restore();
  }

  drawForegroundBuildings(world) {
    for (const b of world.buildings) {
      // Main Skyscraper Body
      this.ctx.fillStyle = b.theme.body;
      this.ctx.fillRect(b.x, b.y, b.width, b.height);

      // Lighter facade edge
      this.ctx.fillStyle = b.theme.border;
      this.ctx.fillRect(b.x, b.y, 8, b.height);

      // Neon Top Ledge Border
      this.ctx.strokeStyle = b.theme.window;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(b.x + b.width, b.y);
      this.ctx.stroke();

      // Cyberpunk Windows
      this.ctx.fillStyle = b.theme.window;
      for (const win of b.windows) {
        if (win.lit) {
          this.ctx.shadowColor = b.theme.window;
          this.ctx.shadowBlur = 10;
          this.ctx.fillRect(b.x + win.x, b.y + win.y, 18, 28);
          this.ctx.shadowBlur = 0;
        } else {
          this.ctx.fillStyle = 'hsla(225, 20%, 25%, 0.4)';
          this.ctx.fillRect(b.x + win.x, b.y + win.y, 18, 28);
          this.ctx.fillStyle = b.theme.window;
        }
      }

      // Construction Crane Truss (if present on roof)
      if (b.hasCrane) {
        this.drawDetailedCrane(b);
      }
    }
  }

  /**
   * Draws a highly detailed Lattice-Steel construction crane with operator cabin,
   * counter-jib, counterweight blocks, suspension cables, and hanging trolley hook.
   */
  drawDetailedCrane(b) {
    const craneBaseX = b.x + b.width * 0.5;
    const roofY = b.y;
    const towerTopY = roofY - 145;

    this.ctx.save();
    this.ctx.strokeStyle = 'hsl(45, 95%, 50%)'; // Caterpillar Yellow
    this.ctx.lineWidth = 2.5;

    // 1. Vertical Lattice Tower Chords
    this.ctx.beginPath();
    this.ctx.moveTo(craneBaseX - 14, roofY);
    this.ctx.lineTo(craneBaseX - 14, towerTopY);
    this.ctx.moveTo(craneBaseX + 14, roofY);
    this.ctx.lineTo(craneBaseX + 14, towerTopY);
    this.ctx.stroke();

    // Criss-cross X-bracing on vertical tower
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    for (let y = roofY; y > towerTopY + 15; y -= 24) {
      this.ctx.moveTo(craneBaseX - 14, y);
      this.ctx.lineTo(craneBaseX + 14, y - 24);
      this.ctx.moveTo(craneBaseX + 14, y);
      this.ctx.lineTo(craneBaseX - 14, y - 24);
    }
    this.ctx.stroke();

    // 2. Operator Control Cabin at Top of Tower
    this.ctx.fillStyle = 'hsl(45, 90%, 45%)';
    this.ctx.fillRect(craneBaseX - 22, towerTopY - 16, 44, 26);
    // Glowing Cyan Glass Window
    this.ctx.fillStyle = 'hsl(190, 100%, 65%)';
    this.ctx.shadowColor = 'hsl(190, 100%, 65%)';
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(craneBaseX - 16, towerTopY - 12, 32, 14);
    this.ctx.shadowBlur = 0;

    // 3. Horizontal Boom & Rear Counter-Jib
    this.ctx.strokeStyle = 'hsl(45, 95%, 52%)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(craneBaseX - 85, towerTopY - 8);
    this.ctx.lineTo(craneBaseX + 135, towerTopY - 8);
    this.ctx.stroke();

    // Triangular Truss on Front Boom
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    for (let x = craneBaseX + 18; x < craneBaseX + 125; x += 18) {
      this.ctx.moveTo(x, towerTopY - 8);
      this.ctx.lineTo(x + 9, towerTopY - 20);
      this.ctx.lineTo(x + 18, towerTopY - 8);
    }
    this.ctx.stroke();

    // 4. Rear Concrete Counterweight Blocks
    this.ctx.fillStyle = 'hsl(220, 15%, 35%)';
    this.ctx.fillRect(craneBaseX - 78, towerTopY - 4, 38, 16);

    // 5. A-Frame Suspension Gantry & High-Tension Cables
    const peakY = towerTopY - 45;
    this.ctx.strokeStyle = 'hsl(45, 90%, 48%)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(craneBaseX - 12, towerTopY - 16);
    this.ctx.lineTo(craneBaseX, peakY);
    this.ctx.lineTo(craneBaseX + 12, towerTopY - 16);
    this.ctx.stroke();

    // High-Tension Suspension Cables
    this.ctx.strokeStyle = 'hsla(210, 20%, 75%, 0.7)';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(craneBaseX, peakY);
    this.ctx.lineTo(craneBaseX + 105, towerTopY - 8);
    this.ctx.moveTo(craneBaseX, peakY);
    this.ctx.lineTo(craneBaseX - 65, towerTopY - 8);
    this.ctx.stroke();

    // 6. Trolley & Hanging Hook Beacon at Boom Tip
    this.ctx.fillStyle = 'hsl(45, 95%, 55%)';
    this.ctx.fillRect(craneBaseX + 98, towerTopY - 6, 14, 8);

    // Warning Red Beacon at Tip
    this.ctx.fillStyle = 'hsl(354, 95%, 55%)';
    this.ctx.shadowColor = 'hsl(354, 95%, 55%)';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(craneBaseX + 135, towerTopY - 10, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawAnchorNodes(world, player) {
    const bestAnchor = world.getBestAnchor(player.x, player.y);

    for (const node of world.anchorNodes) {
      const isTarget = (node === bestAnchor) || (player.activeAnchor === node);

      this.ctx.save();
      this.ctx.translate(node.x, node.y);

      // Target Crosshair at the building corner / ledge
      const glowColor = isTarget ? 'hsl(354, 95%, 60%)' : 'hsla(190, 100%, 75%, 0.7)';
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = isTarget ? 20 : 8;

      this.ctx.strokeStyle = glowColor;
      this.ctx.lineWidth = isTarget ? 3 : 1.5;

      const radius = node.radius + (isTarget ? Math.sin(node.pulse) * 3 : 0);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Corner Anchor Knot indicator
      this.ctx.fillStyle = glowColor;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
      this.ctx.fill();

      if (isTarget) {
        // High-tech target bracket around physical building corner
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-radius - 8, 0); this.ctx.lineTo(-radius - 2, 0);
        this.ctx.moveTo(radius + 2, 0); this.ctx.lineTo(radius + 8, 0);
        this.ctx.moveTo(0, -radius - 8); this.ctx.lineTo(0, -radius - 2);
        this.ctx.moveTo(0, radius + 2); this.ctx.lineTo(0, radius + 8);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  drawTokens(world) {
    for (const t of world.tokens) {
      if (t.collected) continue;
      this.ctx.save();
      this.ctx.translate(t.x, t.y + Math.sin(t.hoverOffset) * 8);

      if (t.type === 'BUGLE_PHOTO') {
        this.drawCameraIcon();
      } else {
        this.ctx.shadowColor = 'hsl(354, 90%, 55%)';
        this.ctx.shadowBlur = 16;
        this.ctx.fillStyle = 'hsl(354, 90%, 55%)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  /**
   * Draws a crisp, vector DSLR camera collectible icon for Daily Bugle photo tokens
   * natively in Canvas (no AI image textures).
   */
  drawCameraIcon() {
    // Golden outer aura
    this.ctx.shadowColor = 'hsl(43, 96%, 58%)';
    this.ctx.shadowBlur = 18;
    this.ctx.strokeStyle = 'hsl(43, 96%, 58%)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
    this.ctx.stroke();

    // Dark Silver DSLR Camera Body
    this.ctx.fillStyle = 'hsl(215, 18%, 22%)';
    this.ctx.fillRect(-14, -10, 28, 20);

    // Camera Top Shutter & Viewfinder
    this.ctx.fillStyle = 'hsl(215, 15%, 35%)';
    this.ctx.fillRect(-6, -14, 12, 4);
    this.ctx.fillRect(8, -13, 4, 3); // Shutter button

    // Silver Lens Ring
    this.ctx.strokeStyle = 'hsl(215, 20%, 75%)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    // Glowing Cyan Glass Lens
    this.ctx.fillStyle = 'hsl(190, 100%, 65%)';
    this.ctx.shadowColor = 'hsl(190, 100%, 65%)';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // White Lens Reflection Specular Highlight
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    this.ctx.arc(-2, -2, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawHazards(world) {
    for (const haz of world.hazards) {
      if (haz.type === 'STEAM_VENT') {
        this.ctx.fillStyle = 'hsla(190, 100%, 75%, 0.16)';
        this.ctx.fillRect(haz.x, haz.y - haz.height, haz.width, haz.height);
        this.ctx.fillStyle = 'hsl(225, 30%, 40%)';
        this.ctx.fillRect(haz.x, haz.y - 8, haz.width, 8);
      } else if (haz.type === 'DRONE') {
        this.ctx.save();
        this.ctx.translate(haz.x, haz.y);

        this.ctx.shadowColor = 'hsl(354, 95%, 55%)';
        this.ctx.shadowBlur = 16;
        this.ctx.fillStyle = 'hsl(225, 35%, 22%)';
        this.ctx.strokeStyle = 'hsl(354, 95%, 55%)';
        this.ctx.lineWidth = 2.5;

        this.ctx.beginPath();
        this.ctx.arc(0, 0, haz.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = 'hsl(354, 95%, 55%)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
  }

  drawTrajectoryArc(player, world) {
    const points = window.physicsEngine.calculateTrajectory(
      player.x,
      player.y,
      player.vx,
      player.vy,
      30,
      0.04
    );

    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.setLineDash([7, 7]);
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = 'hsla(190, 100%, 65%, 0.75)';
    this.ctx.shadowColor = 'hsl(190, 100%, 65%)';
    this.ctx.shadowBlur = 12;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();

    const last = points[points.length - 1];
    this.ctx.setLineDash([]);
    this.ctx.strokeStyle = 'hsl(43, 96%, 60%)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawWebLine(player, anchor) {
    this.ctx.save();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3.5;
    this.ctx.shadowColor = 'hsl(190, 100%, 75%)';
    this.ctx.shadowBlur = 12;

    // Web starts at Spidey's extended hand position
    const angle = Math.atan2(anchor.y - player.y, anchor.x - player.x);
    const handX = player.x + Math.cos(angle) * 18;
    const handY = player.y + Math.sin(angle) * 18;

    this.ctx.beginPath();
    this.ctx.moveTo(handX, handY);
    this.ctx.lineTo(anchor.x, anchor.y);
    this.ctx.stroke();

    // Web splatter/knot at the physical building corner
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(anchor.x, anchor.y, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * =========================================================================
   * ANIMATED PIXEL-ART SPIDER-MAN CHARACTER DRAWER
   * Renders crisp 16x16 / 24x24 multi-color pixel art with dynamic pose states
   * =========================================================================
   */
  drawPixelSpidey(player) {
    this.ctx.save();
    this.ctx.translate(player.x, player.y);

    const size = 3.5; // pixel block scale (1 pixel unit = 3.5 canvas px)

    // Determine character pose based on player state
    let pose = 'AIR_FALL';
    if (player.state === 'SWINGING' && player.activeAnchor) {
      pose = 'SWING';
      // Rotate body toward web line
      const angle = Math.atan2(player.activeAnchor.y - player.y, player.activeAnchor.x - player.x);
      this.ctx.rotate(angle - Math.PI * 0.5);
    } else if (player.state === 'RUNNING') {
      pose = 'RUN_' + (Math.floor(player.animFrame) % 4);
    } else if (player.state === 'DASH') {
      pose = 'DASH';
      const angle = Math.atan2(player.vy, player.vx);
      this.ctx.rotate(angle);
    } else {
      // Free Fall: rising vs diving
      if (player.vy < -50) pose = 'AIR_RISE';
      else pose = 'AIR_FALL';
    }

    // Helper to draw a pixel block at relative grid coordinates (dx, dy)
    const drawPx = (dx, dy, color) => {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(dx * size, dy * size, size, size);
    };

    const RED = 'hsl(354, 90%, 55%)';
    const BLUE = 'hsl(216, 95%, 50%)';
    const WHITE = '#ffffff';
    const DARK = 'hsl(225, 40%, 15%)';

    if (pose === 'SWING') {
      // =====================================================================
      // SWING POSE: Arm shooting straight up toward building anchor, legs tucked
      // =====================================================================
      // Extended web-shooter arm (straight UP toward anchor)
      drawPx(-1, -6, RED); drawPx(0, -6, RED); drawPx(1, -6, RED);
      drawPx(-1, -5, RED); drawPx(0, -5, RED); drawPx(1, -5, RED);
      drawPx(-1, -4, BLUE); drawPx(0, -4, RED); drawPx(1, -4, BLUE);

      // Masked Head (looking up)
      drawPx(-2, -3, RED); drawPx(-1, -3, RED); drawPx(0, -3, RED); drawPx(1, -3, RED); drawPx(2, -3, RED);
      drawPx(-2, -2, RED); drawPx(-1, -2, WHITE); drawPx(0, -2, RED); drawPx(1, -2, WHITE); drawPx(2, -2, RED);
      drawPx(-2, -1, RED); drawPx(-1, -1, RED); drawPx(0, -1, RED); drawPx(1, -1, RED); drawPx(2, -1, RED);

      // Torso with White Spider Emblem
      drawPx(-2, 0, BLUE); drawPx(-1, 0, RED); drawPx(0, 0, WHITE); drawPx(1, 0, RED); drawPx(2, 0, BLUE);
      drawPx(-2, 1, BLUE); drawPx(-1, 1, RED); drawPx(0, 1, RED); drawPx(1, 1, RED); drawPx(2, 1, BLUE);
      drawPx(-2, 2, BLUE); drawPx(-1, 2, RED); drawPx(0, 2, WHITE); drawPx(1, 2, RED); drawPx(2, 2, BLUE);

      // Tucked Swing Legs (crouched comic pose)
      drawPx(-3, 3, BLUE); drawPx(-2, 3, BLUE); drawPx(1, 3, BLUE); drawPx(2, 3, BLUE);
      drawPx(-4, 4, RED);  drawPx(-3, 4, RED);  drawPx(2, 4, RED);  drawPx(3, 4, RED);
      drawPx(-3, 5, RED);  drawPx(2, 5, RED);
    } else if (pose === 'AIR_RISE' || pose === 'AIR_FALL') {
      // =====================================================================
      // AIR / FALL POSE: Spread arms and legs in dynamic mid-air dive
      // =====================================================================
      // Masked Head
      drawPx(-2, -5, RED); drawPx(-1, -5, RED); drawPx(0, -5, RED); drawPx(1, -5, RED); drawPx(2, -5, RED);
      drawPx(-2, -4, RED); drawPx(-1, -4, WHITE); drawPx(0, -4, RED); drawPx(1, -4, WHITE); drawPx(2, -4, RED);
      drawPx(-2, -3, RED); drawPx(-1, -3, RED); drawPx(0, -3, RED); drawPx(1, -3, RED); drawPx(2, -3, RED);

      // Spread Arms
      drawPx(-4, -2, RED); drawPx(-3, -2, BLUE); drawPx(3, -2, BLUE); drawPx(4, -2, RED);
      drawPx(-5, -1, RED); drawPx(-4, -1, RED);  drawPx(4, -1, RED);  drawPx(5, -1, RED);

      // Torso with Spider Symbol
      drawPx(-2, -2, BLUE); drawPx(-1, -2, RED); drawPx(0, -2, WHITE); drawPx(1, -2, RED); drawPx(2, -2, BLUE);
      drawPx(-2, -1, BLUE); drawPx(-1, -1, RED); drawPx(0, -1, RED);   drawPx(1, -1, RED); drawPx(2, -1, BLUE);
      drawPx(-2, 0, BLUE);  drawPx(-1, 0, RED);  drawPx(0, 0, WHITE);  drawPx(1, 0, RED);  drawPx(2, 0, BLUE);
      drawPx(-1, 1, BLUE);  drawPx(0, 1, RED);   drawPx(1, 1, BLUE);

      // Dynamic Trailing Legs
      drawPx(-2, 2, BLUE); drawPx(1, 2, BLUE);
      drawPx(-3, 3, BLUE); drawPx(2, 3, BLUE);
      drawPx(-3, 4, RED);  drawPx(2, 4, RED);
      drawPx(-4, 5, RED);  drawPx(3, 5, RED);
    } else {
      // =====================================================================
      // ROOFTOP RUNNING & DASH POSES: Crisp Pixel Running Frame
      // =====================================================================
      drawPx(-2, -5, RED); drawPx(-1, -5, RED); drawPx(0, -5, RED); drawPx(1, -5, RED); drawPx(2, -5, RED);
      drawPx(-2, -4, RED); drawPx(-1, -4, WHITE); drawPx(0, -4, RED); drawPx(1, -4, WHITE); drawPx(2, -4, RED);

      drawPx(-2, -2, BLUE); drawPx(-1, -2, RED); drawPx(0, -2, WHITE); drawPx(1, -2, RED); drawPx(2, -2, BLUE);
      drawPx(-2, -1, BLUE); drawPx(-1, -1, RED); drawPx(0, -1, RED);   drawPx(1, -1, RED); drawPx(2, -1, BLUE);
      drawPx(-1, 0, BLUE);  drawPx(0, 0, RED);   drawPx(1, 0, BLUE);

      // Alternating legs for run cycle
      const step = Math.floor(player.animFrame) % 2 === 0;
      if (step) {
        drawPx(-2, 1, BLUE); drawPx(1, 1, BLUE);
        drawPx(-3, 2, RED);  drawPx(2, 2, RED);
        drawPx(-4, 3, RED);  drawPx(2, 3, RED);
      } else {
        drawPx(-1, 1, BLUE); drawPx(2, 1, BLUE);
        drawPx(-1, 2, RED);  drawPx(3, 2, RED);
        drawPx(-2, 3, RED);  drawPx(4, 3, RED);
      }
    }

    this.ctx.restore();
  }

  // ==========================================================================
  // PARTICLE SYSTEMS & SPEED EFFECTS
  // ==========================================================================
  spawnThwipSparks(x, y) {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 320,
        vy: (Math.random() - 0.5) * 320,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: 'hsl(190, 100%, 75%)',
        size: 2 + Math.random() * 3
      });
    }
  }

  spawnRoofSparks(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 220,
        vy: -60 - Math.random() * 160,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color: 'hsl(43, 96%, 65%)',
        size: 2 + Math.random() * 2
      });
    }
  }

  spawnDashTrail(x, y) {
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: x - i * 16,
        y: y + (Math.random() - 0.5) * 18,
        vx: 0,
        vy: 0,
        life: 0.25,
        maxLife: 0.25,
        color: i % 2 === 0 ? 'hsl(354, 90%, 55%)' : 'hsl(216, 95%, 52%)',
        size: 8 - i * 0.4
      });
    }
  }

  spawnCollectParticles(x, y, type) {
    const color = type === 'BUGLE_PHOTO' ? 'hsl(43, 96%, 60%)' : 'hsl(354, 90%, 60%)';
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (160 + Math.random() * 100),
        vy: Math.sin(angle) * (160 + Math.random() * 100),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color,
        size: 3 + Math.random() * 3
      });
    }
  }

  spawnSteamParticles(x, y) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 32,
        y,
        vx: (Math.random() - 0.5) * 45,
        vy: -220 - Math.random() * 220,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: 'hsla(190, 100%, 85%, 0.65)',
        size: 6 + Math.random() * 6
      });
    }
  }

  spawnDroneExplosion(x, y) {
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 420,
        vy: (Math.random() - 0.5) * 420,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: Math.random() > 0.5 ? 'hsl(354, 95%, 55%)' : 'hsl(43, 96%, 60%)',
        size: 4 + Math.random() * 4
      });
    }
  }

  updateAndDrawParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawSonicBoomLines(speedKmH, dt) {
    this.ctx.save();
    this.ctx.strokeStyle = 'hsla(190, 100%, 75%, 0.4)';
    this.ctx.lineWidth = 2.5;

    const count = Math.min(28, Math.floor((speedKmH - 80) * 0.45));
    for (let i = 0; i < count; i++) {
      const y = Math.random() * this.height;
      const len = 120 + Math.random() * 160;
      this.ctx.beginPath();
      this.ctx.moveTo(this.width, y);
      this.ctx.lineTo(this.width - len, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
