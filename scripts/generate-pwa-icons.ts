/**
 * PWA 아이콘 생성 스크립트
 * icon.png를 기반으로 icon-192.png와 icon-512.png를 생성합니다.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

async function generatePwaIcons() {
  try {
    // sharp 라이브러리 사용 시도
    let sharp: any
    try {
      sharp = require('sharp')
    } catch (error) {
      console.error('❌ sharp 라이브러리가 설치되어 있지 않습니다.')
      console.log('📦 설치 중...')
      const { execSync } = require('child_process')
      execSync('pnpm add -D sharp', { stdio: 'inherit' })
      sharp = require('sharp')
    }

    const publicDir = join(process.cwd(), 'public')
    const inputPath = join(publicDir, 'icon.png')
    const output192 = join(publicDir, 'icon-192.png')
    const output512 = join(publicDir, 'icon-512.png')

    console.log('🖼️  PWA 아이콘 생성 중...')
    console.log(`📁 입력 파일: ${inputPath}`)

    // 원본 이미지 확인
    const image = sharp(inputPath)
    const metadata = await image.metadata()
    console.log(`📐 원본 크기: ${metadata.width}x${metadata.height}`)

    // 192x192 생성
    await image
      .clone()
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(output192)
    console.log('✅ icon-192.png 생성 완료')

    // 512x512 생성
    await image
      .clone()
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(output512)
    console.log('✅ icon-512.png 생성 완료')

    console.log('🎉 모든 PWA 아이콘이 성공적으로 생성되었습니다!')
  } catch (error) {
    console.error('❌ 아이콘 생성 중 오류 발생:', error)
    process.exit(1)
  }
}

generatePwaIcons()
