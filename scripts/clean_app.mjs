import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/App.jsx';
const content = readFileSync(filePath, 'utf8');

// Find the start marker (after the new real SNMP function ends)
const startMarker = "logActivity('SNMP Poll Success', `Real SNMP telemetry applied to ${targetOlt.name} (${targetOlt.ip})`);\n  };";
const endMarker = "// ==================== ROUTERS & SWITCHES ACTIONS ====================\n  const openAddRouter";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!');
  console.log('startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

// Keep everything up to and including the start marker, then jump to the end marker
const before = content.substring(0, startIdx + startMarker.length);
const after = content.substring(endIdx);

const cleaned = before + '\n\n  ' + after;
writeFileSync(filePath, cleaned, 'utf8');

const lineCount = cleaned.split('\n').length;
console.log(`✅ Dead code removed. File now has ${lineCount} lines.`);
