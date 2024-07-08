import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, PanResponder, PanResponderGestureState, Animated } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import Particles from 'react-native-particles';

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;
const CELL_SIZE = windowWidth * 0.2;
const CELL_MARGIN = 5;

interface CellProps {
  x: number;
  y: number;
  value: number;
  merging?: boolean;
  animatedValue?: Animated.ValueXY;
}

interface Entities {
  [key: string]: CellProps;
}

const Cell: React.FC<CellProps> = ({ x, y, value, merging, animatedValue }) => {
  const animatedStyle = animatedValue
    ? {
        transform: [
          { translateX: animatedValue.x },
          { translateY: animatedValue.y },
        ],
      }
    : {};

  return (
    <Animated.View style={[styles.cell, { left: x, top: y }, animatedStyle, { backgroundColor: getCellColor(value) }]}>
      <Text style={[styles.cellText, { color: value <= 4 ? '#776e65' : '#f9f6f2' }]}>{value || ''}</Text>
      {merging && (
        <Particles
          count={20}
          emissionRate={20}
          interval={200}
          particleLife={1000}
          direction={-90}
          spread={360}
          speed={5}
          color={getCellColor(value)}
          size={5}
          showsIndicator={false}
        />
      )}
    </Animated.View>
  );
};

const getCellColor = (value: number): string => {
  const colors: { [key: number]: string } = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e',
  };
  return colors[value] || '#cdc1b4';
};

const GameSystem = (entities: Entities, { touches, dispatch }: any) => {
  if (touches.length > 0) {
    touches.forEach((t: any) => {
      if (t.type === 'end') {
        const gesture: PanResponderGestureState = t;
        const { dx, dy } = gesture;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) dispatch({ type: 'move', direction: 'right' });
          else dispatch({ type: 'move', direction: 'left' });
        } else {
          if (dy > 0) dispatch({ type: 'move', direction: 'down' });
          else dispatch({ type: 'move', direction: 'up' });
        }
      }
    });
  }
  return entities;
};

const Game: React.FC = () => {
  const gameEngineRef = useRef<GameEngine>(null);
  const [running, setRunning] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);

  const moveTiles = (entities: Entities, direction: string): Entities => {
    let newEntities = JSON.parse(JSON.stringify(entities));  // Deep copy
    let moved = false;
    let newScore = score;

    const moveAndMerge = (row: CellProps[]) => {
      let newRow = row.filter(cell => cell.value !== 0);
      for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i].value === newRow[i + 1].value) {
          newRow[i].value *= 2;
          newRow[i].merging = true;
          newScore += newRow[i].value;
          newRow.splice(i + 1, 1);
          moved = true;
        }
      }
      while (newRow.length < 4) {
        newRow.push({ x: 0, y: 0, value: 0 });
      }
      return newRow;
    };

    const rotateBoard = (board: CellProps[][]): CellProps[][] => {
      return board[0].map((_, index) => board.map(row => row[index]).reverse());
    };

    let board: CellProps[][] = [
      [newEntities['0-0'], newEntities['0-1'], newEntities['0-2'], newEntities['0-3']],
      [newEntities['1-0'], newEntities['1-1'], newEntities['1-2'], newEntities['1-3']],
      [newEntities['2-0'], newEntities['2-1'], newEntities['2-2'], newEntities['2-3']],
      [newEntities['3-0'], newEntities['3-1'], newEntities['3-2'], newEntities['3-3']],
    ];

    if (direction === 'right') board = board.map(moveAndMerge);
    else if (direction === 'left') board = board.map(row => moveAndMerge([...row].reverse()).reverse());
    else if (direction === 'down') board = rotateBoard(rotateBoard(rotateBoard(board.map(moveAndMerge))));
    else if (direction === 'up') board = rotateBoard(board.map(moveAndMerge));

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const newCell = board[i][j];
        const oldCell = entities[`${i}-${j}`];
        newEntities[`${i}-${j}`] = {
          ...newCell,
          x: j * (CELL_SIZE + CELL_MARGIN),
          y: i * (CELL_SIZE + CELL_MARGIN),
          animatedValue: new Animated.ValueXY({ x: oldCell.x - newCell.x, y: oldCell.y - newCell.y }),
        };
      }
    }

    if (moved) {
      setScore(newScore);
      addNewTile(newEntities);
    }

    return newEntities;
  };

  const addNewTile = (entities: Entities) => {
    const emptyTiles = Object.keys(entities).filter(key => entities[key].value === 0);
    if (emptyTiles.length > 0) {
      const randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
      entities[randomTile].value = Math.random() < 0.9 ? 2 : 4;
    }
  };

  useEffect(() => {
    setRunning(true);
  }, []);

  const onEvent = (e: any) => {
    if (e.type === 'move') {
      if (gameEngineRef.current) {
        const newEntities = moveTiles(gameEngineRef.current.props.entities as Entities, e.direction);
        gameEngineRef.current.swap(newEntities);

        // Animate the movement
        Object.values(newEntities).forEach((entity) => {
          if (entity.animatedValue) {
            Animated.spring(entity.animatedValue, {
              toValue: { x: 0, y: 0 },
              friction: 6,
              tension: 20,
              useNativeDriver: true,
            }).start();
          }
        });
      }
    }
  };

  const initEntities = (): Entities => {
    let entities: Entities = {};
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const position = `${row}-${col}`;
        entities[position] = {
          x: col * (CELL_SIZE + CELL_MARGIN),
          y: row * (CELL_SIZE + CELL_MARGIN),
          value: 0,
          animatedValue: new Animated.ValueXY({ x: 0, y: 0 }),
        };
      }
    }
    addNewTile(entities);
    addNewTile(entities);
    return entities;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>2048</Text>
      <Text style={styles.score}>Score: {score}</Text>
      <View style={styles.boardContainer}>
        <GameEngine
          ref={gameEngineRef}
          style={styles.board}
          systems={[GameSystem]}
          entities={initEntities()}
          onEvent={onEvent}
          running={running}
        >
          {Object.entries(gameEngineRef.current?.props.entities || {}).map(([key, entity]) => (
            <Cell key={key} {...entity} />
          ))}
        </GameEngine>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          if (gameEngineRef.current) {
            gameEngineRef.current.swap(initEntities());
            setScore(0);
          }
        }}
      >
        <Text style={styles.buttonText}>New Game</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'green',
    paddingTop: windowHeight * 0.05,
    paddingBottom: windowHeight * 0.05,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  score: {
    fontSize: 24,
    marginBottom: 10,
    color: 'white',
  },
  boardContainer: {
    width: windowWidth * 0.9,
    height: windowWidth * 0.9,
    backgroundColor: 'yellow',
    borderRadius: 6,
    padding: 5,
  },
  board: {
    width: '100%',
    height: '100%',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  cellText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#8f7a66',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Game;