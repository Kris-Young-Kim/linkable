# Favicon 생성 가이드

LinkAble 프로젝트의 favicon을 생성하는 방법입니다.

## 현재 상태

- `public/icon.svg`: LinkAble 브랜드 아이콘 (연결/링크를 나타내는 아이콘)
- `public/icon-light-32x32.png`: 라이트 모드용 PNG (업데이트 필요)
- `public/icon-dark-32x32.png`: 다크 모드용 PNG (업데이트 필요)
- `public/apple-icon.png`: Apple Touch Icon (업데이트 필요)

## 아이콘 디자인

LinkAble의 favicon은 연결(Link)을 나타내는 아이콘으로:
- 중앙에 점 (연결점)
- 양쪽에 연결선 (연결을 나타냄)
- 둥근 배경

## PNG 파일 생성 방법

### 방법 1: 온라인 도구 사용

1. [RealFaviconGenerator](https://realfavicongenerator.net/) 또는 [Favicon.io](https://favicon.io/) 사용
2. `public/icon.svg` 파일을 업로드
3. 다음 크기로 생성:
   - 32x32 (icon-light-32x32.png, icon-dark-32x32.png)
   - 180x180 (apple-icon.png)

### 방법 2: ImageMagick 사용

```bash
# SVG를 PNG로 변환 (라이트 모드용 - 검은색 아이콘)
convert -background white -density 300 public/icon.svg -resize 32x32 public/icon-light-32x32.png

# SVG를 PNG로 변환 (다크 모드용 - 흰색 아이콘)
convert -background black -density 300 public/icon.svg -resize 32x32 public/icon-dark-32x32.png

# Apple Touch Icon 생성
convert -background white -density 300 public/icon.svg -resize 180x180 public/apple-icon.png
```

### 방법 3: Node.js 스크립트 사용

```javascript
// scripts/generate-favicons.js
const sharp = require('sharp');
const fs = require('fs');

// SVG를 읽어서 PNG로 변환
async function generateFavicons() {
  const svg = fs.readFileSync('public/icon.svg');
  
  // 라이트 모드 (검은색 아이콘, 흰색 배경)
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile('public/icon-light-32x32.png');
  
  // 다크 모드 (흰색 아이콘, 검은색 배경)
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile('public/icon-dark-32x32.png');
  
  // Apple Touch Icon
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile('public/apple-icon.png');
}

generateFavicons();
```

## 확인 방법

1. 브라우저에서 `http://localhost:3000` 접속
2. 탭의 favicon 확인
3. 개발자 도구 > Network 탭에서 favicon 요청 확인

## 참고

- Next.js는 `app/icon.png` 또는 `app/favicon.ico`를 자동으로 인식합니다
- 현재는 `public/` 폴더의 파일을 `metadata.icons`에서 명시적으로 설정하고 있습니다
- SVG favicon은 최신 브라우저에서 지원되며, 다크 모드도 자동으로 처리됩니다
