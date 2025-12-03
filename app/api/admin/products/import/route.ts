import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { syncProducts } from "@/lib/integrations/product-sync"
import type { ProductInput } from "@/lib/integrations/product-sync"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * CSV/JSON/PDF 파일 일괄 업로드 API
 */
export const runtime = "nodejs" // Node.js 런타임 명시 (FormData 파싱을 위해)
export const dynamic = "force-dynamic" // 동적 라우트로 설정
export const maxDuration = 60 // PDF 파싱을 위해 최대 60초 허용

export async function POST(request: NextRequest) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  try {
    // Next.js 15에서 FormData 파싱
    // Content-Type 확인 (multipart/form-data 또는 boundary 포함)
    const contentType = request.headers.get("content-type") || ""
    console.log("[Admin Products Import] Content-Type:", contentType)
    
    // FormData 파싱 시도
    let formData: FormData
    try {
      // Next.js 15에서는 request.formData()가 자동으로 작동해야 함
      formData = await request.formData()
      console.log("[Admin Products Import] FormData 파싱 성공, entries:", Array.from(formData.keys()))
    } catch (error) {
      console.error("[Admin Products Import] FormData 파싱 오류:", error)
      console.error("[Admin Products Import] Error details:", error instanceof Error ? error.stack : String(error))
      return NextResponse.json(
        { error: `FormData 파싱 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}. 파일 크기가 너무 크거나 형식이 올바르지 않을 수 있습니다.` },
        { status: 400 }
      )
    }
    
    const file = formData.get("file") as File | null
    
    if (!file || !(file instanceof File)) {
      console.error("[Admin Products Import] 파일이 없거나 File 객체가 아닙니다:", file)
      console.error("[Admin Products Import] FormData entries:", Array.from(formData.entries()).map(([key, value]) => [key, value instanceof File ? `File: ${value.name}` : String(value)]))
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 })
    }
    
    console.log("[Admin Products Import] 파일 정보:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    const fileName = file.name.toLowerCase()
    let products: ProductInput[] = []

    // 파일 형식에 따라 파싱
    if (fileName.endsWith(".pdf")) {
      // PDF 파싱 (개선된 버전)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // pdf-parse의 내부 라이브러리를 직접 사용하여 디버그 모드 우회
        // @ts-ignore
        const pdfParse = require("pdf-parse/lib/pdf-parse.js")
        
        if (typeof pdfParse !== "function") {
          throw new Error("pdf-parse 함수를 찾을 수 없습니다.")
        }
        
        if (buffer.length === 0) {
          throw new Error("PDF 파일이 비어있습니다.")
        }
        
        // PDF 파일 시그니처 확인
        const pdfSignature = buffer.slice(0, 4).toString()
        if (pdfSignature !== "%PDF") {
          throw new Error("유효한 PDF 파일이 아닙니다.")
        }
        
        // PDF 파싱 실행 (타임아웃 설정)
        const pdfData = await Promise.race([
          pdfParse(buffer),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("PDF 파싱 타임아웃 (30초 초과)")), 30000)
          )
        ]) as { text?: string }
        
        const text = pdfData?.text || ""

        // PDF 텍스트에서 제품 정보 추출 (개선된 로직)
        products = await parsePdfCatalogImproved(text)
        
        if (products.length === 0) {
          return NextResponse.json({ 
            error: "PDF에서 제품 정보를 추출할 수 없습니다. 보조기기 관련 제품명과 가격 정보가 포함된 PDF인지 확인하세요." 
          }, { status: 400 })
        }
      } catch (error) {
        console.error("[Admin Products Import] PDF 파싱 오류:", error)
        return NextResponse.json({ 
          error: `PDF 파싱 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}` 
        }, { status: 400 })
      }
    } else if (fileName.endsWith(".json")) {
      const fileContent = await file.text()
      try {
        const data = JSON.parse(fileContent)
        if (!Array.isArray(data)) {
          return NextResponse.json({ error: "JSON 파일은 배열 형식이어야 합니다." }, { status: 400 })
        }
        products = data.map((item) => ({
          name: item.name || "",
          iso_code: item.iso_code || item.isoCode || "00 00",
          price: typeof item.price === "number" ? item.price : item.price ? parseFloat(String(item.price)) : null,
          purchase_link: item.purchase_link || item.purchaseLink || null,
          image_url: item.image_url || item.imageUrl || null,
          manufacturer: item.manufacturer || null,
          category: item.category || null,
          description: item.description || null,
          is_active: item.is_active !== false,
        }))
      } catch (error) {
        return NextResponse.json({ error: "JSON 파일 파싱 실패" }, { status: 400 })
      }
    } else if (fileName.endsWith(".csv")) {
      const fileContent = await file.text()
      // CSV 파싱
      const lines = fileContent.split("\n").filter((line) => line.trim())
      if (lines.length < 2) {
        return NextResponse.json({ error: "CSV 파일에 헤더와 최소 1개의 데이터 행이 필요합니다." }, { status: 400 })
      }

      const headers = lines[0].split(",").map((h) => h.trim())
      const nameIndex = headers.findIndex((h) => h.toLowerCase() === "name" || h.toLowerCase() === "상품명")
      const isoIndex = headers.findIndex((h) => h.toLowerCase() === "iso_code" || h.toLowerCase() === "iso code" || h.toLowerCase() === "iso코드")
      const priceIndex = headers.findIndex((h) => h.toLowerCase() === "price" || h.toLowerCase() === "가격")
      const linkIndex = headers.findIndex((h) => h.toLowerCase() === "purchase_link" || h.toLowerCase() === "purchase link" || h.toLowerCase() === "구매링크" || h.toLowerCase() === "링크")
      const imageIndex = headers.findIndex((h) => h.toLowerCase() === "image_url" || h.toLowerCase() === "image url" || h.toLowerCase() === "이미지")
      const manufacturerIndex = headers.findIndex((h) => h.toLowerCase() === "manufacturer" || h.toLowerCase() === "제조사")
      const categoryIndex = headers.findIndex((h) => h.toLowerCase() === "category" || h.toLowerCase() === "카테고리")
      const descriptionIndex = headers.findIndex((h) => h.toLowerCase() === "description" || h.toLowerCase() === "설명")

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
        
        if (nameIndex === -1 || !values[nameIndex]) {
          continue
        }

        products.push({
          name: values[nameIndex] || "",
          iso_code: isoIndex !== -1 && values[isoIndex] ? values[isoIndex] : "00 00",
          price: priceIndex !== -1 && values[priceIndex] ? parseFloat(values[priceIndex].replace(/[^0-9]/g, "")) : null,
          purchase_link: linkIndex !== -1 ? values[linkIndex] || null : null,
          image_url: imageIndex !== -1 ? values[imageIndex] || null : null,
          manufacturer: manufacturerIndex !== -1 ? values[manufacturerIndex] || null : null,
          category: categoryIndex !== -1 ? values[categoryIndex] || null : null,
          description: descriptionIndex !== -1 ? values[descriptionIndex] || null : null,
          is_active: true,
        })
      }
    } else {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. CSV, JSON 또는 PDF 파일을 사용하세요." }, { status: 400 })
    }

    if (products.length === 0) {
      return NextResponse.json({ error: "등록할 상품이 없습니다." }, { status: 400 })
    }

    // 상품 등록
    const result = await syncProducts(products, { validateLinks: false })

    return NextResponse.json({
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      total: products.length,
      errors: result.errors,
    })
  } catch (error) {
    console.error("[Admin Products Import] Error:", error)
    console.error("[Admin Products Import] Error stack:", error instanceof Error ? error.stack : "No stack")
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "파일 업로드 실패",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * PDF 카탈로그에서 제품 정보 추출 (개선된 버전)
 * 더 엄격한 필터링으로 실제 보조기기 제품만 추출합니다.
 */
async function parsePdfCatalogImproved(text: string): Promise<ProductInput[]> {
  const products: ProductInput[] = []
  
  // 보조기기 관련 키워드 (제품명에 반드시 포함되어야 함)
  const assistiveDeviceKeywords = [
    "휠체어", "워커", "보행기", "목발", "지팡이",
    "식기", "숟가락", "포크", "컵", "음주",
    "침대", "의자", "리프트", "체위",
    "경사로", "승강기", "램프",
    "보청기", "청각", "난청",
    "확대경", "돋보기", "시각",
    "의사소통", "aac",
    "목욕", "샤워", "욕조",
    "착의", "의복",
    "청소", "요리", "조리",
    "손잡이", "그랩바", "핸드레일"
  ]
  
  // 제외할 텍스트 패턴 (페이지 번호, 헤더, 푸터 등)
  const excludePatterns = [
    /^\d+$/, // 숫자만 있는 줄
    /^페이지\s*\d+$/i, // "페이지 1" 같은 패턴
    /^제\s*\d+\s*페이지$/i,
    /^목차$/i,
    /^차례$/i,
    /^인덱스$/i,
    /^copyright/i,
    /^©/i,
    /^all rights reserved/i,
    /^www\./i, // URL만 있는 줄
    /^http/i, // URL
    /^tel:/i, // 전화번호
    /^fax:/i,
    /^email:/i,
    /^이메일:/i,
    /^전화:/i,
    /^팩스:/i,
    /^주소:/i,
    /^address:/i,
    /^사업자등록번호/i,
    /^대표자:/i,
    /^대표전화/i,
    /^\s*$/, // 빈 줄
    /^[가-힣]{1,2}$/, // 한 글자 또는 두 글자만 있는 줄
  ]
  
  // 줄 단위로 분리
  const lines = text.split("\n").map(line => line.trim()).filter(line => line.length > 0)
  
  // 가격 패턴 (숫자와 쉼표, 원화 기호)
  const pricePattern = /([0-9,]+)\s*원?/g
  
  let currentProduct: Partial<ProductInput & { lineIndex?: number }> | null = null
  let productBlocks: Array<{ name: string; price: number | null; manufacturer: string | null; description: string | null }> = []
  
  // 제품 블록 찾기 (제품명 중심) - 가격은 선택사항
  const MAX_LINES_FROM_NAME_TO_PRICE = 3 // 제품명과 가격 사이 최대 줄 수 (가격 추출용)
  const MAX_LINES_FOR_PRODUCT_BLOCK = 2 // 제품 블록 최대 줄 수 (제품명 + 제조사 정도만)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 제외 패턴 체크
    if (excludePatterns.some(pattern => pattern.test(line))) {
      // 제외 패턴이면 현재 제품 블록 종료
      if (currentProduct && currentProduct.name) {
        productBlocks.push({
          name: currentProduct.name,
          price: currentProduct.price || null,
          manufacturer: currentProduct.manufacturer || null,
          description: null,
        })
        currentProduct = null
      }
      continue
    }
    
    // 제품명 후보 찾기 (보조기기 키워드 포함, 적절한 길이)
    const hasAssistiveKeyword = assistiveDeviceKeywords.some(keyword => line.includes(keyword))
    const isValidLength = line.length >= 5 && line.length <= 100
    const hasValidChars = /^[가-힣a-zA-Z0-9\s\-()]+$/.test(line)
    
    // 제품명으로 보이는 패턴 추가 검증
    const looksLikeProductName = 
      hasAssistiveKeyword && 
      isValidLength && 
      hasValidChars &&
      !line.includes("주의") &&
      !line.includes("배송") &&
      !line.includes("환불") &&
      !line.includes("교환") &&
      !line.includes("문의") &&
      !line.includes("고객") &&
      !line.includes("센터") &&
      !line.match(/^\d+원/) && // 가격만 있는 줄 제외
      !line.match(/^[가-힣]{1,3}\s*:/) // "제조사:", "가격:" 같은 라벨 제외
    
    if (looksLikeProductName) {
      // 이전 제품 블록 저장 (제품명만 있어도 저장)
      if (currentProduct && currentProduct.name) {
        productBlocks.push({
          name: currentProduct.name,
          price: currentProduct.price || null,
          manufacturer: currentProduct.manufacturer || null,
          description: null,
        })
      }
      
      // 새 제품 시작
      currentProduct = {
        name: line,
        price: null,
        manufacturer: null,
        description: null,
        lineIndex: i, // 제품명이 시작된 줄 번호
      }
      continue
    }
    
    // 제품 정보 추출 (현재 제품이 있을 때만)
    if (currentProduct) {
      const linesFromName = i - (currentProduct.lineIndex || i)
      
      // 제품명으로부터 너무 멀리 떨어지면 제품 블록 종료 (가격 유무와 무관)
      if (linesFromName > MAX_LINES_FOR_PRODUCT_BLOCK) {
        if (currentProduct.name) {
          productBlocks.push({
            name: currentProduct.name,
            price: currentProduct.price || null,
            manufacturer: currentProduct.manufacturer || null,
            description: null,
          })
        }
        currentProduct = null
        continue
      }
      
      // 가격 추출 (선택사항, 제품명으로부터 3줄 이내)
      const priceMatch = line.match(pricePattern)
      if (priceMatch && !currentProduct.price && linesFromName <= MAX_LINES_FROM_NAME_TO_PRICE) {
        const priceStr = priceMatch[0].replace(/[^0-9]/g, "")
        const price = parseInt(priceStr, 10)
        // 가격이 합리적인 범위인지 확인 (1,000원 ~ 50,000,000원)
        if (!isNaN(price) && price >= 1000 && price <= 50000000) {
          currentProduct.price = price
          // 가격을 찾아도 제품 블록을 즉시 종료하지 않음 (제조사 추출 기회 제공)
        }
      }
      
      // 제조사 추출 (제품명 바로 다음 줄만)
      if (linesFromName === 1 && !currentProduct.manufacturer) {
        if (
          line.includes("제조사") || 
          line.includes("제조") || 
          line.includes("Manufacturer") || 
          line.includes("브랜드") ||
          (line.length >= 2 && line.length <= 30 && /^[가-힣a-zA-Z\s]+$/.test(line))
        ) {
          const manufacturer = line.replace(/제조사|제조|Manufacturer|브랜드|:/g, "").trim()
          if (manufacturer && manufacturer.length >= 2 && manufacturer.length < 50) {
            currentProduct.manufacturer = manufacturer
          }
        }
      }
      
      // 설명은 수집하지 않음
    }
  }
  
  // 마지막 제품 블록 저장 (제품명만 있어도 저장)
  if (currentProduct && currentProduct.name) {
    productBlocks.push({
      name: currentProduct.name,
      price: currentProduct.price || null,
      manufacturer: currentProduct.manufacturer || null,
      description: null,
    })
  }
  
  // ISO 코드 자동 매칭 및 제품 생성
  for (const block of productBlocks) {
    // ISO 코드 자동 추천 (간단한 키워드 매칭)
    let isoCode = "00 00"
    const nameLower = block.name.toLowerCase()
    
    if (nameLower.includes("식기") || nameLower.includes("식사") || nameLower.includes("숟가락") || nameLower.includes("포크") || nameLower.includes("컵")) {
      isoCode = "15 09"
    } else if (nameLower.includes("전동") && nameLower.includes("휠체어")) {
      isoCode = "12 23"
    } else if (nameLower.includes("휠체어")) {
      isoCode = "12 22"
    } else if (nameLower.includes("워커") || nameLower.includes("보행기") || nameLower.includes("지팡이") || nameLower.includes("목발")) {
      isoCode = "12 06"
    } else if (nameLower.includes("경사로") || nameLower.includes("승강기") || nameLower.includes("램프")) {
      isoCode = "18 30"
    } else if (nameLower.includes("체위") || nameLower.includes("리프트")) {
      isoCode = "12 31"
    } else if (nameLower.includes("보청기") || nameLower.includes("청각") || nameLower.includes("난청")) {
      isoCode = "21 06"
    } else if (nameLower.includes("의사소통") || nameLower.includes("aac")) {
      isoCode = "22 30"
    } else if (nameLower.includes("확대경") || nameLower.includes("돋보기") || nameLower.includes("시각")) {
      isoCode = "22 03"
    } else if (nameLower.includes("목욕") || nameLower.includes("샤워") || nameLower.includes("욕조")) {
      isoCode = "15 03"
    } else if (nameLower.includes("착의") || nameLower.includes("의복")) {
      isoCode = "15 04"
    } else if (nameLower.includes("청소")) {
      isoCode = "15 05"
    } else if (nameLower.includes("요리") || nameLower.includes("조리")) {
      isoCode = "15 06"
    }
    
    // 제품명이 너무 짧거나 긴 경우 제외
    if (block.name.length < 5 || block.name.length > 100) {
      continue
    }
    
    // 중복 제거 (이미 같은 이름의 제품이 있는지 확인)
    const isDuplicate = products.some(p => p.name === block.name)
    if (isDuplicate) {
      continue
    }
    
    products.push({
      name: block.name,
      iso_code: isoCode,
      price: block.price,
      purchase_link: null,
      image_url: null,
      manufacturer: block.manufacturer,
      category: null,
      description: null, // PDF에서는 설명을 수집하지 않음
      is_active: true,
    })
  }
  
  return products
}

