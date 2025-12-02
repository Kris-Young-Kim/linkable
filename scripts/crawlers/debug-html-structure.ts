#!/usr/bin/env tsx
/**
 * HTML 구조 상세 분석 스크립트
 * 실제 웹사이트의 HTML 구조를 분석하여 정확한 셀렉터를 찾습니다.
 */

import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import { chromium } from "playwright"
import { SITE_CONFIGS } from "./site-config"

async function analyzeSite(siteKey: string) {
  const siteConfig = SITE_CONFIGS[siteKey]
  if (!siteConfig) {
    console.error(`사이트를 찾을 수 없습니다: ${siteKey}`)
    return
  }

  console.log(`\n🔍 ${siteConfig.name} HTML 구조 분석 중...`)
  
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  })
  const page = await context.newPage()

  try {
    // 테스트 URL 선택
    let testUrl = siteConfig.baseUrl
    if (siteConfig.categoryUrls && Object.keys(siteConfig.categoryUrls).length > 0) {
      const firstCategory = Object.keys(siteConfig.categoryUrls)[0]
      testUrl = siteConfig.categoryUrls[firstCategory]
      console.log(`📄 카테고리: ${firstCategory}`)
    }

    console.log(`🌐 접속 중: ${testUrl}`)
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForTimeout(5000) // 페이지 로딩 대기

    console.log(`\n${"=".repeat(80)}`)
    console.log(`📋 페이지 기본 정보`)
    console.log(`=${"=".repeat(79)}`)
    const pageInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      bodyTextLength: document.body.innerText.length,
    }))
    console.log(`URL: ${pageInfo.url}`)
    console.log(`제목: ${pageInfo.title}`)
    console.log(`본문 텍스트 길이: ${pageInfo.bodyTextLength}자`)

    console.log(`\n${"=".repeat(80)}`)
    console.log(`🔍 관련 클래스 찾기`)
    console.log(`=${"=".repeat(79)}`)
    const allClasses = await page.evaluate(() => {
      const all = document.querySelectorAll("*")
      const classSet = new Set<string>()
      all.forEach((el) => {
        if (el.className && typeof el.className === "string") {
          el.className.split(" ").forEach((cls) => {
            if (cls && (cls.includes("product") || cls.includes("item") || cls.includes("list") || cls.includes("prd") || cls.includes("goods") || cls.includes("board"))) {
              classSet.add(cls)
            }
          })
        }
      })
      return Array.from(classSet).sort()
    })
    console.log(`발견된 관련 클래스 (${allClasses.length}개):`)
    allClasses.forEach((cls, idx) => {
      if (idx < 30) {
        console.log(`  ${idx + 1}. ${cls}`)
      }
    })
    if (allClasses.length > 30) {
      console.log(`  ... 외 ${allClasses.length - 30}개`)
    }

    console.log(`\n${"=".repeat(80)}`)
    console.log(`📦 상품 후보 요소 분석`)
    console.log(`=${"=".repeat(79)}`)
    
    // li, div 요소 중 상품으로 보이는 것 찾기
    const candidates = await page.evaluate(() => {
      const results: any[] = []
      
      // 다양한 선택자로 시도
      const selectors = [
        "li",
        "div[class*='product']",
        "div[class*='item']",
        "div[class*='prd']",
        "div[class*='goods']",
        "[class*='list'] > *",
      ]
      
      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((el, idx) => {
            if (idx < 20 && results.length < 20) {
              const text = el.textContent?.trim() || ""
              const classes = Array.from(el.classList).join(" ")
              const tag = el.tagName.toLowerCase()
              
              // 텍스트가 있고, 링크나 이미지가 있는 요소만
              if (text.length > 10 && (el.querySelector("a") || el.querySelector("img"))) {
                const children = Array.from(el.children).slice(0, 5).map((child) => ({
                  tag: child.tagName.toLowerCase(),
                  classes: Array.from(child.classList).join(" "),
                  text: child.textContent?.trim().substring(0, 50) || "",
                  hasLink: !!child.querySelector("a"),
                  hasImage: !!child.querySelector("img"),
                }))
                
                const link = el.querySelector("a")
                const image = el.querySelector("img")
                
                results.push({
                  selector,
                  tag,
                  classes,
                  text: text.substring(0, 100),
                  hasLink: !!link,
                  hasImage: !!image,
                  linkHref: link ? (link as HTMLAnchorElement).href : null,
                  imageSrc: image ? (image as HTMLImageElement).src : null,
                  children,
                })
              }
            }
          })
        } catch (e) {
          // 무시
        }
      })
      
      return results
    })

    console.log(`발견된 후보 요소: ${candidates.length}개\n`)
    candidates.slice(0, 10).forEach((candidate, idx) => {
      console.log(`${idx + 1}. <${candidate.tag}> class="${candidate.classes}"`)
      console.log(`   텍스트: ${candidate.text}`)
      if (candidate.hasLink) {
        console.log(`   링크: ${candidate.linkHref?.substring(0, 80)}`)
      }
      if (candidate.hasImage) {
        console.log(`   이미지: ${candidate.imageSrc?.substring(0, 80)}`)
      }
      if (candidate.children.length > 0) {
        console.log(`   자식 요소:`)
        candidate.children.forEach((child: any, cIdx: number) => {
          console.log(`     ${cIdx + 1}. <${child.tag}> class="${child.classes}"`)
          console.log(`        텍스트: ${child.text}`)
          if (child.hasLink) console.log(`        [링크 있음]`)
          if (child.hasImage) console.log(`        [이미지 있음]`)
        })
      }
      console.log(``)
    })

    console.log(`\n${"=".repeat(80)}`)
    console.log(`🧪 현재 셀렉터 테스트`)
    console.log(`=${"=".repeat(79)}`)
    
    // 현재 설정된 셀렉터 테스트
    for (const selector of siteConfig.selectors.productList) {
      try {
        const elements = await page.$$(selector)
        if (elements.length > 0) {
          console.log(`✅ ${selector}: ${elements.length}개 발견`)
          
          // 첫 번째 요소에서 정보 추출 시도
          const first = elements[0]
          const elementInfo = await first.evaluate((el) => {
            const text = el.textContent?.trim() || ""
            const classes = Array.from(el.classList).join(" ")
            const link = el.querySelector("a")
            const image = el.querySelector("img")
            const children = Array.from(el.children).slice(0, 3).map((child) => ({
              tag: child.tagName.toLowerCase(),
              classes: Array.from(child.classList).join(" "),
              text: child.textContent?.trim().substring(0, 30) || "",
            }))
            
            return {
              text: text.substring(0, 100),
              classes,
              hasLink: !!link,
              linkHref: link ? (link as HTMLAnchorElement).href : null,
              hasImage: !!image,
              imageSrc: image ? (image as HTMLImageElement).src : null,
              children,
            }
          })
          
          console.log(`   텍스트: ${elementInfo.text}`)
          console.log(`   클래스: ${elementInfo.classes}`)
          if (elementInfo.hasLink) {
            console.log(`   링크: ${elementInfo.linkHref?.substring(0, 80)}`)
          }
          if (elementInfo.hasImage) {
            console.log(`   이미지: ${elementInfo.imageSrc?.substring(0, 80)}`)
          }
          if (elementInfo.children.length > 0) {
            console.log(`   자식:`)
            elementInfo.children.forEach((child: any) => {
              console.log(`     - <${child.tag}> class="${child.classes}" - ${child.text}`)
            })
          }
          
          // 상품명 셀렉터 테스트
          console.log(`   상품명 셀렉터 테스트:`)
          for (const nameSelector of siteConfig.selectors.productName) {
            try {
              const nameEl = await first.$(nameSelector)
              if (nameEl) {
                const name = (await nameEl.textContent())?.trim() || ""
                if (name) {
                  console.log(`     ✅ ${nameSelector}: "${name.substring(0, 40)}"`)
                  break
                }
              }
            } catch {
              // 다음 시도
            }
          }
          
          break
        } else {
          console.log(`❌ ${selector}: 요소 없음`)
        }
      } catch (e) {
        console.log(`❌ ${selector}: 오류 - ${e}`)
      }
    }

    // 스크린샷 저장
    try {
      const screenshotPath = `debug-html-${siteKey}-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      console.log(`\n📸 전체 페이지 스크린샷 저장됨: ${screenshotPath}`)
    } catch (e) {
      console.log(`\n⚠️  스크린샷 저장 실패: ${e}`)
    }

    console.log(`\n${"=".repeat(80)}`)
    console.log(`✅ 분석 완료`)
    console.log(`=${"=".repeat(79)}`)
    console.log(`\n브라우저를 열어두었습니다. 30초 후 자동으로 닫힙니다...`)
    console.log(`개발자 도구(F12)로 추가 확인이 가능합니다.`)
    await page.waitForTimeout(30000)
  } catch (error) {
    console.error(`❌ 오류 발생:`, error)
  } finally {
    await browser.close()
  }
}

const siteKey = process.argv[2] || "ablelife"
analyzeSite(siteKey).catch(console.error)

