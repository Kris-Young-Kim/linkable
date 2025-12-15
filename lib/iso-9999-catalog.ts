/**
 * ISO 9999:2022 전체 카테고리 카탈로그
 * 
 * ISO 9999:2022 (7th Edition) 표준에 따른 전체 보조기기 분류 코드 목록
 * 제품 등록 시 모든 ISO 코드를 선택할 수 있도록 제공
 */

export type IsoCodeInfo = {
  iso: string // Subclass 레벨 (예: "12 02")
  label: string // 한국어 분류명
  description: string // 상세 설명
  class: string // Class 레벨 (예: "12")
  subclass: string // Subclass 숫자 (예: "1202")
}

/**
 * ISO 9999:2022 전체 카테고리 목록
 * 
 * 참고: ISO 9999:2022는 3단계 계층 구조
 * - Class: 2자리 (예: 12, 15, 18)
 * - Subclass: 4자리 (예: 1202, 1509, 1830)
 * - Division: 6자리 (예: 120201, 150901)
 * 
 * 여기서는 Subclass 레벨까지 제공 (표시는 공백 포함: "12 02")
 */
export const iso9999Catalog: IsoCodeInfo[] = [
  // 04 - 생리적/심리적 기능 측정, 자극, 훈련용 보조기기
  {
    iso: "04 03",
    label: "인지 훈련 보조기기",
    description: "기억, 주의, 사고 기능 훈련을 위한 보조기기",
    class: "04",
    subclass: "0403",
  },
  {
    iso: "04 48",
    label: "운동, 근력, 균형 및 심폐 훈련 장비",
    description: "신체 기능 향상을 위한 훈련 장비",
    class: "04",
    subclass: "0448",
  },

  // 06 - 보조기 및 의지
  {
    iso: "06 03",
    label: "상지 보조기",
    description: "상지 기능 보조를 위한 보조기",
    class: "06",
    subclass: "0603",
  },
  {
    iso: "06 06",
    label: "상지 보조기 (상세)",
    description: "상지 보조기 상세 분류",
    class: "06",
    subclass: "0606",
  },
  {
    iso: "06 12",
    label: "하지 보조기",
    description: "하지 기능 보조를 위한 보조기",
    class: "06",
    subclass: "0612",
  },

  // 09 - 자가관리 활동 및 참여용 보조기기
  {
    iso: "09 12",
    label: "배변 관리 보조기기",
    description: "배변 활동을 돕는 보조기기",
    class: "09",
    subclass: "0912",
  },
  {
    iso: "09 18",
    label: "옷 입기 보조기기",
    description: "옷 입기 활동을 돕는 보조기기",
    class: "09",
    subclass: "0918",
  },
  {
    iso: "09 33",
    label: "세면, 목욕 및 샤워 보조기기",
    description: "세면, 목욕, 샤워 활동을 돕는 보조기기",
    class: "09",
    subclass: "0933",
  },

  // 12 - 개인 이동 및 교통 관련 활동 및 참여용 보조기기
  {
    iso: "12 02",
    label: "보행 보조기기 (팔 조작 없음)",
    description: "팔을 사용하지 않는 보행 보조기기",
    class: "12",
    subclass: "1202",
  },
  {
    iso: "12 03",
    label: "보행 보조기기 (한 팔 조작)",
    description: "한 팔로 조작하는 보행 보조기기",
    class: "12",
    subclass: "1203",
  },
  {
    iso: "12 06",
    label: "보행 보조기기 (양팔 조작)",
    description: "양팔로 조작하는 보행 보조기기 (지팡이, 보행기 등)",
    class: "12",
    subclass: "1206",
  },
  {
    iso: "12 08",
    label: "안내 지팡이 및 상징 지팡이",
    description: "시각 장애인을 위한 안내 지팡이 및 상징 지팡이",
    class: "12",
    subclass: "1208",
  },
  {
    iso: "12 22",
    label: "수동 휠체어",
    description: "수동으로 이동하는 휠체어",
    class: "12",
    subclass: "1222",
  },
  {
    iso: "12 23",
    label: "전동 휠체어",
    description: "전동으로 이동하는 휠체어",
    class: "12",
    subclass: "1223",
  },
  {
    iso: "12 31",
    label: "체위 변경 보조기기",
    description: "서기/앉기/누우기를 돕는 체위 변경 보조기기",
    class: "12",
    subclass: "1231",
  },
  {
    iso: "12 36",
    label: "사람 들어올리기 보조기기",
    description: "사람을 들어올리는 보조기기",
    class: "12",
    subclass: "1236",
  },

  // 15 - 가정 활동 및 참여용 보조기기
  {
    iso: "15 03",
    label: "음식 및 음료 준비 보조기기",
    description: "음식 및 음료 준비 활동을 돕는 보조기기",
    class: "15",
    subclass: "1503",
  },
  {
    iso: "15 06",
    label: "설거지 보조기기",
    description: "설거지 활동을 돕는 보조기기",
    class: "15",
    subclass: "1506",
  },
  {
    iso: "15 09",
    label: "식사 및 음주 보조기기",
    description: "식사와 음주 활동을 돕는 보조기기",
    class: "15",
    subclass: "1509",
  },
  {
    iso: "15 12",
    label: "청소 보조기기",
    description: "가정 청소 활동을 돕는 보조기기",
    class: "15",
    subclass: "1512",
  },
  {
    iso: "15 15",
    label: "가정용 섬유 제작 및 유지 보조기기",
    description: "가정에서 섬유 제작 및 유지 활동을 돕는 보조기기",
    class: "15",
    subclass: "1515",
  },
  {
    iso: "15 18",
    label: "가정용 정원 및 잔디 관리 보조기기",
    description: "가정에서 정원 및 잔디 관리 활동을 돕는 보조기기",
    class: "15",
    subclass: "1518",
  },

  // 18 - 실내외 인공 환경에서 활동 지원용 가구, 고정물 및 기타 보조기기
  {
    iso: "18 03",
    label: "테이블",
    description: "활동 지원을 위한 테이블",
    class: "18",
    subclass: "1803",
  },
  {
    iso: "18 06",
    label: "조명 기기",
    description: "시각 보조를 위한 조명 기기",
    class: "18",
    subclass: "1806",
  },
  {
    iso: "18 09",
    label: "앉기 가구",
    description: "안정적인 앉기를 돕는 가구",
    class: "18",
    subclass: "1809",
  },
  {
    iso: "18 12",
    label: "침대 및 침대 장비",
    description: "안정적인 자세 유지를 돕는 침대 및 침대 장비",
    class: "18",
    subclass: "1812",
  },
  {
    iso: "18 15",
    label: "가구 높이 조절 보조기기",
    description: "가구 높이를 조절하는 보조기기",
    class: "18",
    subclass: "1815",
  },
  {
    iso: "18 18",
    label: "지지 손잡이 및 그랩바",
    description: "균형 유지와 안전을 돕는 손잡이 및 그랩바",
    class: "18",
    subclass: "1818",
  },
  {
    iso: "18 21",
    label: "문, 창문 및 커튼 개폐기",
    description: "문, 창문, 커튼을 열고 닫는 보조기기",
    class: "18",
    subclass: "1821",
  },
  {
    iso: "18 24",
    label: "집 및 기타 건물의 구조 요소",
    description: "집 및 기타 건물의 구조 요소 보조기기",
    class: "18",
    subclass: "1824",
  },
  {
    iso: "18 30",
    label: "수직 접근성 보조기기",
    description: "경사로, 승강기 등 수직 이동을 돕는 보조기기",
    class: "18",
    subclass: "1830",
  },
  {
    iso: "18 33",
    label: "가정 및 기타 건물의 안전 장비",
    description: "가정 및 기타 건물의 안전을 위한 장비",
    class: "18",
    subclass: "1833",
  },
  {
    iso: "18 36",
    label: "보관용 가구",
    description: "물건 보관을 돕는 가구",
    class: "18",
    subclass: "1836",
  },

  // 21 - 청각 및 관련 기능 보조기기
  {
    iso: "21 06",
    label: "청각 보조기기",
    description: "난청 사용자를 위한 보청기 및 증폭 기기",
    class: "21",
    subclass: "2106",
  },
  {
    iso: "21 09",
    label: "음성 보조기기",
    description: "음성 생성 및 보조 기기",
    class: "21",
    subclass: "2109",
  },
  {
    iso: "21 27",
    label: "평형/전정 보조기기",
    description: "어지럼 및 전정 기능 저하를 보조하는 기기",
    class: "21",
    subclass: "2127",
  },

  // 22 - 의사소통 및 정보 관리용 보조기기
  {
    iso: "22 03",
    label: "시각 보조기기",
    description: "저시력 사용자를 위한 확대경, 돋보기, 시각 보조기기",
    class: "22",
    subclass: "2203",
  },
  {
    iso: "22 06",
    label: "읽기 보조기기",
    description: "시각 장애인을 위한 점자 디스플레이, 스크린 리더, 음성 변환 기기",
    class: "22",
    subclass: "2206",
  },
  {
    iso: "22 30",
    label: "의사소통 보조기기",
    description: "의사소통 디바이스 및 AAC 솔루션",
    class: "22",
    subclass: "2230",
  },
  {
    iso: "22 33",
    label: "학습 및 기억 보조기기",
    description: "읽기, 쓰기, 계산 학습 및 기억 보조를 위한 디지털 기기",
    class: "22",
    subclass: "2233",
  },

  // 24 - 물체 및 장치 제어, 운반, 이동, 취급용 보조기기
  {
    iso: "24 03",
    label: "물건 들기 및 옮기기 보조기기",
    description: "물건 들기 및 옮기기 활동을 돕는 보조기기",
    class: "24",
    subclass: "2403",
  },
  {
    iso: "24 06",
    label: "손 기능 보조기기",
    description: "수의적 운동 조절 기능 향상을 위한 손 기능 보조기기",
    class: "24",
    subclass: "2406",
  },

  // 27 - 물리적 환경 요소 제어, 적응, 측정용 보조기기
  {
    iso: "27 03",
    label: "소음 제어 보조기기",
    description: "소음을 제어하는 보조기기",
    class: "27",
    subclass: "2703",
  },

  // 28 - 직업 활동 및 고용 참여용 보조기기
  {
    iso: "28 03",
    label: "직업용 보조기기",
    description: "직업 활동 및 고용 참여를 돕는 보조기기",
    class: "28",
    subclass: "2803",
  },

  // 30 - 여가 및 레크리에이션용 보조기기
  {
    iso: "30 03",
    label: "놀이 보조기기",
    description: "놀이 활동을 돕는 보조기기",
    class: "30",
    subclass: "3003",
  },
  {
    iso: "30 09",
    label: "스포츠 보조기기",
    description: "스포츠 활동을 돕는 보조기기",
    class: "30",
    subclass: "3009",
  },
]

/**
 * ISO 코드로 정보 조회
 */
export function getIsoCodeInfo(iso: string): IsoCodeInfo | undefined {
  return iso9999Catalog.find((item) => item.iso === iso || item.iso.replace(/\s/g, "") === iso.replace(/\s/g, ""))
}

/**
 * 클래스별 ISO 코드 목록 조회
 */
export function getIsoCodesByClass(classCode: string): IsoCodeInfo[] {
  return iso9999Catalog.filter((item) => item.class === classCode)
}

/**
 * 검색어로 ISO 코드 검색
 */
export function searchIsoCodes(query: string): IsoCodeInfo[] {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return iso9999Catalog

  return iso9999Catalog.filter(
    (item) =>
      item.iso.toLowerCase().includes(normalizedQuery) ||
      item.label.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery) ||
      item.class.includes(normalizedQuery) ||
      item.subclass.includes(normalizedQuery)
  )
}

/**
 * 모든 ISO 코드 목록 반환 (정렬됨)
 */
export function getAllIsoCodes(): IsoCodeInfo[] {
  return [...iso9999Catalog].sort((a, b) => a.iso.localeCompare(b.iso))
}

