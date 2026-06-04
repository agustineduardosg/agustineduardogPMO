const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const start = 2480;
const end = 2530;

for (let i = start - 1; i < end; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
