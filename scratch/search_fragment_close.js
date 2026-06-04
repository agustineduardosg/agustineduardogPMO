const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/equipment/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let idx = 1540; idx < lines.length; idx++) {
  if (lines[idx].includes('React.Fragment') || lines[idx].includes('</React.Fragment>')) {
    console.log(`Line ${idx + 1}: ${lines[idx].trim()}`);
  }
}
