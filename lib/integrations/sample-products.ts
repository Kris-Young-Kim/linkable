/**
 * ISO 9999:2022 (7th Edition) 기준 샘플 보조기기 상품 데이터
 * 
 * 실제 쿠팡/유통업체 API 연동 전까지 사용할 초기 데이터
 * 
 * 참고: ISO 9999:2022 코드 형식
 * - Subclass: 4자리 (예: 1830, 1509, 1231)
 * - 표시 형식: 공백 포함 (예: "18 30", "15 09", "12 31")
 */

import type { ProductInput } from "./product-sync"

export const sampleProducts: ProductInput[] = [
  // ISO 18 30: 수직 접근성 보조기기 (경사로, 승강기)
  {
    name: "접이식 알루미늄 경사로",
    iso_code: "18 30",
    manufacturer: "보조공학 전문",
    description: "문턱이나 계단을 해소해 휠체어 이동을 돕는 접이식 경사로. 알루미늄 소재로 가볍고 내구성이 뛰어납니다.",
    image_url: "https://via.placeholder.com/400x300?text=경사로",
    purchase_link: "https://www.coupang.com/vp/products/example1",
    price: 89000,
    category: "이동 보조",
    is_active: true,
  },
  {
    name: "고무 경사로 매트",
    iso_code: "18 30",
    manufacturer: "안전시설 전문",
    description: "실내 문턱 해소용 고무 경사로. 미끄럼 방지 처리되어 안전합니다.",
    image_url: "https://via.placeholder.com/400x300?text=경사로+매트",
    purchase_link: "https://www.coupang.com/vp/products/example2",
    price: 45000,
    category: "이동 보조",
    is_active: true,
  },

  // ISO 15 09: 식사 및 음주 보조기기
  {
    name: "무게조절 숟가락 세트",
    iso_code: "15 09",
    manufacturer: "재활용품 전문",
    description: "손 떨림을 보정해 식사를 돕는 무게감 있는 숟가락. 그립이 편안하고 세척이 쉽습니다.",
    image_url: "https://via.placeholder.com/400x300?text=숟가락",
    purchase_link: "https://www.coupang.com/vp/products/example3",
    price: 35000,
    category: "식사 보조",
    is_active: true,
  },
  {
    name: "각도조절 식기 세트",
    iso_code: "15 09",
    manufacturer: "보조공학 브랜드",
    description: "식사 시 손목 움직임을 최소화하는 각도조절 식기. 접시와 그릇이 한 세트로 구성되어 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=식기+세트",
    purchase_link: "https://www.coupang.com/vp/products/example4",
    price: 65000,
    category: "식사 보조",
    is_active: true,
  },
  {
    name: "무게추식 젓가락",
    iso_code: "15 09",
    manufacturer: "재활용품 전문",
    description: "손 떨림이 있는 분들을 위한 무게추식 젓가락. 그립감이 우수하고 사용이 편리합니다.",
    image_url: "https://via.placeholder.com/400x300?text=젓가락",
    purchase_link: "https://www.coupang.com/vp/products/example5",
    price: 28000,
    category: "식사 보조",
    is_active: true,
  },

  // ISO 12 31: 체위 변경 보조기기
  {
    name: "전동 리프트 체어",
    iso_code: "12 31",
    manufacturer: "의료기기 전문",
    description: "서기/앉기를 돕는 전동 리프트형 체어. 버튼 조작으로 부드럽게 일어설 수 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=리프트+체어",
    purchase_link: "https://www.coupang.com/vp/products/example6",
    price: 1200000,
    category: "이동 보조",
    is_active: true,
  },
  {
    name: "전동 보조기",
    iso_code: "12 31",
    manufacturer: "보조공학 브랜드",
    description: "일상생활에서 서기/앉기 동작을 보조하는 전동 장치. 가정용으로 설계되었습니다.",
    image_url: "https://via.placeholder.com/400x300?text=전동+보조기",
    purchase_link: "https://www.coupang.com/vp/products/example7",
    price: 850000,
    category: "이동 보조",
    is_active: true,
  },

  // ISO 12 06: 양팔 조작 보행 보조기기
  {
    name: "4단 접이식 지팡이",
    iso_code: "12 06",
    manufacturer: "보행보조 전문",
    description: "균형 유지와 이동 속도 향상을 위한 접이식 지팡이. 높이 조절이 가능합니다.",
    image_url: "https://via.placeholder.com/400x300?text=지팡이",
    purchase_link: "https://www.coupang.com/vp/products/example8",
    price: 25000,
    category: "보행 보조",
    is_active: true,
  },
  {
    name: "알루미늄 보행기",
    iso_code: "12 06",
    manufacturer: "보행보조 전문",
    description: "안정적인 보행을 돕는 알루미늄 보행기. 접이식으로 보관이 편리합니다.",
    image_url: "https://via.placeholder.com/400x300?text=보행기",
    purchase_link: "https://www.coupang.com/vp/products/example9",
    price: 95000,
    category: "보행 보조",
    is_active: true,
  },
  {
    name: "손목 보호 지팡이",
    iso_code: "12 06",
    manufacturer: "보행보조 전문",
    description: "손목 부담을 줄이는 인체공학적 디자인의 지팡이. 그립감이 우수합니다.",
    image_url: "https://via.placeholder.com/400x300?text=손목+지팡이",
    purchase_link: "https://www.coupang.com/vp/products/example10",
    price: 45000,
    category: "보행 보조",
    is_active: true,
  },

  // ISO 30 03: 놀이 보조기기
  {
    name: "인지 재활 퍼즐 세트",
    iso_code: "30 03",
    manufacturer: "재활용품 전문",
    description: "가족과 함께 사용할 수 있는 인지 재활 퍼즐 세트. 다양한 난이도로 구성되어 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=퍼즐",
    purchase_link: "https://www.coupang.com/vp/products/example11",
    price: 55000,
    category: "인지 재활",
    is_active: true,
  },
  {
    name: "손 기능 향상 키트",
    iso_code: "30 03",
    manufacturer: "재활용품 전문",
    description: "손 기능 향상을 위한 다양한 도구가 포함된 키트. 일상생활 동작 연습에 도움이 됩니다.",
    image_url: "https://via.placeholder.com/400x300?text=손기능+키트",
    purchase_link: "https://www.coupang.com/vp/products/example12",
    price: 78000,
    category: "인지 재활",
    is_active: true,
  },

  // 추가 상품들 (다양한 ISO 코드)
  // ISO 18 18: 지지 손잡이 및 그랩바
  {
    name: "욕실 안전 손잡이",
    iso_code: "18 18",
    manufacturer: "안전시설 전문",
    description: "욕실에서 미끄럼 방지와 균형 유지를 돕는 안전 손잡이. 설치가 간편합니다.",
    image_url: "https://via.placeholder.com/400x300?text=욕실+손잡이",
    purchase_link: "https://www.coupang.com/vp/products/example13",
    price: 35000,
    category: "안전 시설",
    is_active: true,
  },
  // ISO 09 33: 세면, 목욕 및 샤워 보조기기
  {
    name: "욕실 의자",
    iso_code: "09 33",
    manufacturer: "욕실용품 전문",
    description: "욕실에서 안전하게 목욕할 수 있도록 돕는 의자. 미끄럼 방지 처리가 되어 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=욕실+의자",
    purchase_link: "https://www.coupang.com/vp/products/example14",
    price: 65000,
    category: "욕실 보조",
    is_active: true,
  },
  // ISO 18 33: 가정 및 기타 건물의 안전 장비
  {
    name: "침대 안전 난간",
    iso_code: "18 33",
    manufacturer: "안전시설 전문",
    description: "침대에서 떨어지는 것을 방지하는 안전 난간. 높이 조절이 가능합니다.",
    image_url: "https://via.placeholder.com/400x300?text=침대+난간",
    purchase_link: "https://www.coupang.com/vp/products/example15",
    price: 120000,
    category: "안전 시설",
    is_active: true,
  },
  // ISO 18 09: 착석용 가구
  {
    name: "의자 쿠션 (요추 지지)",
    iso_code: "18 09",
    manufacturer: "의료용품 전문",
    description: "장시간 앉아 있을 때 허리 통증을 완화하는 요추 지지 쿠션.",
    image_url: "https://via.placeholder.com/400x300?text=의자+쿠션",
    purchase_link: "https://www.coupang.com/vp/products/example16",
    price: 45000,
    category: "안전 시설",
    is_active: true,
  },
  // ISO 06 06: 상지 보조기
  {
    name: "손목 보호대",
    iso_code: "06 06",
    manufacturer: "의료용품 전문",
    description: "손목 부상을 예방하고 통증을 완화하는 보호대. 일상생활 동작을 돕습니다.",
    image_url: "https://via.placeholder.com/400x300?text=손목+보호대",
    purchase_link: "https://www.coupang.com/vp/products/example17",
    price: 18000,
    category: "보호 장비",
    is_active: true,
  },
  // ISO 06 12: 하지 보조기
  {
    name: "무릎 보호대",
    iso_code: "06 12",
    manufacturer: "의료용품 전문",
    description: "무릎 통증 완화와 보호를 위한 보호대. 활동성을 해치지 않습니다.",
    image_url: "https://via.placeholder.com/400x300?text=무릎+보호대",
    purchase_link: "https://www.coupang.com/vp/products/example18",
    price: 22000,
    category: "보호 장비",
    is_active: true,
  },
  // ISO 18 12: 침대 및 침대 장비
  {
    name: "목 보호 베개",
    iso_code: "18 12",
    manufacturer: "의료용품 전문",
    description: "목 통증 완화와 올바른 자세 유지를 돕는 인체공학적 베개.",
    image_url: "https://via.placeholder.com/400x300?text=목+베개",
    purchase_link: "https://www.coupang.com/vp/products/example19",
    price: 55000,
    category: "안전 시설",
    is_active: true,
  },
  // ISO 04 48: 운동, 근력, 균형 및 심폐 훈련 장비
  {
    name: "손가락 재활 도구 세트",
    iso_code: "04 48",
    manufacturer: "재활용품 전문",
    description: "손가락 기능 향상을 위한 다양한 재활 도구 세트. 일상생활 동작 연습에 도움이 됩니다.",
    image_url: "https://via.placeholder.com/400x300?text=손가락+도구",
    purchase_link: "https://www.coupang.com/vp/products/example20",
    price: 68000,
    category: "재활 도구",
    is_active: true,
  },
  // ISO 04 48: 운동, 근력, 균형 및 심폐 훈련 장비
  {
    name: "보행 연습 트레드밀",
    iso_code: "04 48",
    manufacturer: "운동기구 전문",
    description: "안전한 보행 연습을 위한 소형 트레드밀. 속도 조절이 가능합니다.",
    image_url: "https://via.placeholder.com/400x300?text=트레드밀",
    purchase_link: "https://www.coupang.com/vp/products/example21",
    price: 450000,
    category: "보행 보조",
    is_active: true,
  },
  // ISO 06 06: 상지 보조기
  {
    name: "의료용 보조기 (상지)",
    iso_code: "06 06",
    manufacturer: "의료기기 전문",
    description: "상지 기능 보조를 위한 의료용 보조기. 일상생활 동작을 돕습니다.",
    image_url: "https://via.placeholder.com/400x300?text=상지+보조기",
    purchase_link: "https://www.coupang.com/vp/products/example22",
    price: 180000,
    category: "의료 보조기",
    is_active: true,
  },
  // ISO 06 12: 하지 보조기
  {
    name: "의료용 보조기 (하지)",
    iso_code: "06 12",
    manufacturer: "의료기기 전문",
    description: "하지 기능 보조를 위한 의료용 보조기. 보행을 돕습니다.",
    image_url: "https://via.placeholder.com/400x300?text=하지+보조기",
    purchase_link: "https://www.coupang.com/vp/products/example23",
    price: 220000,
    category: "의료 보조기",
    is_active: true,
  },
  // ISO 12 23: 전동 휠체어
  {
    name: "전동 휠체어",
    iso_code: "12 23",
    manufacturer: "의료기기 전문",
    description: "장거리 이동을 돕는 전동 휠체어. 조작이 간편하고 안전합니다.",
    image_url: "https://via.placeholder.com/400x300?text=전동+휠체어",
    purchase_link: "https://www.coupang.com/vp/products/example24",
    price: 1500000,
    category: "이동 보조",
    is_active: true,
  },
  // ISO 12 22: 수동 휠체어
  {
    name: "수동 휠체어",
    iso_code: "12 22",
    manufacturer: "의료기기 전문",
    description: "일상생활 이동을 돕는 수동 휠체어. 가볍고 접이식으로 보관이 편리합니다.",
    image_url: "https://via.placeholder.com/400x300?text=수동+휠체어",
    purchase_link: "https://www.coupang.com/vp/products/example25",
    price: 350000,
    category: "이동 보조",
    is_active: true,
  },
  // ISO 18 18: 지지 손잡이 및 그랩바
  {
    name: "욕실 안전 바",
    iso_code: "18 18",
    manufacturer: "안전시설 전문",
    description: "욕실에서 균형 유지와 안전을 돕는 안전 바. 벽면 설치형입니다.",
    image_url: "https://via.placeholder.com/400x300?text=욕실+바",
    purchase_link: "https://www.coupang.com/vp/products/example26",
    price: 45000,
    category: "안전 시설",
    is_active: true,
  },
  // ISO 18 30: 수직 접근성 보조기기
  {
    name: "계단 승강기",
    iso_code: "18 30",
    manufacturer: "승강기 전문",
    description: "계단 이동을 돕는 승강기. 설치형으로 안전하게 사용할 수 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=계단+승강기",
    purchase_link: "https://www.coupang.com/vp/products/example27",
    price: 2500000,
    category: "이동 보조",
    is_active: true,
  },
  // ISO 18 33: 가정 및 기타 건물의 안전 장비
  {
    name: "욕실 미끄럼 방지 매트",
    iso_code: "18 33",
    manufacturer: "욕실용품 전문",
    description: "욕실 바닥 미끄럼 방지를 위한 안전 매트. 세척이 쉽고 위생적입니다.",
    image_url: "https://via.placeholder.com/400x300?text=욕실+매트",
    purchase_link: "https://www.coupang.com/vp/products/example28",
    price: 25000,
    category: "욕실 보조",
    is_active: true,
  },
  // ISO 12 31: 체위 변경 보조기기
  {
    name: "침대 리프터",
    iso_code: "12 31",
    manufacturer: "의료기기 전문",
    description: "침대에서 일어나는 것을 돕는 리프터. 전동식으로 조작이 간편합니다.",
    image_url: "https://via.placeholder.com/400x300?text=침대+리프터",
    purchase_link: "https://www.coupang.com/vp/products/example29",
    price: 450000,
    category: "이동 보조",
    is_active: true,
  },
  // ISO 04 48: 운동, 근력, 균형 및 심폐 훈련 장비
  {
    name: "재활 운동 밴드 세트",
    iso_code: "04 48",
    manufacturer: "운동기구 전문",
    description: "전신 재활 운동을 위한 저항 밴드 세트. 다양한 강도로 구성되어 있습니다.",
    image_url: "https://via.placeholder.com/400x300?text=운동+밴드",
    purchase_link: "https://www.coupang.com/vp/products/example30",
    price: 35000,
    category: "재활 도구",
    is_active: true,
  },
]

