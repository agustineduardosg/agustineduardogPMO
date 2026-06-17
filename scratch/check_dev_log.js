const fs = require('fs');
const content = fs.readFileSync('C:/Users/agust/.gemini/antigravity/brain/33bfddf4-1461-4ea7-ab5b-06e0955497c7/.system_generated/tasks/task-4919.log', 'utf8');
const lines = content.split('\n');
const lastLines = lines.slice(-200);
lastLines.forEach((line) => {
  if (line.includes('warning') || line.includes('error') || line.includes('mismatch') || line.includes('mismatch') || line.includes('Hydration')) {
    console.log(line);
  }
});
console.log('--- Last 20 lines: ---');
console.log(lines.slice(-20).join('\n'));
