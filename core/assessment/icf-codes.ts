export type IcfCategory = "b" | "d" | "e"

export type IcfCode = {
  code: string
  description: string
  category: IcfCategory
  isoHints?: string[]
}

/**
 * ICF 핵심 코드 셋 (확장 버전)
 * 시각, 의사소통, 인지, 자세 관련 도메인 확대
 * 실제 운영 시 `docs/DIR.md`의 활동 분석 표를 기반으로 지속적으로 확장하세요.
 */
export const icfCoreSet: IcfCode[] = [
  // 신체 기능 (Body Functions) - b2xx: 감각 기능
  { code: "b210", description: "시각 기능", category: "b", isoHints: ["22 03", "22 06"] },
  { code: "b215", description: "시각 관련 기능", category: "b", isoHints: ["22 03"] },
  { code: "b230", description: "청각 기능", category: "b", isoHints: ["21 06"] },
  { code: "b235", description: "전정 기능", category: "b", isoHints: ["21 27"] },
  { code: "b240", description: "기관지 및 목소리 기능", category: "b", isoHints: ["21 09"] },
  
  // 신체 기능 - b1xx: 정신 기능
  { code: "b114", description: "지향성 기능", category: "b", isoHints: ["04 03"] },
  { code: "b117", description: "지적 기능", category: "b", isoHints: ["04 03", "22 33"] },
  { code: "b122", description: "전반적 심리사회 기능", category: "b" },
  { code: "b126", description: "기질 및 성격 기능", category: "b" },
  { code: "b130", description: "에너지 및 동기 기능", category: "b" },
  { code: "b140", description: "주의 기능", category: "b", isoHints: ["04 03"] },
  { code: "b144", description: "기억 기능", category: "b", isoHints: ["04 03", "22 33"] },
  { code: "b147", description: "정신 운동 기능", category: "b" },
  { code: "b152", description: "감정 기능", category: "b" },
  { code: "b156", description: "지각 기능", category: "b", isoHints: ["04 03"] },
  { code: "b160", description: "사고 기능", category: "b", isoHints: ["04 03", "22 33"] },
  { code: "b164", description: "고등 인지 기능", category: "b", isoHints: ["04 03", "22 33"] },
  { code: "b167", description: "언어 정신 기능", category: "b", isoHints: ["22 30"] },
  
  // 신체 기능 - b7xx: 신경근골격 및 운동 관련 기능
  { code: "b710", description: "관절 이동성 기능", category: "b", isoHints: ["06 03", "12 31"] },
  { code: "b715", description: "관절 안정성 기능", category: "b", isoHints: ["06 03"] },
  { code: "b720", description: "관절 이동 범위 기능", category: "b", isoHints: ["06 03"] },
  { code: "b730", description: "근력", category: "b", isoHints: ["12 18 06", "12 31"] },
  { code: "b735", description: "근 긴장 기능", category: "b" },
  { code: "b740", description: "근 지구력 기능", category: "b" },
  { code: "b750", description: "운동 반사 기능", category: "b" },
  { code: "b755", description: "불수의적 운동 반응 기능", category: "b" },
  { code: "b760", description: "수의적 운동 조절 기능", category: "b", isoHints: ["12 03", "15 09"] },
  { code: "b765", description: "불수의적 운동 조절(손 떨림)", category: "b", isoHints: ["15 09 13"] },
  { code: "b770", description: "보행 패턴 기능", category: "b", isoHints: ["12 06", "12 08"] },
  { code: "b780", description: "운동 감각 기능", category: "b" },
  
  // 신체 기능 - b8xx: 피부 및 관련 구조 기능
  { code: "b810", description: "피부 보호 기능", category: "b" },
  { code: "b820", description: "피부 재생 기능", category: "b" },
  
  // 활동·참여 (d) - d1xx: 학습 및 지식 적용
  { code: "d110", description: "시청", category: "d", isoHints: ["22 03", "22 06"] },
  { code: "d115", description: "청취(듣기)", category: "d", isoHints: ["21 06", "22 30"] },
  { code: "d120", description: "다른 감각을 통한 목적 지향적 경험", category: "d" },
  { code: "d130", description: "복사하기", category: "d" },
  { code: "d135", description: "연습하기", category: "d" },
  { code: "d140", description: "읽기 학습", category: "d", isoHints: ["22 33"] },
  { code: "d145", description: "쓰기 학습", category: "d", isoHints: ["22 33", "24 06"] },
  { code: "d150", description: "계산하기", category: "d", isoHints: ["22 33"] },
  { code: "d155", description: "기술 습득", category: "d" },
  { code: "d160", description: "주의 집중하기", category: "d", isoHints: ["04 03"] },
  { code: "d163", description: "생각하기", category: "d", isoHints: ["04 03"] },
  { code: "d166", description: "읽기", category: "d", isoHints: ["22 03", "22 33"] },
  { code: "d170", description: "쓰기", category: "d", isoHints: ["22 33", "24 06"] },
  { code: "d172", description: "계산하기", category: "d", isoHints: ["22 33"] },
  { code: "d175", description: "문제 해결하기", category: "d", isoHints: ["04 03"] },
  { code: "d177", description: "의사 결정하기", category: "d", isoHints: ["04 03"] },
  
  // 활동·참여 (d) - d2xx: 일반적인 과제와 요구사항
  { code: "d210", description: "단일 과제 수행하기", category: "d" },
  { code: "d220", description: "다중 과제 수행하기", category: "d" },
  { code: "d230", description: "일상 생활 준비", category: "d" },
  
  // 활동·참여 (d) - d3xx: 의사소통
  { code: "d310", description: "구어 메시지 이해", category: "d", isoHints: ["22 30"] },
  { code: "d315", description: "비구어 메시지 이해", category: "d", isoHints: ["22 30"] },
  { code: "d320", description: "구어 메시지 표현", category: "d", isoHints: ["22 30", "21 09"] },
  { code: "d325", description: "비구어 메시지 표현", category: "d", isoHints: ["22 30"] },
  { code: "d330", description: "대화하기", category: "d", isoHints: ["22 30"] },
  { code: "d335", description: "비공식 메시지 생성", category: "d", isoHints: ["22 30"] },
  { code: "d345", description: "공식 메시지 작성", category: "d", isoHints: ["22 30", "22 33"] },
  { code: "d350", description: "대화", category: "d", isoHints: ["22 30"] },
  { code: "d355", description: "토론", category: "d", isoHints: ["22 30"] },
  { code: "d360", description: "의사소통 기기 사용", category: "d", isoHints: ["22 33"] },
  
  // 활동·참여 (d) - d4xx: 이동
  { code: "d410", description: "서기/앉기/무릎꿇기", category: "d", isoHints: ["18 30 06", "12 31"] },
  { code: "d415", description: "안정한 자세 유지하기", category: "d", isoHints: ["12 31", "18 09"] },
  { code: "d420", description: "체위 변경하기", category: "d", isoHints: ["12 31"] },
  { code: "d430", description: "물건 들기", category: "d", isoHints: ["24 03"] },
  { code: "d435", description: "물건 옮기기", category: "d", isoHints: ["24 03"] },
  { code: "d440", description: "세밀한 손 사용", category: "d", isoHints: ["24 06"] },
  { code: "d445", description: "손과 팔 사용", category: "d", isoHints: ["24 06"] },
  { code: "d450", description: "걷기", category: "d", isoHints: ["12 02", "12 03", "12 06", "18 12 10"] },
  { code: "d455", description: "이동하기", category: "d", isoHints: ["12 22", "12 23"] },
  { code: "d460", description: "다양한 장소로 이동하기", category: "d", isoHints: ["12 22", "12 23", "18 30"] },
  { code: "d465", description: "이동 보조기기 사용하여 이동하기", category: "d", isoHints: ["12 22", "12 23"] },
  { code: "d470", description: "교통수단 이용하기", category: "d" },
  { code: "d475", description: "차량 운전하기", category: "d" },
  
  // 활동·참여 (d) - d5xx: 자가관리
  { code: "d510", description: "씻기", category: "d", isoHints: ["09 33"] },
  { code: "d520", description: "목욕하기", category: "d", isoHints: ["09 33"] },
  { code: "d530", description: "배변 관리", category: "d", isoHints: ["09 12"] },
  { code: "d540", description: "옷 입기", category: "d", isoHints: ["09 18"] },
  { code: "d550", description: "먹기", category: "d", isoHints: ["15 09 13"] },
  { code: "d560", description: "마시기", category: "d", isoHints: ["15 09"] },
  { code: "d570", description: "건강 관리하기", category: "d" },
  
  // 활동·참여 (d) - d6xx: 가정생활
  { code: "d620", description: "상품 및 서비스 획득하기", category: "d" },
  { code: "d630", description: "식사 준비하기", category: "d", isoHints: ["15 03"] },
  { code: "d640", description: "가사 일하기", category: "d", isoHints: ["15 03", "15 12"] },
  { code: "d650", description: "가정 관리하기", category: "d", isoHints: ["15 12"] },
  { code: "d660", description: "도구 사용하기", category: "d", isoHints: ["24 06"] },
  { code: "d670", description: "가정 경제 관리하기", category: "d" },
  
  // 활동·참여 (d) - d9xx: 여가 및 레크리에이션
  { code: "d910", description: "여가 생활", category: "d", isoHints: ["30 03"] },
  { code: "d920", description: "여가 및 취미", category: "d", isoHints: ["30 03"] },
  { code: "d930", description: "종교 및 영성", category: "d" },
  { code: "d940", description: "인권", category: "d" },
  { code: "d950", description: "정치 생활 및 시민권", category: "d" },

  // 환경 요소 (e) - e1xx: 제품 및 기술
  { code: "e110", description: "집 안 구조(바닥, 문턱)", category: "e", isoHints: ["18 24", "18 30"] },
  { code: "e115", description: "일상 생활용 제품 및 기술", category: "e" },
  { code: "e120", description: "건축 환경(계단, 경사로)", category: "e", isoHints: ["18 12 10", "18 30"] },
  { code: "e125", description: "의사소통용 제품 및 기술", category: "e", isoHints: ["22 30"] },
  { code: "e130", description: "교육용 제품 및 기술", category: "e", isoHints: ["22 33"] },
  { code: "e135", description: "직업용 제품 및 기술", category: "e", isoHints: ["28 03"] },
  { code: "e140", description: "문화, 레크리에이션 및 스포츠용 제품 및 기술", category: "e", isoHints: ["30 03", "30 09"] },
  { code: "e145", description: "종교 및 영성 실천용 제품 및 기술", category: "e" },
  { code: "e150", description: "디자인/제품", category: "e" },
  { code: "e155", description: "건축물 설계, 건설 및 건물 제품", category: "e", isoHints: ["18 24", "18 30"] },
  
  // 환경 요소 (e) - e2xx: 자연 환경 및 인간이 만든 환경 변화
  { code: "e210", description: "지형", category: "e" },
  { code: "e215", description: "인구", category: "e" },
  { code: "e220", description: "동식물", category: "e" },
  { code: "e225", description: "기후", category: "e" },
  { code: "e240", description: "빛", category: "e", isoHints: ["18 06", "22 03"] },
  { code: "e250", description: "소음", category: "e", isoHints: ["21 06", "27 03"] },
  { code: "e260", description: "대기 질", category: "e" },
  
  // 환경 요소 (e) - e3xx: 지원 및 관계
  { code: "e310", description: "가족 구성원의 지원", category: "e" },
  { code: "e315", description: "확대 가족의 지원", category: "e" },
  { code: "e320", description: "친구의 지원", category: "e" },
  { code: "e325", description: "동료, 동등한 사람 및 동료의 지원", category: "e" },
  { code: "e330", description: "권위 있는 사람의 지원", category: "e" },
  { code: "e340", description: "개인 간섭 제공자", category: "e" },
  { code: "e355", description: "보건 전문가", category: "e" },
  { code: "e360", description: "다른 전문가", category: "e" },
]

export const findIcfCode = (code: string) => icfCoreSet.find((item) => item.code === code)

