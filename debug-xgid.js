// Debug XGID parsing
const { parseXGID } = require('./src/app/api/backgammon-engine/route.js');

const xgid = '-b--------------------------:0:0:-1:54:0:0:0:0:10';
console.log('XGID:', xgid);

try {
  const board = parseXGID(xgid);
  console.log('Parsed board:');
  console.log('Black bar:', board.blackBar);
  console.log('White bar:', board.whiteBar);
  console.log('Player:', board.player);
  console.log('Dice:', board.dice);

  console.log('Points:');
  board.points.forEach((point, idx) => {
    if (point.count > 0) {
      console.log(`Point ${idx+1}: ${point.count} ${point.owner}`);
    }
  });
} catch (error) {
  console.error('Error:', error);
}