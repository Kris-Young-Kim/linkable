#!/usr/bin/env tsx
/**
 * 빠른 셀렉터 테스트 - 단일 사이트만 테스트
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { chromium } from "playwright"
import { SITE_CONFIGS } from "./site-config"

async function testSite(siteKey: string) {
  const siteConfig = SITE_CONFIGS[siteKey]
  if (!siteConfig) {
    console.error(`사이트를 찾을 수 없습니다: ${siteKey}`)
    return
  }

  console.log(`\n🔍 ${siteConfig.name} 테스트 중...`)
  console.log(`URL: ${siteConfig.baseUrl}`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  })
  const page = await context.newPage()

  try {
    let testUrl = siteConfig.baseUrl
    if (siteConfig.categoryUrls && Object.keys(siteConfig.categoryUrls).length > 0) {
      const firstCategory = Object.keys(siteConfig.categoryUrls)[0]
      testUrl = siteConfig.categoryUrls[firstCategory]
    }

    console.log(`접속 중: ${testUrl}`)
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForTimeout(3000)

    // 페이지의 모든 클래스 찾기
    const classes = await page.evaluate(() => {
      const all = document.querySelectorAll("*")
      const classSet = new Set<string>()
      all.forEach((el) => {
        if (el.className && typeof el.className === "string") {
          el.className.split(" ").forEach((cls) => {
            if (cls && (cls.includes("product") || cls.includes("item") || cls.includes("list") || cls.includes("goods"))) {
              classSet.add(cls)
            }
          })
        }
      })
      return Array.from(classSet).sort()
    })

    console.log(`\n발견된 관련 클래스 (${classes.length}개):`)
    classes.slice(0, 20).forEach((cls) => console.log(`  - ${cls}`))

    // 상품 목록 셀렉터 테스트
    console.log(`\n셀렉터 테스트:`)
    for (const selector of siteConfig.selectors.productList) {
      try {
        const elements = await page.$$(selector)
        if (elements.length > 0) {
          console.log(`  ✅ ${selector}: ${elements.length}개 발견`)
          
          // 첫 번째 상품 정보 추출 시도
          const first = elements[0]
          const nameEl = await first.$(siteConfig.selectors.productName[0] || "a")
          const name = nameEl ? (await nameEl.textContent())?.trim() : null
          console.log(`     상품명: ${name?.substring(0, 40) || "없음"}`)
          break
        } else {
          console.log(`  ❌ ${selector}: 요소 없음`)
        }
      } catch (e) {
        console.log(`  ❌ ${selector}: 오류`)
      }
    }

    // 실제 HTML 구조 상세 확인
    console.log(`\n📋 실제 HTML 구조 확인 중...`)
    try {
      const htmlStructure = await page.evaluate(() => {
        const products = document.querySelectorAll('[class*="product"], [class*="prd"], [class*="item"]')
        const result: any[] = []
        products.forEach((el, idx) => {
          if (idx < 5) { // 처음 5개만
            const classes = Array.from(el.classList).join(' ')
            const tagName = el.tagName.toLowerCase()
            const text = el.textContent?.trim().substring(0, 50) || ''
            const children = Array.from(el.children).map(child => ({
              tag: child.tagName.toLowerCase(),
              classes: Array.from(child.classList).join(' '),
              text: child.textContent?.trim().substring(0, 30) || ''
            }))
            result.push({
              index: idx,
              tag: tagName,
              classes,
              text,
              children: children.slice(0, 3) // 처음 3개 자식만
            })
          }
        })
        return result
      })
      
      console.log(`\n발견된 요소 구조:`)
      htmlStructure.forEach((item, idx) => {
        console.log(`\n${idx + 1}. <${item.tag}> class="${item.classes}"`)
        console.log(`   텍스트: ${item.text}`)
        if (item.children.length > 0) {
          console.log(`   자식 요소:`)
          item.children.forEach((child: any) => {
            console.log(`     - <${child.tag}> class="${child.classes}" - ${child.text}`)
          })
        }
      })
    } catch (e) {
      console.log(`HTML 구조 확인 실패: ${e}`)
    }
    
    // 스크린샷 저장
    try {
      await page.screenshot({ path: `debug-ablelife-${Date.now()}.png`, fullPage: true })
      console.log(`\n📸 전체 페이지 스크린샷 저장됨`)
    } catch (e) {
      console.log(`스크린샷 저장 실패: ${e}`)
    }
    
    console.log(`\n브라우저를 열어두었습니다. 개발자 도구(F12)로 HTML 구조를 확인하세요.`)
    console.log(`10초 후 브라우저가 닫힙니다...`)
    await page.waitForTimeout(10000)
  } catch (error) {
    console.error(`오류:`, error)
  } finally {
    await browser.close()
  }
}

const siteKey = process.argv[2] || "ablelife"
testSite(siteKey)

