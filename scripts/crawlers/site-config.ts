/**
 * 크롤링 대상 사이트 설정
 */

export interface SiteConfig {
  name: string
  baseUrl: string
  searchUrl?: string // 검색 URL 패턴 (있으면 사용)
  categoryUrls?: Record<string, string> // 카테고리별 URL 매핑
  selectors: {
    productList: string[] // 상품 목록 셀렉터 (우선순위 순)
    productName: string[] // 상품명 셀렉터
    productPrice: string[] // 가격 셀렉터
    productImage: string[] // 이미지 셀렉터
    productLink: string[] // 링크 셀렉터
  }
  enabled: boolean // 활성화 여부
  notes?: string // 메모
}

/**
 * 지원하는 사이트 목록
 */
export const SITE_CONFIGS: Record<string, SiteConfig> = {
  ablelife: {
    name: "에이블라이프",
    baseUrl: "https://www.ablelife.co.kr",
    // 카테고리별 URL 매핑
    categoryUrls: {
      "휠체어": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011&type=X",
      "워커": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=012&type=X",
      "목발": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=013&type=X",
      "보행보조": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=014&type=X",
      "보행기": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=015&type=X",
    },
    selectors: {
      productList: [
        "ul.product_list > li", // 문서에서 확인된 우선 셀렉터
        ".product_list > li",
        ".prd-list > li", // 추가 시도
        "ul.prd-list > li",
        "li[class*='product']",
        ".board_list > li",
        "[class*='product']",
      ],
      productName: [
        ".product_name", // 문서에서 확인된 우선 셀렉터
        "a[href*='shopdetail']", // 링크에서 텍스트 추출
        ".prd-name",
        ".prd_list_name",
        ".name",
        "h3",
        "h4",
        "a",
      ],
      productPrice: [
        ".price", // 문서에서 확인된 우선 셀렉터
        ".product_price",
        "[class*='price']",
        ".cost",
      ],
      productImage: [
        "img[src*='shopimages']", // 문서에서 확인된 우선 셀렉터
        ".product_img img",
        "img",
      ],
      productLink: [
        "a[href*='shopdetail']", // 문서에서 확인된 우선 셀렉터
        "a",
      ],
    },
    enabled: true,
    notes: "보조기기 전문 쇼핑몰",
  },
  carelifemall: {
    name: "케어라이프몰",
    baseUrl: "https://www.carelifemall.co.kr",
    selectors: {
      productList: [
        ".prd-list > li",
        ".new-prd-list > li",
        ".recmd-prd-list > li",
        ".special-prd-list > li",
        "ul[class*='prd-list'] > li",
        "[class*='product']",
      ],
      productName: [
        ".f2s-item-name",
        ".product_name",
        ".name",
        "h3",
        "h4",
      ],
      productPrice: [
        ".f2s-item-price",
        ".price",
        "[class*='price']",
      ],
      productImage: [
        "img",
        ".product_img img",
      ],
      productLink: [
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "보조기기 전문 쇼핑몰",
  },
  willbe: {
    name: "윌비",
    baseUrl: "https://willbe.kr",
    selectors: {
      productList: [
        ".item-list > li",
        ".item-wrap > li",
        "ul.item-list > li",
        "ul.item-wrap > li",
        "[class*='item']",
        "[class*='product']",
      ],
      productName: [
        ".item-cont",
        ".product_name",
        ".name",
        "h3",
        "h4",
      ],
      productPrice: [
        ".price",
        "[class*='price']",
        ".item-price",
      ],
      productImage: [
        "img",
        ".product_img img",
      ],
      productLink: [
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "보조기기 전문 쇼핑몰",
  },
  "11st": {
    name: "11번가",
    baseUrl: "https://www.11st.co.kr",
    searchUrl: "https://search.11st.co.kr/Search.tmall?kwd={keyword}",
    selectors: {
      productList: [
        ".c_product_list > li",
        "ul.c_product_list > li",
        "li[class*='product']",
        "[class*='product']",
      ],
      productName: [
        ".c_product_item_title",
        ".product_name",
        "h3",
        "h4",
        "a",
      ],
      productPrice: [
        ".c_product_item_price",
        ".price",
        "[class*='price']",
      ],
      productImage: [
        ".c_product_item_thumb img",
        "img[src*='product']",
        "img",
      ],
      productLink: [
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "종합 쇼핑몰",
  },
  permobil: {
    name: "퍼모빌",
    baseUrl: "http://permobil.co.kr",
    // 카테고리별 URL 매핑 (제품 정보 페이지)
    categoryUrls: {
      "소아용": "http://permobil.co.kr/Products/Pediatric/",
      "실외용": "http://permobil.co.kr/Products/Outdoor/",
      "실내/실외": "http://permobil.co.kr/Products/Indoor-Outdoor/",
      "Corpus Seating": "http://permobil.co.kr/Products/Corpus-Seating/",
    },
    selectors: {
      // 주의: 퍼모빌은 제품 정보 페이지만 있고 상품 목록 페이지가 없음
      // 일반적인 쇼핑몰 크롤링에는 적합하지 않음
      productList: [
        "article",
        "[class*='product']",
        "[class*='item']",
      ],
      productName: [
        "h1",
        "h2",
        ".title",
        ".name",
      ],
      productPrice: [
        // 가격 정보 없음 (제품 정보 페이지)
        ".price",
        "[class*='price']",
      ],
      productImage: [
        "img",
        "article img",
      ],
      productLink: [
        "a",
        "article a",
      ],
    },
    enabled: false, // 제품 목록 페이지가 없어 크롤링 비활성화
    notes: "휠체어 전문 브랜드 - 제품 정보 페이지만 있고 상품 목록 페이지 없음 (크롤링 비활성화)",
  },
  wheelopia: {
    name: "휠로피아",
    baseUrl: "https://www.wheelopia.co.kr",
    selectors: {
      productList: [
        ".top_product > li",
        ".list > li",
        ".board_list > li",
        "ul[class*='list'] > li",
        "[class*='product']",
      ],
      productName: [
        ".product_name",
        ".name",
        "h3",
        "h4",
      ],
      productPrice: [
        ".price",
        "[class*='price']",
      ],
      productImage: [
        "img",
        ".product_img img",
      ],
      productLink: [
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "휠체어 전문 쇼핑몰",
  },
  "sk-easymove": {
    name: "SK 이지무브",
    baseUrl: "https://www.sk-easymove.co.kr",
    selectors: {
      productList: [
        ".item",
        ".item-img-wrap",
        "li.item",
        "div.item",
        "[class*='item']",
        "[class*='product']",
      ],
      productName: [
        ".item-name",
        ".product_name",
        ".name",
        "h3",
        "h4",
      ],
      productPrice: [
        ".item-price",
        ".price",
        "[class*='price']",
      ],
      productImage: [
        ".item-img-wrap img",
        ".item-img-overlay img",
        "img",
      ],
      productLink: [
        ".item a",
        "a",
        "a[href*='product']",
      ],
    },
    enabled: true,
    notes: "보조기기 전문 쇼핑몰",
  },
}

/**
 * 활성화된 사이트만 반환
 */
export function getEnabledSites(): SiteConfig[] {
  return Object.values(SITE_CONFIGS).filter((site) => site.enabled)
}

/**
 * 사이트 이름으로 설정 가져오기
 */
export function getSiteConfig(siteName: string): SiteConfig | undefined {
  return SITE_CONFIGS[siteName]
}

