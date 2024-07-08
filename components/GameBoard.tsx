// components/GameBoard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Animated, PanResponder } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tile from './Tile';

const GRID_SIZE = 4;
const CELL_SIZE = 80;
const CELL_MARGIN = 5;

type GridType = (number | null)[][];

const GameBoard = () => {
  const [grid, setGrid] = useState<GridType>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [undoStack, setUndoStack] = useState<{ grid: GridType; score: number }[]>([]);

  const animatedValues = useRef<Animated.Value[][]>([]);

  useEffect(() => {
    initializeGame();
    loadBestScore();
    initializeAnimatedValues();
  }, []);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      saveBestScore(score);
    }
  }, [score]);

  const initializeGame = () => {
    const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setUndoStack([]);
    // initializeAnimatedValues();
  };

  const initializeAnimatedValues = () => {
    animatedValues.current = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => new Animated.Value(1))
    );
  };

  const addRandomTile = (currentGrid: GridType) => {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === null) {
          emptyCells.push({ i, j });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
      animateTileAppear(i, j);
    }
  };

  const animateTileAppear = (i: number, j: number) => {
    animatedValues.current[i][j].setValue(0);
    Animated.spring(animatedValues.current[i][j], {
      toValue: 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const move = (direction: 'left' | 'right' | 'up' | 'down') => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let newScore = score;

    setUndoStack([...undoStack, { grid: JSON.parse(JSON.stringify(grid)), score }]);

    if (direction === 'left' || direction === 'right') {
      for (let i = 0; i < GRID_SIZE; i++) {
        const row = newGrid[i].filter((cell) => cell !== null);
        if (direction === 'right') row.reverse();

        for (let j = 0; j < row.length - 1; j++) {
          if (row[j] === row[j + 1]) {
            row[j] *= 2;
            newScore += row[j];
            row[j + 1] = null;
            moved = true;
            if (row[j] === 2048) setWon(true);
          }
        }

        const mergedRow = row.filter((cell) => cell !== null);
        const newRow = Array(GRID_SIZE).fill(null);

        if (direction === 'left') {
          for (let j = 0; j < mergedRow.length; j++) {
            newRow[j] = mergedRow[j];
          }
        } else {
          for (let j = 0; j < mergedRow.length; j++) {
            newRow[GRID_SIZE - 1 - j] = mergedRow[mergedRow.length - 1 - j];
          }
        }

        if (newRow.join(',') !== newGrid[i].join(',')) moved = true;
        newGrid[i] = newRow;
      }
    } else {
      for (let j = 0; j < GRID_SIZE; j++) {
        const column = newGrid.map((row) => row[j]).filter((cell) => cell !== null);
        if (direction === 'down') column.reverse();

        for (let i = 0; i < column.length - 1; i++) {
          if (column[i] === column[i + 1]) {
            column[i] *= 2;
            newScore += column[i];
            column[i + 1] = null;
            moved = true;
            if (column[i] === 2048) setWon(true);
          }
        }

        const mergedColumn = column.filter((cell) => cell !== null);
        const newColumn = Array(GRID_SIZE).fill(null);

        if (direction === 'up') {
          for (let i = 0; i < mergedColumn.length; i++) {
            newColumn[i] = mergedColumn[i];
          }
        } else {
          for (let i = 0; i < mergedColumn.length; i++) {
            newColumn[GRID_SIZE - 1 - i] = mergedColumn[mergedColumn.length - 1 - i];
          }
        }

        if (newColumn.join(',') !== newGrid.map((row) => row[j]).join(',')) moved = true;
        for (let i = 0; i < GRID_SIZE; i++) {
          newGrid[i][j] = newColumn[i];
        }
      }
    }

    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(newScore);
      if (isGameOver(newGrid)) setGameOver(true);
    }
  };

  const isGameOver = (currentGrid: GridType) => {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === null) return false;
        if (
          (i < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i + 1][j]) ||
          (j < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i][j + 1])
        ) {
          return false;
        }
      }
    }
    return true;
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack.pop();
      if (lastState) {
        setGrid(lastState.grid);
        setScore(lastState.score);
        setUndoStack([...undoStack]);
      }
    }
  };

  const loadBestScore = async () => {
    try {
      const value = await AsyncStorage.getItem('@bestScore');
      if (value !== null) {
        setBestScore(parseInt(value, 10));
      }
    } catch (error) {
      console.error('Error loading best score:', error);
    }
  };

  const saveBestScore = async (newBestScore: number) => {
    try {
      await AsyncStorage.setItem('@bestScore', newBestScore.toString());
    } catch (error) {
      console.error('Error saving best score:', error);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (e, gestureState) => {
        const { dx, dy } = gestureState;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            move('right');
          } else {
            move('left');
          }
        } else {
          if (dy > 0) {
            move('down');
          } else {
            move('up');
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2048</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreTitle}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreTitle}>Best</Text>
          <Text style={styles.scoreValue}>{bestScore}</Text>
        </View>
      </View>
      <View style={styles.grid} {...panResponder.panHandlers}>
        {grid.map((row, i) =>
          row.map((cell, j) => (
            <Animated.View
              key={`${i}-${j}`}
              style={[
                styles.cell,
                {
                  transform: [
                    {
                      scale: animatedValues.current[i][j],
                    },
                  ],
                },
              ]}
            >
              {cell !== null && <Tile value={cell} />}
            </Animated.View>
          ))
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={initializeGame}>
          <Text style={styles.buttonText}>New Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={undo}>
          <Text style={styles.buttonText}>Undo</Text>
        </TouchableOpacity>
      </View>
      {(gameOver || won) && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{won ? 'You Win!' : 'Game Over'}</Text>
          <TouchableOpacity style={styles.button} onPress={initializeGame}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (previous styles)
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#8f7a66',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(238, 228, 218, 0.73)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#776e65',
    marginBottom: 20,
  },
});

export default GameBoard;




// import React, { useState, useEffect } from 'react';
// import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
// import Tile from './Tile';

// const GRID_SIZE = 4;
// const CELL_SIZE = 80;
// const CELL_MARGIN = 5;

// type GridType = (number | null)[][];

// const GameBoard = () => {
//   const [grid, setGrid] = useState<GridType>([]);
//   const [score, setScore] = useState(0);
//   const [bestScore, setBestScore] = useState(0);

//   useEffect(() => {
//     initializeGame();
//   }, []);

//   const initializeGame = () => {
//     const newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
//     addRandomTile(newGrid);
//     addRandomTile(newGrid);
//     setGrid(newGrid);
//     setScore(0);
//   };

//   const addRandomTile = (currentGrid: GridType) => {
//     const emptyCells = [];
//     for (let i = 0; i < GRID_SIZE; i++) {
//       for (let j = 0; j < GRID_SIZE; j++) {
//         if (currentGrid[i][j] === null) {
//           emptyCells.push({ i, j });
//         }
//       }
//     }
//     if (emptyCells.length > 0) {
//       const { i, j } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
//       currentGrid[i][j] = Math.random() < 0.9 ? 2 : 4;
//     }
//   };

//   // Implement move logic here (left, right, up, down)

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>2048</Text>
//         <View style={styles.scoreContainer}>
//           <Text style={styles.scoreTitle}>Score</Text>
//           <Text style={styles.scoreValue}>{score}</Text>
//         </View>
//         <View style={styles.scoreContainer}>
//           <Text style={styles.scoreTitle}>Best</Text>
//           <Text style={styles.scoreValue}>{bestScore}</Text>
//         </View>
//       </View>
//       <View style={styles.grid}>
//         {grid.map((row, i) =>
//           row.map((cell, j) => (
//             <View key={`${i}-${j}`} style={styles.cell}>
//               {cell !== null && <Tile value={cell} />}
//             </View>
//           ))
//         )}
//       </View>
//       <TouchableOpacity style={styles.newGameButton} onPress={initializeGame}>
//         <Text style={styles.newGameButtonText}>New Game</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     width: '100%',
//     paddingHorizontal: 20,
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 48,
//     fontWeight: 'bold',
//     color: '#776e65',
//   },
//   scoreContainer: {
//     backgroundColor: '#bbada0',
//     padding: 10,
//     borderRadius: 5,
//   },
//   scoreTitle: {
//     color: '#eee4da',
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   scoreValue: {
//     color: '#ffffff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   grid: {
//     width: GRID_SIZE * (CELL_SIZE + CELL_MARGIN * 2),
//     height: GRID_SIZE * (CELL_SIZE + CELL_MARGIN * 2),
//     backgroundColor: '#bbada0',
//     borderRadius: 6,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   cell: {
//     width: CELL_SIZE,
//     height: CELL_SIZE,
//     margin: CELL_MARGIN,
//     backgroundColor: '#cdc1b4',
//     borderRadius: 3,
//   },
//   newGameButton: {
//     marginTop: 20,
//     backgroundColor: '#8f7a66',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 5,
//   },
//   newGameButtonText: {
//     color: '#ffffff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
// });

// export default GameBoard;
