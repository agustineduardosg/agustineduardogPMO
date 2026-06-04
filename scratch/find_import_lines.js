const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Importar Equipos')) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
    for (let j = Math.max(0, i - 15); j < Math.min(lines.length, i + 15); j++) {
      console.log(`${j + 1}: ${lines[j]}`);
    }
  }
}
