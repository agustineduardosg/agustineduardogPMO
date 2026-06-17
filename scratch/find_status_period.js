const fs = require('fs');
const content = fs.readFileSync('src/app/projects/[id]/page.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('achievements') || line.includes('nextSteps') || line.includes('blockers') || line.includes('costStatusText') || line.includes('ESTADO PERIODO') || line.includes('LOGROS DEL PERÍODO')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
