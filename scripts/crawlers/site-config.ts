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
      // 휠체어 카테고리 (xcode=003)
      "유모차형-틸팅/리클형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011&type=X",
      "유모차형-기본형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=009&type=X",
      "기본형,보호자형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=001&type=X",
      "활동형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=004&type=X",
      "착탈,분리형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=002&type=X",
      "아동,청소년용": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=003&type=X",
      "특수,틸트형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=005&type=X",
      "거상,침대형": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=008&type=X",
      "전동휠체어": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=007&type=X",
      "휠체어방석": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=010&type=X",
      "휠체어소품": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=006&type=X",
      // 기타 카테고리
      "워커": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=012&type=X",
      "목발": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=013&type=X",
      "보행보조": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=014&type=X",
      "보행기": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=015&type=X",
      // 전체 휠체어 카테고리 (모든 휠체어 관련 카테고리)
      "휠체어": "https://www.ablelife.co.kr/shop/shopbrand.html?xcode=003&mcode=011&type=X", // 기본값
    },
    selectors: {
      productList: [
        "table tbody tr", // 테이블 행
        "table tr", // 테이블 행
        "tr", // 모든 행
        "td:has(a[href*='shopdetail'])", // 테이블 셀 (상품 링크가 있는 셀)
        "td a[href*='shopdetail']", // 상품 링크 (부모 요소로 찾기)
        "ul.product_list > li", // 문서에서 확인된 우선 셀렉터
        ".product_list > li",
        ".prd-list > li", // 추가 시도
        "ul.prd-list > li",
        "li[class*='product']",
        ".board_list > li",
        "[class*='product']",
      ],
      productName: [
        "a[href*='shopdetail']", // 링크에서 텍스트 추출 (우선)
        "td a[href*='shopdetail']", // 테이블 셀 안의 링크
        ".product_name", // 문서에서 확인된 우선 셀렉터
        ".prd-name",
        ".prd_list_name",
        ".name",
        "h3",
        "h4",
        "a",
      ],
      productPrice: [
        "td:has(strong)", // 테이블 셀 안의 strong 태그
        "td strong", // strong 태그
        ".price", // 문서에서 확인된 우선 셀렉터
        ".product_price",
        "[class*='price']",
        ".cost",
      ],
      productImage: [
        "a[href*='shopdetail'] img", // 상품 링크 안의 이미지
        "td img[src*='shopimages']", // 테이블 셀 안의 이미지
        "img[src*='shopimages']", // 문서에서 확인된 우선 셀렉터
        ".product_img img",
        "img",
      ],
      productLink: [
        "a[href*='shopdetail']", // 문서에서 확인된 우선 셀렉터
        "td a[href*='shopdetail']", // 테이블 셀 안의 링크
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
    // 카테고리별 URL 매핑
    categoryUrls: {
      "전동휠체어": "https://www.wheelopia.co.kr/shop/goods/goods_list.php?category=011001",
      "스탠딩": "https://www.wheelopia.co.kr/shop/goods/goods_list.php?category=011001001",
      "수동휠체어": "https://www.wheelopia.co.kr/shop/goods/goods_list.php?category=011002",
      "워커": "https://www.wheelopia.co.kr/shop/goods/goods_list.php?category=011012",
    },
    selectors: {
      productList: [
        "table tbody tr", // 테이블 행
        "tr:has(a[href*='goods_view'])", // 상품 링크가 있는 행
        "tr:has(a[href*='goods_view.php'])", // 상품 상세 페이지 링크가 있는 행
        "tbody tr:not(:first-child)", // 첫 번째 행(헤더) 제외
        "table tr:has(td)", // td가 있는 행
        "tr[onclick]", // 클릭 가능한 행
        "tbody tr",
        "table tr",
        "tr",
      ],
      productName: [
        "a[href*='goods_view']", // 상품 링크 텍스트
        "td a[href*='goods_view']", // 상품 링크
        "td:first-child a", // 첫 번째 셀의 링크
        "td a",
        "a",
      ],
      productPrice: [
        "td strong", // <td><strong>가격</strong></td>
        "td b", // <td><b>가격</b></td>
        "strong",
        "b",
        "td:has(strong)",
        "[class*='price']",
        ".price",
      ],
      productImage: [
        "a[href*='goods_view'] img", // 상품 링크 안의 이미지
        "td:first-child img", // 첫 번째 셀의 이미지
        "td img", // 테이블 셀 안의 이미지
        "img[src*='data']", // data 폴더의 이미지
        "img[src*='goods']", // goods 관련 이미지
        "img",
      ],
      productLink: [
        "a[href*='goods_view.php']", // 상품 상세 페이지 링크
        "a[href*='goods_view']",
        "td a[href*='goods_view']",
        "td a[href*='goods']",
        "td a",
        "a",
      ],
    },
    enabled: true,
    notes: "휠체어 전문 쇼핑몰 - 테이블 형식 상품 목록",
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

