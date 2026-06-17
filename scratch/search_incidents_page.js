const fs = require('fs');
const content = fs.readFileSync('src/app/incidents/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('COLUMN_CONFIG') || line.includes('columnOrder') || line.includes('column') || line.includes('<table')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
