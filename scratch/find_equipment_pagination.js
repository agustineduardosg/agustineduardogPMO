const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('slice') || line.includes('pagin') || line.includes('page') || line.includes('analito') || line.includes('Ver ')) {
    if (index > 500) { // likely in the render section
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  }
});
