
import fs from 'fs';

const file = 'docs/TODO.md';
let content = fs.readFileSync(file, 'utf-8');

// 쿠팡 관련 내용은 이미 제거됨

fs.writeFileSync(file, content, 'utf-8');
console.log('Cleanup complete');
