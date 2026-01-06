#!/usr/bin/env node
/**
 * Windows PowerShell에서 한글 깨짐 방지를 위한 UTF-8 설정 스크립트
 * 다른 스크립트를 실행하기 전에 먼저 실행하여 UTF-8 환경을 설정합니다.
 */

// Windows에서만 적용
if (process.platform === 'win32') {
  // 콘솔 인코딩을 UTF-8로 강제 설정
  if (process.stdout.setEncoding) {
    process.stdout.setEncoding('utf8');
  }
  if (process.stderr.setEncoding) {
    process.stderr.setEncoding('utf8');
  }

  // process.stdout/stderr 핸들에 UTF-8 설정
  if (typeof process.stdout._handle !== 'undefined' && process.stdout._handle.setEncoding) {
    process.stdout._handle.setEncoding('utf8');
  }
  if (typeof process.stderr._handle !== 'undefined' && process.stderr._handle.setEncoding) {
    process.stderr._handle.setEncoding('utf8');
  }

  // 환경 변수 설정 (자식 프로세스에 상속)
  process.env.LANG = 'C.UTF-8';
  process.env.LC_ALL = 'C.UTF-8';
}

// 기본 출력 (문제가 없음을 확인하기 위함)
console.log('✓ UTF-8 인코딩 설정 완료');