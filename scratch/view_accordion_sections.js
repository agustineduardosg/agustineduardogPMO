const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

console.log('--- SECTION 1 (2180-2210) ---');
for (let i = 2179; i < 2210; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

console.log('--- SECTION 2 (2430-2460) ---');
for (let i = 2429; i < 2460; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
