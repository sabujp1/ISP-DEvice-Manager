const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src', 'App.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
// Remove lines 1094-1421 (0-indexed: 1093 to 1420 inclusive)
const cleaned = lines.slice(0, 1093).concat(lines.slice(1421));
fs.writeFileSync(filePath, cleaned.join('\n'), 'utf8');
console.log('Removed', 1421 - 1093, 'dead code lines. File now has', cleaned.length, 'lines.');
