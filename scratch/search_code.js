const fs = require('fs');
const content = fs.readFileSync('c:/Users/agust/OneDrive/Desktop/Paginas/Aplicaciones/Agustineduardo Project V1/smart_project_manager/src/app/equipment/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('CustomAnalyteSelect')) {
    console.log(`Line ${idx + 1}: ${line.trim().substring(0, 150)}`);
  }
});
