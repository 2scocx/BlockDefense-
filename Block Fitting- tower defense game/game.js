document.addEventListener('DOMContentLoaded', () => {
    // Game configuration
    const initialGridSize = 3; // Start with 3x3 grid
    const maxGridSize = 10; // Maximum grid size
    const cellSize = 50; // 50px per cell
    const smallCellSize = 15; // Small cell size for map view
    const maxAvailablePieces = 5; // Maximum available pieces
    const numGrids = 4; // Number of grids to create

    // Tower Defense configuration
    const enemyStartHealth = 15;
    const enemySpeed = 1; // pixels per frame
    const baseTowerDamage = 5; // Base damage per projectile
    const projectileFireRate = 2000; // Fire a projectile every 2 seconds
    const homeBaseFireRate = 1500; // Home base fires faster
    const homeBaseDamage = 10; // Home base deals more damage
    const projectileSpeed = 10; // Slower projectile speed
    const baseEnemySpawnInterval = 5000; // milliseconds (starting value)
    const playerStartLives = 20;

    // Difficulty scaling parameters
    const spawnIntervalReductionThreshold = 100; // Score needed for each spawn interval reduction
    const spawnIntervalReductionAmount = 100; // Milliseconds faster per threshold
    const minSpawnInterval = 1000; // Minimum spawn interval (1 second)
    const enemyHealthIncreaseThreshold = 250; // Score needed for each health increase
    const enemyHealthIncreaseAmount = 15; // Health increase per threshold

    // Set video playback rate to 75% (25% slower)
    const backgroundVideo = document.getElementById('background-video');
    if (backgroundVideo) {
        backgroundVideo.playbackRate = 1;
    }

    // Game elements
    const gridsContainer = document.getElementById('gridsContainer');
    const activeGridContainer = document.getElementById('activeGridContainer');
    const activeGrid = document.getElementById('activeGrid');
    const backToMapBtn = document.getElementById('backToMapBtn');
    const piecesArea = document.getElementById('piecesArea');
    const nextPieceArea = document.getElementById('nextPieceArea');
    const successMessage = document.getElementById('successMessage');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const trashArea = document.getElementById('trashArea');
    const enemyContainer = document.getElementById('enemyContainer');
    const gameStats = document.getElementById('gameStats');
    const lifeCount = document.getElementById('lifeCount');
    const scoreCount = document.getElementById('scoreCount');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const finalScore = document.getElementById('finalScore');
    const restartBtn = document.getElementById('restartBtn');
    const homeBase = document.getElementById('homeBase');
    const gameplayArea = document.querySelector('.gameplay-area');
    
    // Game state
    let grids = []; // Array to store all grid states
    let currentGridIndex = -1; // Index of currently selected grid
    let draggedPiece = null;
    let ghostPiece = null;
    let currentPieceShape = null;
    let currentPieceColor = null;
    let cellsFilled = 0;
    let currentGridSize = initialGridSize; // Track current grid size
    const totalCells = maxGridSize * maxGridSize;
    let piecesQueue = []; // Queue of pieces to be added
    let nextPiece = null; // Next piece to be placed when space available

    // Tower Defense state
    let enemies = [];
    let playerLives = playerStartLives;
    let score = 0;
    let gameOver = false;
    let enemyId = 0;
    let animationFrameId = null;
    let lastEnemySpawnTime = 0;
    let gameTime = 0;
    let buildings = [];
    
    // Coordinates system state
    let gameplayBounds = null;
    
    // Update coordinates system on resize or initialization
    function updateCoordinatesSystem() {
        if (!gameplayArea) return;
        
        // Store previous bounds for relative calculations
        const previousBounds = gameplayBounds ? {...gameplayBounds} : null;
        
        // Get new bounds
        gameplayBounds = gameplayArea.getBoundingClientRect();
        
        // Only update existing positions if we had previous bounds
        if (previousBounds && enemies.length > 0) {
            // Calculate ratio between old and new bounds
            const widthRatio = gameplayBounds.width / previousBounds.width;
            const heightRatio = gameplayBounds.height / previousBounds.height;
            
            // Update existing enemy positions
            enemies.forEach(enemy => {
                // Scale positions based on ratios
                enemy.x = enemy.x * widthRatio;
                enemy.y = enemy.y * heightRatio;
                enemy.startY = enemy.startY * heightRatio;
                enemy.endY = enemy.endY * heightRatio;
                enemy.totalDistance = enemy.totalDistance * widthRatio;
                
                // Update DOM positions
                enemy.element.style.left = enemy.x + 'px';
                enemy.element.style.top = enemy.y + 'px';
            });
        }
        
        // Force update of buildings
        updateBuildings(0);
        
        // Log the updated bounds (for debugging)
        console.log('Gameplay area bounds updated:', gameplayBounds.width, 'x', gameplayBounds.height);
    }
    
    // Add window resize event listener with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Clear previous timeout
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        // Set a new timeout for performance reasons
        resizeTimeout = setTimeout(() => {
            updateCoordinatesSystem();
        }, 100);
    });
    
    // Define Tetris piece shapes (each array represents a block in the piece)
    const pieceShapes = [
        // I piece
        [
            [0, 0], [1, 0], [2, 0], [3, 0]
        ],
        // L piece
        [
            [0, 0], [0, 1], [0, 2], [1, 2]
        ],
        // J piece
        [
            [1, 0], [1, 1], [1, 2], [0, 2]
        ],
        // O piece
        [
            [0, 0], [1, 0], [0, 1], [1, 1]
        ],
        // T piece
        [
            [0, 0], [1, 0], [2, 0], [1, 1]
        ],
        // S piece
        [
            [1, 0], [2, 0], [0, 1], [1, 1]
        ],
        // Z piece
        [
            [0, 0], [1, 0], [1, 1], [2, 1]
        ],
        // U piece
        [
            [0, 0], [2, 0], [0, 1], [1, 1], [2, 1]
        ],
        // X piece
        [
            [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]
        ],
        // Dot piece (single block)
        [
            [0, 0]
        ],
        // Small L piece
        [
            [0, 0], [1, 0], [0, 1]
        ],
        // Small I piece
        [
            [0, 0], [0, 1]
        ],
        // 3x1 piece
        [
            [0, 0], [1, 0], [2, 0]
        ]
    ];
    
    // Colors for the pieces
    const pieceColors = [
        '#00FFFF', // Cyan - I
        '#FFA500', // Orange - L
        '#0000FF', // Blue - J
        '#FFFF00', // Yellow - O
        '#800080', // Purple - T
        '#00FF00', // Green - S
        '#FF0000', // Red - Z
        '#FF69B4', // Pink - U
        '#FF4500', // Orange Red - X
        '#4B0082', // Indigo - Dot
        '#9ACD32', // Yellow Green - Small L
        '#40E0D0', // Turquoise - Small I
        '#A52A2A'  // Brown - 3x1
    ];
    
    // Initialize the game
    function initGame() {
        // Clear any existing game elements
        enemies.forEach(enemy => {
            if (enemy.element && enemy.element.parentNode) {
                enemy.element.parentNode.removeChild(enemy.element);
            }
        });
        
        // Remove any existing projectiles
        document.querySelectorAll('.projectile').forEach(projectile => {
            projectile.remove();
        });
        
        // Remove any existing impacts
        document.querySelectorAll('.impact').forEach(impact => {
            impact.remove();
        });
        
        // Initialize grid and game elements
        initGrids();
        generateInitialPiecesQueue();
        setupControls();
        setupTrashArea();
        
        // Initialize tower defense
        playerLives = playerStartLives;
        score = 0;
        gameOver = false;
        enemies = [];
        enemyId = 0;
        lastEnemySpawnTime = 0;
        gameTime = 0;
        
        // Initialize coordinate system - force a recalculation
        gameplayBounds = null;
        updateCoordinatesSystem();
        
        // Setup home base after coordinates system is initialized
        setupHomeBase();
        
        // Update UI
        lifeCount.textContent = playerLives;
        scoreCount.textContent = score;
        
        // Initialize the game stats display with default values
        updateGameStats(enemyStartHealth, baseEnemySpawnInterval);
        
        // Start game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gameLoop(0);
    }
    
    // Initialize all grids
    function initGrids() {
        grids = [];
        
        // Create grid states
        for (let i = 0; i < numGrids; i++) {
            grids.push({
                grid: Array(initialGridSize).fill().map(() => Array(initialGridSize).fill(0)),
                cellsFilled: 0,
                isCompleted: false,
                level: 0,
                gridSize: initialGridSize
            });
        }
        
        // Create small grid elements for selection
        createSmallGrids();
    }
    
    // Create small grid elements
    function createSmallGrids() {
        gridsContainer.innerHTML = '';
        
        for (let i = 0; i < numGrids; i++) {
            const smallGrid = document.createElement('div');
            smallGrid.className = 'small-grid';
            smallGrid.dataset.gridIndex = i;
            
            // Set the building level if it exists
            if (grids[i].level && grids[i].level > 0) {
                smallGrid.dataset.level = grids[i].level;
            }
            
            // Store grid data in dataset for game logic
            smallGrid.dataset.gridSize = grids[i].gridSize || initialGridSize;
            smallGrid.dataset.cellsFilled = grids[i].cellsFilled;
            
            // Add completion status if the grid is completed
            if (grids[i].isCompleted) {
                smallGrid.classList.add('completed');
            }
            
            // Add click handler to select grid
            smallGrid.addEventListener('click', () => selectGrid(i));
            
            gridsContainer.appendChild(smallGrid);
        }
    }
    
    // Select a grid to play
    function selectGrid(index) {
        currentGridIndex = index;
        
        // Update current grid size based on the selected grid
        currentGridSize = grids[index].gridSize || initialGridSize;
        
        // Hide grids container and show active grid
        gridsContainer.classList.add('hidden');
        activeGridContainer.classList.remove('hidden');
        
        // Create the active grid
        createActiveGrid();
    }
    
    // Back to map view
    function backToMap() {
        // Hide active grid and show grids container
        activeGridContainer.classList.add('hidden');
        gridsContainer.classList.remove('hidden');
        
        // Update small grids to reflect any changes
        createSmallGrids();
        
        // Reset current grid index
        currentGridIndex = -1;
    }
    
    // Create the active grid for gameplay
    function createActiveGrid() {
        activeGrid.innerHTML = '';
        activeGrid.style.gridTemplateColumns = `repeat(${currentGridSize}, ${cellSize}px)`;
        activeGrid.style.gridTemplateRows = `repeat(${currentGridSize}, ${cellSize}px)`;
        activeGrid.style.width = `${currentGridSize * cellSize}px`;
        activeGrid.style.height = `${currentGridSize * cellSize}px`;
        
        for (let y = 0; y < currentGridSize; y++) {
            for (let x = 0; x < currentGridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                // If the cell is filled in the grid state, color it
                if (grids[currentGridIndex].grid[y][x] !== 0) {
                    cell.classList.add('filled');
                    cell.style.backgroundColor = grids[currentGridIndex].grid[y][x];
                }
                
                activeGrid.appendChild(cell);
            }
        }
        
        // Add event listeners for drag and drop on the grid
        activeGrid.addEventListener('dragover', handleDragOver);
        activeGrid.addEventListener('drop', handleDrop);
        activeGrid.addEventListener('dragenter', handleDragEnter);
        activeGrid.addEventListener('dragleave', handleDragLeave);
        activeGrid.addEventListener('mousemove', handleMouseMove);
        activeGrid.addEventListener('mouseleave', removeGhostPiece);
        
        // Add click handler to the container to return to map
        activeGridContainer.addEventListener('click', (e) => {
            // Check if click was outside the grid
            if (!activeGrid.contains(e.target)) {
                backToMap();
            }
        });
    }
    
    // Generate the initial set of random pieces
    function generateInitialPiecesQueue() {
        // Create array of indices and shuffle
        let indices = Array.from({length: pieceShapes.length}, (_, i) => i);
        shuffleArray(indices);
        
        // Create the pieces queue with the shuffled indices
        piecesQueue = indices.map(index => ({
            shape: pieceShapes[index],
            color: pieceColors[index]
        }));
        
        // Initialize pieces area
        updateAvailablePieces();
    }
    
    // Generate a random new piece
    function generateRandomPiece() {
        const randomIndex = Math.floor(Math.random() * pieceShapes.length);
        return {
            shape: pieceShapes[randomIndex],
            color: pieceColors[randomIndex]
        };
    }
    
    // Fisher-Yates shuffle algorithm
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Update the available pieces display
    function updateAvailablePieces() {
        // Clear existing pieces
        piecesArea.innerHTML = '';
        nextPieceArea.innerHTML = '';
        
        // Make sure we have at least maxAvailablePieces + 1 pieces in the queue
        while (piecesQueue.length <= maxAvailablePieces) {
            piecesQueue.push(generateRandomPiece());
        }
        
        // Create a wrapper div for horizontal layout
        const piecesWrapper = document.createElement('div');
        piecesWrapper.className = 'pieces-wrapper';
        piecesWrapper.style.display = 'flex';
        piecesWrapper.style.justifyContent = 'center';
        piecesWrapper.style.gap = '20px';
        piecesArea.appendChild(piecesWrapper);
        
        // Add available pieces (up to maxAvailablePieces)
        for (let i = 0; i < maxAvailablePieces; i++) {
            const pieceData = piecesQueue[i];
            createPieceElement(pieceData.shape, pieceData.color, piecesWrapper, false);
        }
        
        // Show next piece
        const nextPieceData = piecesQueue[maxAvailablePieces];
        nextPiece = createPieceElement(nextPieceData.shape, nextPieceData.color, nextPieceArea, true);
    }
    
    // Create a piece element
    function createPieceElement(shape, color, container, isNextPiece) {
        const piece = document.createElement('div');
        piece.className = 'piece';
        if (isNextPiece) {
            piece.classList.add('next-piece');
        } else {
            piece.draggable = true;
            piece.addEventListener('dragstart', handleDragStart);
            piece.addEventListener('dragend', handleDragEnd);
            piece.addEventListener('click', handlePieceClick);
        }
        
        piece.dataset.shape = JSON.stringify(shape);
        piece.dataset.color = color;
        
        // Determine piece dimensions
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shape.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
        
        const pieceWidth = (maxX - minX + 1) * 30;
        const pieceHeight = (maxY - minY + 1) * 30;
        
        piece.style.width = pieceWidth + 'px';
        piece.style.height = pieceHeight + 'px';
        
        // Create cells for the piece
        shape.forEach(([x, y]) => {
            const cell = document.createElement('div');
            cell.className = 'piece-cell';
            cell.style.backgroundColor = color;
            cell.style.left = (x - minX) * 30 + 'px';
            cell.style.top = (y - minY) * 30 + 'px';
            piece.appendChild(cell);
        });
        
        container.appendChild(piece);
        return piece;
    }
    
    // Reset game
    function resetGame() {
        // Clear all enemies and projectiles
        enemies.forEach(enemy => enemy.element.remove());
        
        enemies = [];
        
        // Reset player stats
        playerLives = playerStartLives;
        score = 0;
        lifeCount.textContent = playerLives;
        scoreCount.textContent = score;
        
        // Reset grid states
        initGrids();
        
        // Hide success/game over messages
        successMessage.classList.add('hidden');
        gameOverMessage.classList.add('hidden');
        
        // Generate new random piece queue
        generateInitialPiecesQueue();
        
        // Go back to map view
        backToMap();
        
        // Reset game state
        gameOver = false;
        
        // Start game loop again
        gameLoop(0);
    }
    
    // Set up control buttons
    function setupControls() {
        // Play again button
        playAgainBtn.addEventListener('click', resetGame);
        
        // Restart button
        restartBtn.addEventListener('click', resetGame);
        
        // Back to map button
        if (backToMapBtn) {
            backToMapBtn.addEventListener('click', backToMap);
        }
    }
    
    // Setup trash area
    function setupTrashArea() {
        // We're no longer using the visible trash area
        // Functionality has been moved to handleDragEnd
    }
    
    // Handle dropping a piece in the trash
    function handleTrashDrop(e) {
        // This function is retained for backwards compatibility
        // but no longer needed as we're using the drag outside method
    }
    
    // Create visual particle effect when trashing a piece
    function createTrashParticleEffect(x, y) {
        const particles = 10;
        
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.className = 'trash-particle';
            
            // Random particle styling
            particle.style.position = 'fixed';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.backgroundColor = currentPieceColor;
            particle.style.borderRadius = '50%';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '100';
            
            // Random particle animation
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 50;
            const duration = 500 + Math.random() * 500;
            
            document.body.appendChild(particle);
            
            // Animate the particle
            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { 
                    transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                    opacity: 0
                }
            ], {
                duration: duration,
                easing: 'ease-out'
            }).onfinish = () => {
                document.body.removeChild(particle);
            };
        }
    }
    
    // Handle piece click for rotation
    function handlePieceClick(e) {
        // Only rotate if not actively dragging
        if (draggedPiece) return;
        
        const piece = this;
        const shape = JSON.parse(piece.dataset.shape);
        const rotatedShape = rotateShape(shape);
        
        // Update piece dataset
        piece.dataset.shape = JSON.stringify(rotatedShape);
        
        // Redraw the piece with new rotated coordinates
        redrawPiece(piece, rotatedShape);
    }
    
    // Rotate a shape 90 degrees clockwise
    function rotateShape(shape) {
        if (shape.length === 1) {
            // Don't rotate single blocks
            return shape;
        }
        
        // Find the min and max coordinates to determine the bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        shape.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
        
        // Calculate the center of the bounding box (not the average of points)
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Rotate each point 90 degrees clockwise around the center
        const rotated = shape.map(([x, y]) => {
            // Translate to origin
            const translatedX = x - centerX;
            const translatedY = y - centerY;
            
            // Rotate 90 degrees clockwise: (x, y) -> (y, -x)
            const rotatedX = translatedY;
            const rotatedY = -translatedX;
            
            // Translate back and round to integers
            return [Math.round(rotatedX + centerX), Math.round(rotatedY + centerY)];
        });
        
        // Find min coordinates of the rotated shape
        let rotatedMinX = Infinity, rotatedMinY = Infinity;
        rotated.forEach(([x, y]) => {
            rotatedMinX = Math.min(rotatedMinX, x);
            rotatedMinY = Math.min(rotatedMinY, y);
        });
        
        // Normalize the shape so it starts from (0,0)
        return rotated.map(([x, y]) => [x - rotatedMinX, y - rotatedMinY]);
    }
    
    // Redraw a piece with a new shape
    function redrawPiece(pieceElement, shape) {
        // Clear existing cells
        while (pieceElement.firstChild) {
            pieceElement.removeChild(pieceElement.firstChild);
        }
        
        // Determine new piece dimensions
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        shape.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });
        
        const pieceWidth = (maxX - minX + 1) * 30;
        const pieceHeight = (maxY - minY + 1) * 30;
        
        // Update piece dimensions
        pieceElement.style.width = pieceWidth + 'px';
        pieceElement.style.height = pieceHeight + 'px';
        
        // Create new cells for the piece
        shape.forEach(([x, y]) => {
            const cell = document.createElement('div');
            cell.className = 'piece-cell';
            cell.style.backgroundColor = pieceElement.dataset.color;
            cell.style.left = (x - minX) * 30 + 'px';
            cell.style.top = (y - minY) * 30 + 'px';
            pieceElement.appendChild(cell);
        });
    }
    
    // Handle drag start event
    function handleDragStart(e) {
        // Only allow dragging if a grid is active
        if (currentGridIndex === -1) return;
        
        draggedPiece = this;
        currentPieceShape = JSON.parse(this.dataset.shape);
        currentPieceColor = this.dataset.color;
        
        // Make the original piece semi-transparent during drag
        this.style.opacity = '0.5';
        
        // Create a custom drag image that looks like the piece
        const dragGhost = this.cloneNode(true);
        dragGhost.style.position = 'absolute';
        dragGhost.style.top = '-1000px';
        document.body.appendChild(dragGhost);
        
        // Set the offset to center the drag image on the cursor
        const pieceRect = this.getBoundingClientRect();
        const offsetX = e.clientX - pieceRect.left;
        const offsetY = e.clientY - pieceRect.top;
        
        e.dataTransfer.setDragImage(dragGhost, offsetX, offsetY);
        
        // Store offset for calculating placement
        e.dataTransfer.setData('text/plain', JSON.stringify({
            offsetX: offsetX,
            offsetY: offsetY
        }));
        
        setTimeout(() => {
            document.body.removeChild(dragGhost);
        }, 0);
    }
    
    // Handle drag end event
    function handleDragEnd(e) {
        // Restore opacity
        this.style.opacity = '1';
        
        // Check if the piece was dragged outside the gameplay area
        if (draggedPiece && currentGridIndex !== -1) {
            const gameplayArea = document.querySelector('.gameplay-area');
            const gameplayRect = gameplayArea.getBoundingClientRect();
            
            // Get cursor position
            const cursorX = e.clientX;
            const cursorY = e.clientY;
            
            // Check if cursor is outside the gameplay area
            if (cursorX < gameplayRect.left || cursorX > gameplayRect.right || 
                cursorY < gameplayRect.top || cursorY > gameplayRect.bottom) {
                
                // Find index of the piece in piecesQueue
                const pieces = Array.from(document.querySelectorAll('.pieces-wrapper .piece'));
                const index = pieces.indexOf(draggedPiece);
                
                // Create a particle effect for visual feedback
                createTrashParticleEffect(cursorX, cursorY);
                
                // Remove piece from queue
                if (index !== -1) {
                    piecesQueue.splice(index, 1);
                }
                
                // Add a new random piece to the end of the queue
                piecesQueue.push(generateRandomPiece());
                
                // Remove the piece from the DOM
                draggedPiece.parentNode.removeChild(draggedPiece);
                
                // Update the pieces display
                updateAvailablePieces();
            }
        }
        
        draggedPiece = null;
        currentPieceShape = null;
        currentPieceColor = null;
        removeGhostPiece();
        
        // Remove any highlight effects on grid cells
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-edge');
        });
    }
    
    // Handle drag over event
    function handleDragOver(e) {
        e.preventDefault();
        
        if (draggedPiece && currentPieceShape && currentGridIndex !== -1) {
            const rect = activeGrid.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const gridX = Math.floor(mouseX / cellSize);
            const gridY = Math.floor(mouseY / cellSize);
            
            showGhostPiece(gridX, gridY);
            highlightGridEdges(gridX, gridY, currentPieceShape);
        }
    }
    
    // Handle drag enter event
    function handleDragEnter(e) {
        e.preventDefault();
    }
    
    // Handle drag leave event
    function handleDragLeave() {
        // Remove edge highlighting when leaving the grid
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-edge');
        });
    }
    
    // Highlight grid edges where the piece will be placed
    function highlightGridEdges(gridX, gridY, shape) {
        // Remove previous highlights
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-edge');
        });
        
        // Add highlight to cells that would be filled by the piece
        shape.forEach(([x, y]) => {
            const newX = gridX + x;
            const newY = gridY + y;
            
            // Only highlight cells within grid bounds
            if (newX >= 0 && newX < currentGridSize && newY >= 0 && newY < currentGridSize) {
                const cell = document.querySelector(`.active-grid-container .grid-cell[data-x="${newX}"][data-y="${newY}"]`);
                if (cell) {
                    cell.classList.add('highlight-edge');
                }
            }
        });
    }
    
    // Handle mouse move over the grid to show ghost piece
    function handleMouseMove(e) {
        if (!draggedPiece || currentGridIndex === -1) return;
        
        const rect = activeGrid.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const gridX = Math.floor(mouseX / cellSize);
        const gridY = Math.floor(mouseY / cellSize);
        
        showGhostPiece(gridX, gridY);
        highlightGridEdges(gridX, gridY, currentPieceShape);
    }
    
    // Show a ghost piece to preview placement
    function showGhostPiece(gridX, gridY) {
        removeGhostPiece();
        
        if (!currentPieceShape) return;
        
        ghostPiece = document.createElement('div');
        ghostPiece.className = 'ghost-piece';
        ghostPiece.style.position = 'absolute';
        ghostPiece.style.pointerEvents = 'none';
        ghostPiece.style.zIndex = '10';
        
        const isValid = canPlacePiece(gridX, gridY, currentPieceShape);
        ghostPiece.classList.add(isValid ? 'valid-placement' : 'invalid-placement');
        
        currentPieceShape.forEach(([x, y]) => {
            const cell = document.createElement('div');
            cell.className = 'piece-cell';
            cell.style.left = ((gridX + x) * cellSize) + 'px';
            cell.style.top = ((gridY + y) * cellSize) + 'px';
            cell.style.width = cellSize + 'px';
            cell.style.height = cellSize + 'px';
            ghostPiece.appendChild(cell);
        });
        
        activeGrid.appendChild(ghostPiece);
    }
    
    // Remove the ghost piece
    function removeGhostPiece() {
        if (ghostPiece && ghostPiece.parentNode) {
            ghostPiece.parentNode.removeChild(ghostPiece);
            ghostPiece = null;
        }
    }
    
    // Handle drop event
    function handleDrop(e) {
        e.preventDefault();
        
        if (!draggedPiece || !currentPieceShape || currentGridIndex === -1) return;
        
        const rect = activeGrid.getBoundingClientRect();
        const dropX = Math.floor((e.clientX - rect.left) / cellSize);
        const dropY = Math.floor((e.clientY - rect.top) / cellSize);
        
        if (canPlacePiece(dropX, dropY, currentPieceShape)) {
            placePiece(dropX, dropY, currentPieceShape, currentPieceColor);
            
            // Find index of the placed piece in piecesQueue
            const pieces = Array.from(document.querySelectorAll('.pieces-wrapper .piece'));
            const index = pieces.indexOf(draggedPiece);
            
            // Remove piece from queue
            if (index !== -1) {
                piecesQueue.splice(index, 1);
            }
            
            // Add a new random piece to the end of the queue
            piecesQueue.push(generateRandomPiece());
            
            // Remove the piece from the DOM
            draggedPiece.parentNode.removeChild(draggedPiece);
            
            // Move next piece into available area if needed
            updateAvailablePieces();
            
            // Check if the current grid is completely filled
            checkGridCompletion();
        }
        
        removeGhostPiece();
        
        // Remove any highlighting
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-edge');
        });
    }
    
    // Check if the grid is completely filled
    function checkGridCompletion() {
        if (currentGridIndex === -1) return;
        
        const totalCells = currentGridSize * currentGridSize;
        
        if (grids[currentGridIndex].cellsFilled === totalCells) {
            // Level up the building
            grids[currentGridIndex].level = (grids[currentGridIndex].level || 0) + 1;
            
            // Mark current grid as completed temporarily
            grids[currentGridIndex].isCompleted = true;
            
            // Only increase grid size if below max level (3)
            if (grids[currentGridIndex].level < 3) {
                // Increase grid size for the next challenge
                if (currentGridSize < maxGridSize) {
                    // Increment the grid size
                    currentGridSize++;
                    grids[currentGridIndex].gridSize = currentGridSize;
                    
                    // Create a completely new empty grid with the larger size
                    grids[currentGridIndex].grid = Array(currentGridSize).fill().map(() => Array(currentGridSize).fill(0));
                    
                    // Reset cells filled count
                    grids[currentGridIndex].cellsFilled = 0;
                    
                    // Reset completion status
                    grids[currentGridIndex].isCompleted = false;
                }
            }
            
            // Check if all grids are at max level or completed
            const allMaxed = grids.every(grid => 
                grid.level >= 3 || (grid.gridSize === maxGridSize && grid.isCompleted));
            
            if (allMaxed) {
                // Show success message for completing all grids
                successMessage.classList.remove('hidden');
            } else {
                // Return to map view to show completion status
                setTimeout(() => {
                    backToMap();
                }, 1000);
            }
        }
    }
    
    // Check if a piece can be placed at the given position
    function canPlacePiece(gridX, gridY, shape) {
        if (currentGridIndex === -1) return false;
        
        return shape.every(([x, y]) => {
            const newX = gridX + x;
            const newY = gridY + y;
            
            // Check if the piece is within the grid bounds
            if (newX < 0 || newX >= currentGridSize || newY < 0 || newY >= currentGridSize) {
                return false;
            }
            
            // Check if the cell is already occupied
            return grids[currentGridIndex].grid[newY][newX] === 0;
        });
    }
    
    // Place a piece on the grid
    function placePiece(gridX, gridY, shape, color) {
        if (currentGridIndex === -1) return;
        
        shape.forEach(([x, y]) => {
            const newX = gridX + x;
            const newY = gridY + y;
            
            // Update the grid state
            grids[currentGridIndex].grid[newY][newX] = color;
            grids[currentGridIndex].cellsFilled++; // Increment the filled cells counter
            
            // Update the visual grid
            const cell = document.querySelector(`.active-grid-container .grid-cell[data-x="${newX}"][data-y="${newY}"]`);
            if (cell) {
                cell.classList.add('filled');
                cell.style.backgroundColor = color;
            }
        });
    }
    
    // Tower Defense Game Loop
    function gameLoop(timestamp) {
        if (gameOver) return;
        
        // Update game time
        const deltaTime = timestamp - gameTime;
        gameTime = timestamp;
        
        // Calculate difficulty based on score
        // 1. Calculate spawn interval reduction (faster spawns as score increases)
        const spawnReductionLevels = Math.floor(score / spawnIntervalReductionThreshold);
        const currentSpawnInterval = Math.max(
            minSpawnInterval,
            baseEnemySpawnInterval - (spawnReductionLevels * spawnIntervalReductionAmount)
        );
        
        // 2. Calculate current enemy health (stronger enemies as score increases)
        const healthIncreaseLevels = Math.floor(score / enemyHealthIncreaseThreshold);
        const currentEnemyHealth = enemyStartHealth + (healthIncreaseLevels * enemyHealthIncreaseAmount);
        
        // Update the game stats display
        updateGameStats(currentEnemyHealth, currentSpawnInterval);
        
        // Spawn enemies using the calculated interval
        if (timestamp - lastEnemySpawnTime > currentSpawnInterval) {
            spawnEnemy(currentEnemyHealth);
            lastEnemySpawnTime = timestamp;
        }
        
        // Update buildings (towers)
        updateBuildings(deltaTime);
        
        // Update enemies
        updateEnemies(deltaTime);
        
        // Request next frame
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // Spawn a new enemy
    function spawnEnemy(health) {
        if (!gameplayBounds) {
            gameplayBounds = gameplayArea.getBoundingClientRect();
        }
        
        // Set random path parameters
        const pathHeight = gameplayBounds.height * 0.6; // Use 60% of height for path variation
        const centerY = gameplayBounds.height / 2;
        const startY = centerY - (pathHeight / 2) + (Math.random() * pathHeight);
        const endY = centerY - (pathHeight / 2) + (Math.random() * pathHeight);
        
        // Create enemy element
        const enemy = document.createElement('div');
        enemy.className = 'enemy';
        enemy.id = 'enemy-' + enemyId++;
        
        // Style the enemy based on health level
        const healthLevel = Math.floor((health - enemyStartHealth) / enemyHealthIncreaseAmount);
        if (healthLevel > 0) {
            // Add a class for styling with CSS
            enemy.classList.add(`enemy-level-${Math.min(healthLevel, 5)}`);
            
            // Adjust size based on health level (max 50% larger)
            const sizeIncrease = Math.min(healthLevel * 5, 50); // Up to 50% larger
            enemy.style.width = `${30 + (30 * sizeIncrease / 100)}px`;
            enemy.style.height = `${30 + (30 * sizeIncrease / 100)}px`;
            
            // Add visual indicator for stronger enemies
            if (healthLevel >= 3) {
                enemy.style.boxShadow = `0 0 10px 2px rgba(255, 0, 0, ${Math.min(healthLevel * 0.15, 0.8)})`;
            }
        }
        
        // Set starting position (right side of gameplay area)
        const startX = gameplayBounds.width - 30;
        enemy.style.left = startX + 'px';
        enemy.style.top = startY + 'px';
        enemy.style.position = 'fixed'; // Ensure position is fixed
        
        // Add health bar
        const healthBar = document.createElement('div');
        healthBar.className = 'enemy-health-bar';
        
        // Make the health bar wider for stronger enemies
        if (healthLevel > 0) {
            healthBar.style.width = `${40 + healthLevel * 5}px`;
            healthBar.style.left = `-${healthLevel * 2.5}px`;
        }
        
        const healthFill = document.createElement('div');
        healthFill.className = 'enemy-health';
        
        healthBar.appendChild(healthFill);
        enemy.appendChild(healthBar);
        
        // Add to DOM
        enemyContainer.appendChild(enemy);
        
        // Add to enemies array
        enemies.push({
            element: enemy,
            healthBar: healthFill, // Reference to the inner health fill div
            health: health || enemyStartHealth, // Use provided health or default
            maxHealth: health || enemyStartHealth, // Store max health for percentage calculations
            x: startX,
            y: startY,
            startY: startY,
            endY: endY,
            totalDistance: startX,  // Total horizontal distance to travel
            level: healthLevel
        });
    }
    
    // Setup home base
    function setupHomeBase() {
        if (homeBase) {
            if (!gameplayBounds) {
                gameplayBounds = gameplayArea.getBoundingClientRect();
            }
            
            const rect = homeBase.getBoundingClientRect();
            
            // Add home base to buildings array
            buildings.push({
                element: homeBase,
                level: 1, // Always at level 1
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                damage: homeBaseDamage,
                range: 250, // Home base has larger range
                fireRate: homeBaseFireRate,
                lastFired: 0,
                isFiring: false,
                isHomeBase: true
            });
        }
    }
    
    // Update all buildings
    function updateBuildings(deltaTime) {
        // Update gameplayBounds if needed
        if (!gameplayBounds) {
            gameplayBounds = gameplayArea.getBoundingClientRect();
        }
        
        // Clear previous buildings array
        buildings = [];

        // Add home base to buildings array first
        if (homeBase) {
            const rect = homeBase.getBoundingClientRect();
            buildings.push({
                element: homeBase,
                level: 1, // Always at level 1
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                damage: homeBaseDamage,
                range: 250, // Home base has larger range
                fireRate: homeBaseFireRate,
                lastFired: homeBase.dataset.lastFired ? parseInt(homeBase.dataset.lastFired) : 0,
                isFiring: homeBase.classList.contains('shooting'),
                isHomeBase: true
            });
        }
        
        // Get all buildings with level > 0
        document.querySelectorAll('.small-grid[data-level]').forEach(buildingElement => {
            const level = parseInt(buildingElement.dataset.level);
            if (level > 0) {
                const rect = buildingElement.getBoundingClientRect();
                
                // Calculate damage based on level
                let damage = baseTowerDamage;
                if (level === 2) {
                    damage += 15; // Level 2: base + 15
                } else if (level >= 3) {
                    damage += 45; // Level 3: base + 15 + 30
                }
                
                // Calculate range based on level
                let range = 200; // Base range
                if (level === 2) {
                    range = 220; // Level 2: 10% more range
                } else if (level >= 3) {
                    range = 240; // Level 3: 20% more range
                }
                
                // Calculate fire rate based on level (lower is faster)
                let fireRate = projectileFireRate;
                if (level === 2) {
                    fireRate = projectileFireRate * 0.9; // Level 2: 10% faster
                } else if (level >= 3) {
                    fireRate = projectileFireRate * 0.8; // Level 3: 20% faster
                }
                
                // Only create a building object if it doesn't exist or needs update
                const building = {
                    element: buildingElement,
                    level: level,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    damage: damage,
                    range: range,
                    fireRate: fireRate,
                    lastFired: buildingElement.dataset.lastFired ? parseInt(buildingElement.dataset.lastFired) : 0,
                    isFiring: buildingElement.classList.contains('shooting')
                };
                
                buildings.push(building);
            }
        });
        
        // Draw range indicators for debugging (uncomment if needed)
        /*
        buildings.forEach(building => {
            // Remove old range indicators
            const oldIndicator = document.getElementById(`range-${building.element.dataset.gridIndex}`);
            if (oldIndicator) oldIndicator.remove();
            
            // Create range indicator
            const rangeIndicator = document.createElement('div');
            rangeIndicator.id = `range-${building.element.dataset.gridIndex}`;
            rangeIndicator.style.position = 'absolute';
            rangeIndicator.style.left = (building.x - building.range) + 'px';
            rangeIndicator.style.top = (building.y - building.range) + 'px';
            rangeIndicator.style.width = (building.range * 2) + 'px';
            rangeIndicator.style.height = (building.range * 2) + 'px';
            rangeIndicator.style.borderRadius = '50%';
            rangeIndicator.style.border = '1px dashed rgba(255,255,255,0.3)';
            rangeIndicator.style.zIndex = '8';
            document.body.appendChild(rangeIndicator);
        });
        */
        
        // Check if buildings can fire
        if (enemies.length > 0 && !gameOver) {
            buildings.forEach(building => {
                // Only process if not currently firing
                if (!building.isFiring && gameTime - building.lastFired > building.fireRate) {
                    // Find all enemies in range
                    const enemiesInRange = [];
                    
                    enemies.forEach(enemy => {
                        const distance = Math.sqrt(
                            Math.pow(building.x - (enemy.x + 15), 2) + 
                            Math.pow(building.y - (enemy.y + 15), 2)
                        );
                        
                        if (distance < building.range) {
                            enemiesInRange.push({
                                enemy: enemy,
                                distance: distance
                            });
                        }
                    });
                    
                    // Sort enemies by distance (closest first)
                    enemiesInRange.sort((a, b) => a.distance - b.distance);
                    
                    // Fire at the closest enemy in range
                    if (enemiesInRange.length > 0) {
                        fireProjectile(building, enemiesInRange[0].enemy);
                        building.lastFired = gameTime;
                        building.element.dataset.lastFired = gameTime;
                        
                        // Add shooting animation class
                        building.element.classList.add('shooting');
                        building.isFiring = true;
                        
                        // Remove shooting class after animation completes
                        setTimeout(() => {
                            building.element.classList.remove('shooting');
                            building.isFiring = false;
                        }, 500);
                    }
                }
            });
        }
    }
    
    // Fire a projectile from a building at an enemy
    function fireProjectile(building, enemy) {
        // Add shooting animation class to building
        building.element.classList.add('shooting');
        setTimeout(() => {
            building.element.classList.remove('shooting');
        }, 500);
        
        // Calculate damage delay based on distance
        const targetX = enemy.x + 15; // Center of enemy
        const targetY = enemy.y + 15;
        const dx = targetX - building.x;
        const dy = targetY - building.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Create visual projectile element
        const projectile = document.createElement('div');
        projectile.className = 'projectile';
        
        // Style projectile based on building level
        if (building.isHomeBase) {
            projectile.style.backgroundColor = '#4ecdc4';
            projectile.style.width = '14px';
            projectile.style.height = '14px';
        } else if (building.level === 2) {
            projectile.style.backgroundColor = '#ffb400';
            projectile.style.width = '16px';
            projectile.style.height = '16px';
        } else if (building.level >= 3) {
            projectile.style.backgroundColor = '#ff3333';
            projectile.style.width = '18px';
            projectile.style.height = '18px';
        }
        
        // Add to DOM (append to gameplay area instead of body for proper positioning)
        document.body.appendChild(projectile);
        
        // Calculate initial position (center of building)
        projectile.style.left = building.x + 'px';
        projectile.style.top = building.y + 'px';
        projectile.style.position = 'fixed'; // Use fixed positioning for accuracy
        
        // Calculate time for projectile to reach enemy 
        const hitDelay = Math.min(Math.max(distance / 5, 300), 1000);
        
        // Animate projectile
        projectile.animate([
            { transform: 'translate(-50%, -50%) scale(0.8)', left: building.x + 'px', top: building.y + 'px' },
            { transform: 'translate(-50%, -50%) scale(1.2)', left: targetX + 'px', top: targetY + 'px' }
        ], {
            duration: hitDelay,
            easing: 'ease-in'
        }).onfinish = () => {
            // Remove projectile after animation
            projectile.remove();
        };
        
        // Schedule damage to be applied after delay
        setTimeout(() => {
            // Check if enemy still exists
            const enemyIndex = enemies.findIndex(e => e === enemy);
            if (enemyIndex === -1) return; // Enemy was already destroyed
            
            // Apply damage (home base does more damage)
            enemy.health -= building.isHomeBase ? homeBaseDamage : building.damage;
            
            // Update health bar
            const healthPercent = (enemy.health / enemy.maxHealth) * 100;
            enemy.healthBar.style.width = Math.max(0, healthPercent) + '%';
            
            // Create impact effect at the current enemy position
            createImpactEffect(enemy.x + 15, enemy.y + 15, building.level);
            
            // Check if enemy is defeated
            if (enemy.health <= 0) {
                // Remove enemy
                enemy.element.remove();
                enemies.splice(enemyIndex, 1);
                
                // Increase score
                const oldScore = score;
                score += 10;
                scoreCount.textContent = score;
                
                // Check if we crossed a difficulty threshold and show notification
                checkDifficultyIncreased(oldScore, score);
            }
        }, hitDelay);
    }
    
    // Create impact effect when projectile hits enemy
    function createImpactEffect(x, y, level) {
        const impact = document.createElement('div');
        impact.className = 'impact';
        impact.style.position = 'fixed';
        impact.style.left = x + 'px';
        impact.style.top = y + 'px';
        
        // Style impact based on building level
        if (level === 2) {
            impact.style.backgroundColor = 'rgba(255, 180, 0, 0.6)';
            impact.style.boxShadow = '0 0 15px rgba(255, 180, 0, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.8)';
            impact.style.width = '35px';
            impact.style.height = '35px';
        } else if (level >= 3) {
            impact.style.backgroundColor = 'rgba(255, 51, 51, 0.6)';
            impact.style.boxShadow = '0 0 20px rgba(255, 51, 51, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.8)';
            impact.style.width = '40px';
            impact.style.height = '40px';
        } else {
            impact.style.width = '30px';
            impact.style.height = '30px';
            impact.style.backgroundColor = 'rgba(255, 200, 0, 0.6)';
            impact.style.boxShadow = '0 0 15px rgba(255, 200, 0, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.8)';
        }
        
        impact.style.borderRadius = '50%';
        impact.style.zIndex = '11';
        impact.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(impact);
        
        // Animate and remove
        impact.animate([
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
            { transform: 'translate(-50%, -50%) scale(1.5)', opacity: 0 }
        ], {
            duration: 300,
            easing: 'ease-out'
        }).onfinish = () => {
            document.body.removeChild(impact);
        };
    }
    
    // Update all enemies
    function updateEnemies(deltaTime) {
        // Update gameplayBounds if needed
        if (!gameplayBounds) {
            gameplayBounds = gameplayArea.getBoundingClientRect();
        }
        
        // Process enemies in original order to maintain consistency
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            
            // Calculate movement distance based on time
            const moveAmount = (enemySpeed * deltaTime) / 16; // Convert to pixels per millisecond
            
            // Calculate progress (0 to 1) based on horizontal position
            const startX = gameplayBounds.width - 30;
            const totalDistance = startX; // Distance from right edge to left edge
            const remainingDistance = enemy.x;
            const progress = (startX - remainingDistance) / totalDistance;
            
            // Move enemy horizontally
            enemy.x -= moveAmount;
            
            // Update vertical position based on curved path
            // Using a simple linear interpolation between start and end Y for now
            enemy.y = enemy.startY + (enemy.endY - enemy.startY) * progress;
            
            // Update DOM element position
            enemy.element.style.left = enemy.x + 'px';
            enemy.element.style.top = enemy.y + 'px';
            
            // Check if enemy reached the left side
            if (enemy.x < 0) {
                // Remove from DOM
                enemy.element.remove();
                
                // Remove from array (adjust index since we're removing)
                enemies.splice(i, 1);
                i--;
                
                // Reduce player lives
                playerLives--;
                lifeCount.textContent = playerLives;
                
                // Check for game over
                if (playerLives <= 0) {
                    endGame();
                }
            }
        }
    }
    
    // End game
    function endGame() {
        gameOver = true;
        cancelAnimationFrame(animationFrameId);
        
        // Show game over message
        finalScore.textContent = score;
        gameOverMessage.classList.remove('hidden');
    }
    
    // Check if difficulty increased and show notification
    function checkDifficultyIncreased(oldScore, newScore) {
        // Check if we crossed a spawn interval threshold
        const oldSpawnLevel = Math.floor(oldScore / spawnIntervalReductionThreshold);
        const newSpawnLevel = Math.floor(newScore / spawnIntervalReductionThreshold);
        
        if (newSpawnLevel > oldSpawnLevel) {
            showNotification("Enemies spawning faster!");
        }
        
        // Check if we crossed a health increase threshold
        const oldHealthLevel = Math.floor(oldScore / enemyHealthIncreaseThreshold);
        const newHealthLevel = Math.floor(newScore / enemyHealthIncreaseThreshold);
        
        if (newHealthLevel > oldHealthLevel) {
            showNotification("Enemies getting stronger!");
        }
    }
    
    // Show a notification message to the player
    function showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'difficulty-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '100px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontWeight = 'bold';
        notification.style.zIndex = '100';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
    
    // Update the game stats display with current difficulty info
    function updateGameStats(enemyHealth, spawnInterval) {
        // Check if the extended stats elements exist, create if not
        let enemyHealthStat = document.getElementById('enemyHealthStat');
        let spawnRateStat = document.getElementById('spawnRateStat');
        
        if (!enemyHealthStat) {
            enemyHealthStat = document.createElement('div');
            enemyHealthStat.id = 'enemyHealthStat';
            gameStats.appendChild(enemyHealthStat);
        }
        
        if (!spawnRateStat) {
            spawnRateStat = document.createElement('div');
            spawnRateStat.id = 'spawnRateStat';
            gameStats.appendChild(spawnRateStat);
        }
        
        // Update the text content
        enemyHealthStat.innerHTML = `Enemy HP: <span class="enemy-health-stat">${enemyHealth}</span>`;
        spawnRateStat.innerHTML = `Spawn Rate: <span class="spawn-rate-stat">${(spawnInterval / 1000).toFixed(1)}s</span>`;
    }
    
    // Initialize the game
    initGame();
}); 