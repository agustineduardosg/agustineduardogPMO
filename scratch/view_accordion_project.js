const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'projects', '[id]', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const start = 3680;
const end = 3710;

for (let i = start - 1; i < end; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
