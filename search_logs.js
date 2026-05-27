const fs = require('fs');
const logPath = 'C:\\Users\\agust\\.gemini\\antigravity\\brain\\49976ce3-4998-45db-8c3d-d23c2411d748\\.system_generated\\logs\\transcript.jsonl';
const fileContent = fs.readFileSync(logPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    // Find view_file results containing the import page content
    if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('import/page.tsx')) {
      console.log(`Found VIEW_FILE result at step ${obj.step_index}`);
      fs.writeFileSync(`C:\\Users\\agust\\.gemini\\antigravity\\brain\\49976ce3-4998-45db-8c3d-d23c2411d748\\scratch\\view_file_step_${obj.step_index}.txt`, obj.content);
    }
  } catch (e) {
    // ignore
  }
}
console.log("Trace completed.");
