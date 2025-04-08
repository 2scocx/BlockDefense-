# Block Fitting Game

A browser-based game where you can drag and drop Tetris-like pieces to fill a grid.

## How to Run

1. Clone or download this repository
2. Open `index.html` in your web browser

That's it! No additional dependencies or setup required.

## How to Play

- The game consists of a grid on the left and a set of pieces on the right
- Drag any piece from the right panel and drop it onto the grid
- As you hover over the grid with a piece, you'll see a preview of where it will be placed
- Green preview indicates a valid placement, red indicates invalid
- The grid cells will be highlighted to show exact placement
- Pieces remain visible during dragging for better positioning
- Click on any piece to rotate it 90 degrees clockwise
- Click "Generate More Pieces" to add another set of the same pieces when you run out
- Once a piece is placed on the grid, it cannot be moved
- Try to fill the grid completely with the available pieces

## Features

- 10x10 grid to place pieces on
- 12 different pieces (I, L, J, O, T, S, Z, U, X, dot, small L, and small I)
- Enhanced drag and drop functionality with visible pieces during dragging
- Grid cell highlighting for precise placement
- Visual feedback for valid/invalid placements
- Preview of piece placement as you hover
- One-click piece rotation (90 degrees clockwise)
- Button to generate more of the same pieces when needed
- Improved rotation handling that allows pieces to be placed anywhere on the grid

## Controls

- **Click on piece**: Rotate the piece 90 degrees clockwise
- **Generate More Pieces**: Click this button to add another set of the same pieces to your available selection

## Customization

You can modify the game by editing the following files:
- `game.js` - Adjust the grid size, piece shapes, or game logic
- `styles.css` - Change the appearance of the game
- `index.html` - Modify the structure of the page

## Future Enhancements

Possible additions to the game:
- Score tracking
- Multiple rotation directions
- Timer/challenge modes
- Multiple levels with different grid sizes
- Save/load game state 