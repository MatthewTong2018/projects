const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// UI Elements
const sequenceTypeSelect = document.getElementById('sequenceType');
const startDirectionSelect = document.getElementById('startDirection');
const turnDirectionSelect = document.getElementById('turnDirection');
const turnDirectionGroup = document.getElementById('turnDirectionGroup');
const axisModeToggle = document.getElementById('axisMode');
const speedControl = document.getElementById('speedControl');
const zoomControl = document.getElementById('zoomControl');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const stepCountEl = document.getElementById('stepCount');
const currentNumEl = document.getElementById('currentNum');
const currentPosEl = document.getElementById('currentPos');
const speedValueEl = document.getElementById('speedValue');
const zoomValueEl = document.getElementById('zoomValue');
const labelOrthogonal = document.getElementById('label-orthogonal');
const labelDiagonal = document.getElementById('label-diagonal');

// State
let isRunning = false;
let animationId = null;
let path = [];
let currentStep = 0;
let currentNum = 1;
let currentDir = 0; // 0, 1, 2, 3
let currentPos = { x: 0, y: 0 };
// Constrain to 10000x10000 grid (-5000 to 5000)
const GRID_BOUND = 5000;

// Config
let zoom = parseInt(zoomControl.value); // pixels per grid unit
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

function clampView() {
    // Allow zooming out up to 0.05px per unit (very zoomed out)
    zoom = Math.max(0.05, Math.min(zoom, 100));
    
    // Keep the origin within a generous bounding box so the user doesn't get completely lost
    // (1.5x the GRID_BOUND)
    const bound = GRID_BOUND * zoom * 1.5;
    offsetX = Math.max(-bound + canvas.width / 2, Math.min(bound + canvas.width / 2, offsetX));
    offsetY = Math.max(-bound + canvas.height / 2, Math.min(bound + canvas.height / 2, offsetY));
}

// Resize Canvas
function resize() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    if (path.length === 0) {
        offsetX = canvas.width / 2;
        offsetY = canvas.height / 2;
    }
    clampView();
    render();
}
window.addEventListener('resize', resize);

function updateTurnDirectionVisibility() {
    turnDirectionGroup.style.display = sequenceTypeSelect.value === 'primes' ? 'flex' : 'none';
}

// Initialization
function init() {
    resize();
    updateTurnDirectionVisibility();
    resetState();
    updateToggleLabels();
}

function resetState() {
    path = [{ x: 0, y: 0 }];
    currentStep = 0;
    currentNum = 1;
    currentDir = parseInt(startDirectionSelect.value);
    currentPos = { x: 0, y: 0 };
    // Center view
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    
    updateStats();
    render();
}

// Math Helpers
function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}


// Movement Logic
const ORTHOGONAL_DIRS = [
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
    { x: 0, y: -1 }  // Up
];

const DIAGONAL_DIRS = [
    { x: 1, y: 1 },   // Down-Right
    { x: -1, y: 1 },  // Down-Left
    { x: -1, y: -1 }, // Up-Left
    { x: 1, y: -1 }   // Up-Right
];

function step() {
    const type = sequenceTypeSelect.value;
    const isDiagonal = axisModeToggle.checked;
    const dirs = isDiagonal ? DIAGONAL_DIRS : ORTHOGONAL_DIRS;
    
    if (type === 'primes') {
        currentNum++;
        currentPos.x += dirs[currentDir].x;
        currentPos.y += dirs[currentDir].y;
        
        if (isPrime(currentNum)) {
            const turnDir = turnDirectionSelect.value;
            if (turnDir === 'left') {
                currentDir = (currentDir + 3) % 4; // turn left
            } else {
                currentDir = (currentDir + 1) % 4; // turn right
            }
        }
    } 
    else if (type === 'random') {
        // Random walk: left, right, or straight
        const r = Math.random();
        if (r < 0.333) {
            currentDir = (currentDir + 3) % 4; // left
        } else if (r > 0.666) {
            currentDir = (currentDir + 1) % 4; // right
        }
        // else straight (currentDir unchanged)
        
        currentPos.x += dirs[currentDir].x;
        currentPos.y += dirs[currentDir].y;
        currentNum++;
    }

    currentStep++;
    path.push({ x: currentPos.x, y: currentPos.y });
}

function getGridStep(zoom) {
    const minPixels = 80;
    const rawStep = minPixels / zoom;
    
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / mag;
    
    let stepMult = 1;
    if (normalized > 5) stepMult = 10;
    else if (normalized > 2) stepMult = 5;
    else if (normalized > 1) stepMult = 2;
    else stepMult = 1;
    
    return stepMult * mag;
}

