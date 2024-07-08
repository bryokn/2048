// components/Tile.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TileProps {
  value: number;
}

const Tile: React.FC<TileProps> = ({ value }) => {
  const tileStyle = getTileStyle(value);

  return (
    <Animated.View style={[styles.tile, tileStyle]}>
      <Text style={[styles.tileText, { fontSize: value < 100 ? 32 : value < 1000 ? 28 : 24 }]}>
        {value}
      </Text>
    </Animated.View>
  );
};

const getTileStyle = (value: number) => {
  const backgroundColor = {
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
  }[value] || '#3c3a32';

  const color = value <= 4 ? '#776e65' : '#f9f6f2';

  return {
    backgroundColor,
    color,
  };
};

const styles = StyleSheet.create({
  tile: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 3,
  },
  tileText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Tile;




// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';

// interface TileProps {
//   value: number;
// }

// const Tile: React.FC<TileProps> = ({ value }) => {
//   const tileStyle = getTileStyle(value);

//   return (
//     <View style={[styles.tile, tileStyle]}>
//       <Text style={styles.tileText}>{value}</Text>
//     </View>
//   );
// };

// const getTileStyle = (value: number) => {
//   // Implement color logic based on tile value
//   // Return appropriate style object
// };

// const styles = StyleSheet.create({
//   tile: {
//     width: '100%',
//     height: '100%',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderRadius: 3,
//   },
//   tileText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#776e65',
//   },
// });

// export default Tile;