const fs = require('fs');
const content = fs.readFileSync('src/app/incidents/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('incidents-table') || line.includes('table-cell-input') || line.includes('<style')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