function render() {
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (path.length === 0) return;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);
    
    // Determine bounds based on current view
    const left = -offsetX / zoom;
    const right = (canvas.width - offsetX) / zoom;
    const top = -offsetY / zoom;
    const bottom = (canvas.height - offsetY) / zoom;
    
    const step = getGridStep(zoom);
    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;

    // Draw Grid (adaptive)
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    for (let x = startX; x <= right; x += step) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += step) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
    }
    ctx.stroke();

    // Draw Main Axes (Quadrants)
    ctx.lineWidth = 2 / zoom;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    // Y-axis
    if (0 >= left && 0 <= right) {
        ctx.moveTo(0, top);
        ctx.lineTo(0, bottom);
    }
    // X-axis
    if (0 >= top && 0 <= bottom) {
        ctx.moveTo(left, 0);
        ctx.lineTo(right, 0);
    }
    ctx.stroke();

    // Draw Labels
    ctx.fillStyle = '#666666';
    ctx.font = `${13 / zoom}px -apple-system, sans-serif`;
    
    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = startX; x <= right; x += step) {
        if (Math.abs(x) < 1e-10) continue;
        let yPos = 0;
        if (0 < top) yPos = top;
        else if (0 > bottom) yPos = bottom;
        ctx.fillText(Math.round(x * 100) / 100, x, yPos + (6 / zoom));
    }

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = startY; y <= bottom; y += step) {
        if (Math.abs(y) < 1e-10) continue;
        let xPos = 0;
        if (0 < left) xPos = left;
        else if (0 > right) xPos = right;
        // In canvas +y is down. To mimic standard Cartesian (like Desmos), label negative canvas y as positive math y.
        ctx.fillText(Math.round(-y * 100) / 100, xPos - (6 / zoom), y);
    }

    // Origin label
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    let oX = 0; if (0 < left) oX = left; else if (0 > right) oX = right;
    let oY = 0; if (0 < top) oY = top; else if (0 > bottom) oY = bottom;
    ctx.fillText("0", oX - (6 / zoom), oY + (6 / zoom));

    // Draw Path
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    
    // Path styling
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.5, 1.5 / zoom);
    
    // Gradient coloring over time
    ctx.strokeStyle = '#2d70b3'; // Desmos blue
    ctx.stroke();

    // Draw start point
    ctx.fillStyle = '#388c46'; // Desmos green
    ctx.beginPath();
    ctx.arc(path[0].x, path[0].y, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();

    // Draw current head
    const head = path[path.length - 1];
    ctx.fillStyle = '#c74440'; // Desmos red
    ctx.beginPath();
    ctx.arc(head.x, head.y, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function updateStats() {
    stepCountEl.textContent = currentStep;
    currentNumEl.textContent = currentNum;
    currentPosEl.textContent = `(${currentPos.x}, ${currentPos.y})`;
}

function loop() {
    if (isRunning) {
        const stepsPerFrame = parseInt(speedControl.value);
        for (let i = 0; i < stepsPerFrame; i++) {
            step();
            // Stop if we exceed bounds of the 2000x2000 grid
            if (Math.abs(currentPos.x) > GRID_BOUND || Math.abs(currentPos.y) > GRID_BOUND) {
                isRunning = false;
                pauseBtn.style.display = 'none';
                startBtn.style.display = 'block';
                break;
            }
        }
        updateStats();
        render();
    }
    animationId = requestAnimationFrame(loop);
}

// Event Listeners
startBtn.addEventListener('click', () => {
    isRunning = true;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    if (!animationId) loop();
});

pauseBtn.addEventListener('click', () => {
    isRunning = false;
    startBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
});

resetBtn.addEventListener('click', () => {
    resetState();
});

sequenceTypeSelect.addEventListener('change', () => {
    updateTurnDirectionVisibility();
    resetState();
});

startDirectionSelect.addEventListener('change', () => {
    resetState();
});

turnDirectionSelect.addEventListener('change', () => {
    resetState();
});

function updateToggleLabels() {
    if (axisModeToggle.checked) {
        labelDiagonal.style.color = '#333';
        labelOrthogonal.style.color = 'var(--text-secondary)';
    } else {
        labelOrthogonal.style.color = '#333';
        labelDiagonal.style.color = 'var(--text-secondary)';
    }
}

axisModeToggle.addEventListener('change', () => {
    updateToggleLabels();
    resetState();
});

speedControl.addEventListener('input', (e) => {
    speedValueEl.textContent = e.target.value;
});

zoomControl.addEventListener('input', (e) => {
    zoom = parseInt(e.target.value);
    zoomValueEl.textContent = zoom;
    render();
});

// Panning
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isDragging = false;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    offsetX += dx;
    offsetY += dy;
    lastMouse = { x: e.clientX, y: e.clientY };
    clampView();
    render();
});

// Wheel zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    
    // Calculate mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to world coordinates
    const worldX = (mouseX - offsetX) / zoom;
    const worldY = (mouseY - offsetY) / zoom;

    // Apply zoom
    zoom *= zoomFactor;
    
    // Clamp zoom
    zoom = Math.max(0.1, Math.min(zoom, 100));
    
    // Update zoom slider (approximate)
    zoomControl.value = Math.min(50, Math.max(1, Math.round(zoom)));
    zoomValueEl.textContent = zoomControl.value;

    // Adjust offset to zoom towards mouse
    offsetX = mouseX - worldX * zoom;
    offsetY = mouseY - worldY * zoom;

    clampView();
    render();
});

// Setup
pauseBtn.style.display = 'none';
init();
