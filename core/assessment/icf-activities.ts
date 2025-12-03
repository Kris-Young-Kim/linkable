/**
 * ICF 활동 항목 정의
 * K-IPPA 평가에서 사용하는 ICF D-Level 활동 항목들
 * PDF 자료: 보조기기성과평가도구(IPPA) 도입을 통한 장애유형상황별 자립생활 지원 보조기기 제안 가이드라인 개발 연구
 */

export type IcfActivity = {
  code: string
  description: string
  category: "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "d7" | "d8" | "d9"
  categoryName: string
}

export const icfActivities: IcfActivity[] = [
  // D1 학습과 지식의 적용
  { code: "d110", description: "보기", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d115", description: "듣기", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d120", description: "기타 의도적인 지각", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d129", description: "기타 명시된 및 상세불명의 의도적 감각경험", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d130", description: "모방", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d132", description: "언어습득", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d133", description: "부가적인 언어습득", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d135", description: "반복", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d137", description: "개념 습득", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d138", description: "정보 습득", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d140", description: "읽기 학습", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d145", description: "쓰기 학습", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d150", description: "계산 학습", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d155", description: "기술 습득", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d159", description: "기타 명시된 및 상세불명의 기본적 학습", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d160", description: "주의집중", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d163", description: "사고", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d166", description: "읽기", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d170", description: "쓰기", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d172", description: "계산", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d175", description: "문제 해결", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d177", description: "의사결정", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d179", description: "기타 명시된 및 상세불명의 지식의 적용", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d198", description: "기타 명시된 학습과 지식의 적용", category: "d1", categoryName: "학습과 지식의 적용" },
  { code: "d199", description: "상세불명의 학습과 지식의 적용", category: "d1", categoryName: "학습과 지식의 적용" },

  // D2 일반적 과제와 요구
  { code: "d210", description: "단일 과제 수행", category: "d2", categoryName: "일반적 과제와 요구" },
  { code: "d220", description: "다중 과제 수행", category: "d2", categoryName: "일반적 과제와 요구" },
  { code: "d230", description: "일상생활 이행", category: "d2", categoryName: "일반적 과제와 요구" },
  { code: "d240", description: "스트레스와 기타 심리적 요구에 대한 대응", category: "d2", categoryName: "일반적 과제와 요구" },
  { code: "d298", description: "기타 명시된 일반적 과제와 요구", category: "d2", categoryName: "일반적 과제와 요구" },
  { code: "d299", description: "상세불명의 일반적 과제와 요구", category: "d2", categoryName: "일반적 과제와 요구" },

  // D3 의사소통
  { code: "d310", description: "구두메시지 수용", category: "d3", categoryName: "의사소통" },
  { code: "d315", description: "비구어적 메시지 수용", category: "d3", categoryName: "의사소통" },
  { code: "d320", description: "표준 수화 수용", category: "d3", categoryName: "의사소통" },
  { code: "d325", description: "문자메시지 수용", category: "d3", categoryName: "의사소통" },
  { code: "d329", description: "기타 명시된 및 상세불명의 수용", category: "d3", categoryName: "의사소통" },
  { code: "d330", description: "말하기", category: "d3", categoryName: "의사소통" },
  { code: "d332", description: "노래부르기", category: "d3", categoryName: "의사소통" },
  { code: "d335", description: "비구어적 메시지 표현", category: "d3", categoryName: "의사소통" },
  { code: "d340", description: "표준 수화로 메시지 표현", category: "d3", categoryName: "의사소통" },
  { code: "d345", description: "메시지 쓰기", category: "d3", categoryName: "의사소통" },
  { code: "d349", description: "기타 명시된 및 상세불명의 의사소통 - 표현", category: "d3", categoryName: "의사소통" },
  { code: "d350", description: "대화", category: "d3", categoryName: "의사소통" },
  { code: "d355", description: "토론", category: "d3", categoryName: "의사소통" },
  { code: "d360", description: "의사소통 기기와 기술의 이용", category: "d3", categoryName: "의사소통" },
  { code: "d369", description: "기타 명시된 및 상세불명의 대화와 의사소통 기기 및 기술의 이용", category: "d3", categoryName: "의사소통" },
  { code: "d398", description: "기타 명시된 의사소통", category: "d3", categoryName: "의사소통" },
  { code: "d399", description: "상세불명의 의사소통", category: "d3", categoryName: "의사소통" },

  // D4 움직임
  { code: "d410", description: "기본적 자세 변경", category: "d4", categoryName: "움직임" },
  { code: "d415", description: "신체의 자세 유지", category: "d4", categoryName: "움직임" },
  { code: "d420", description: "자리이동", category: "d4", categoryName: "움직임" },
  { code: "d429", description: "기타 명시된 및 상세불명의 자세 변경과 유지", category: "d4", categoryName: "움직임" },
  { code: "d430", description: "물건 들어올려 나르기", category: "d4", categoryName: "움직임" },
  { code: "d435", description: "다리로 물건 옮기기", category: "d4", categoryName: "움직임" },
  { code: "d440", description: "미세한 손동작", category: "d4", categoryName: "움직임" },
  { code: "d445", description: "손과 팔의 이용", category: "d4", categoryName: "움직임" },
  { code: "d446", description: "미세한 발동작", category: "d4", categoryName: "움직임" },
  { code: "d449", description: "기타 명시된 및 상세불명의 물건 나르기, 옮기기, 다루기", category: "d4", categoryName: "움직임" },
  { code: "d450", description: "보행", category: "d4", categoryName: "움직임" },
  { code: "d455", description: "이동", category: "d4", categoryName: "움직임" },
  { code: "d460", description: "다른 장소로의 이동", category: "d4", categoryName: "움직임" },
  { code: "d465", description: "장비를 이용한 이동", category: "d4", categoryName: "움직임" },
  { code: "d469", description: "기타 명시된 및 상세불명의 보행과 이동", category: "d4", categoryName: "움직임" },
  { code: "d470", description: "운송수단 이용", category: "d4", categoryName: "움직임" },
  { code: "d475", description: "운전", category: "d4", categoryName: "움직임" },
  { code: "d480", description: "운송수단으로서 동물 등에 타기", category: "d4", categoryName: "움직임" },
  { code: "d489", description: "기타 명시된 및 상세불명의 운송수단을 이용한 이동", category: "d4", categoryName: "움직임" },
  { code: "d498", description: "기타 명시된 이동", category: "d4", categoryName: "움직임" },
  { code: "d499", description: "상세불명의 이동", category: "d4", categoryName: "움직임" },

  // D5 자기관리
  { code: "d510", description: "씻기", category: "d5", categoryName: "자가관리" },
  { code: "d520", description: "신체부위 관리", category: "d5", categoryName: "자가관리" },
  { code: "d530", description: "대소변처리", category: "d5", categoryName: "자가관리" },
  { code: "d540", description: "몸단장", category: "d5", categoryName: "자가관리" },
  { code: "d550", description: "먹기", category: "d5", categoryName: "자가관리" },
  { code: "d560", description: "마시기", category: "d5", categoryName: "자가관리" },
  { code: "d570", description: "자신의 건강 돌보기", category: "d5", categoryName: "자가관리" },
  { code: "d598", description: "기타 명시된 자기관리", category: "d5", categoryName: "자가관리" },
  { code: "d599", description: "상세불명의 자기관리", category: "d5", categoryName: "자가관리" },

  // D6 가정생활
  { code: "d610", description: "주택 획득", category: "d6", categoryName: "가정생활" },
  { code: "d620", description: "물품획득과 서비스 받기", category: "d6", categoryName: "가정생활" },
  { code: "d629", description: "기타 명시된 및 상세불명의 생필품 획득", category: "d6", categoryName: "가정생활" },
  { code: "d630", description: "식사 준비", category: "d6", categoryName: "가정생활" },
  { code: "d640", description: "가사 돌보기", category: "d6", categoryName: "가정생활" },
  { code: "d649", description: "기타 명시된 및 상세불명의 가사", category: "d6", categoryName: "가정생활" },
  { code: "d650", description: "가사도구 관리", category: "d6", categoryName: "가정생활" },
  { code: "d660", description: "다른 사람 돕기", category: "d6", categoryName: "가정생활" },
  { code: "d669", description: "기타 명시된 및 상세불명의 가사도구 관리와 다른 사람 돕기", category: "d6", categoryName: "가정생활" },
  { code: "d698", description: "기타 명시된 가정생활", category: "d6", categoryName: "가정생활" },
  { code: "d699", description: "상세불명의 가정생활", category: "d6", categoryName: "가정생활" },

  // D7 대인상호작용과 관계
  { code: "d710", description: "기본적 대인상호작용", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d720", description: "복잡한 대인상호작용", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d729", description: "기타 명시된 및 상세불명의 일반적 대인상호작용", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d730", description: "낯선 사람과의 관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d740", description: "공식적 관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d750", description: "비공식적 사회적 관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d760", description: "가족관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d770", description: "애정관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d779", description: "기타 명시된 및 상세불명의 특정 대인관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d798", description: "기타 명시된 대인상호작용과 관계", category: "d7", categoryName: "대인상호작용과 관계" },
  { code: "d799", description: "상세불명의 대인상호작용과 관계", category: "d7", categoryName: "대인상호작용과 관계" },

  // D8 주요생활영역
  { code: "d810", description: "비공식적 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d815", description: "유치원 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d820", description: "학교 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d825", description: "직업 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d830", description: "고등 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d835", description: "교육관련 활동", category: "d8", categoryName: "주요생활영역" },
  { code: "d839", description: "기타 명시된 및 상세불명의 교육", category: "d8", categoryName: "주요생활영역" },
  { code: "d840", description: "견습연수(취업준비)", category: "d8", categoryName: "주요생활영역" },
  { code: "d845", description: "구직·근속·퇴직", category: "d8", categoryName: "주요생활영역" },
  { code: "d850", description: "유급 고용", category: "d8", categoryName: "주요생활영역" },
  { code: "d855", description: "무급 고용", category: "d8", categoryName: "주요생활영역" },
  { code: "d859", description: "기타 명시된 및 상세불명의 일과 고용", category: "d8", categoryName: "주요생활영역" },
  { code: "d860", description: "기본적 경제적 거래", category: "d8", categoryName: "주요생활영역" },
  { code: "d865", description: "복잡한 경제적 거래", category: "d8", categoryName: "주요생활영역" },
  { code: "d870", description: "경제적 자립", category: "d8", categoryName: "주요생활영역" },
  { code: "d879", description: "기타 명시된 및 상세불명의 경제생활", category: "d8", categoryName: "주요생활영역" },
  { code: "d898", description: "기타 명시된 주요생활영역", category: "d8", categoryName: "주요생활영역" },
  { code: "d899", description: "상세불명의 주요생활영역", category: "d8", categoryName: "주요생활영역" },

  // D9 지역사회생활, 사회생활 및 시민으로서의 생활
  { code: "d910", description: "지역사회생활", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d920", description: "레크리에이션과 여가", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d930", description: "종교활동과 영적활동", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d940", description: "인권", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d950", description: "정치생활과 시민권 행사", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d998", description: "기타 명시된 지역사회생활, 사회생활 및 시민으로서의 생활", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
  { code: "d999", description: "상세불명의 지역사회생활, 사회생활 및 시민으로서의 생활", category: "d9", categoryName: "지역사회생활, 사회생활 및 시민으로서의 생활" },
]

export const getIcfActivityByCode = (code: string): IcfActivity | undefined => {
  return icfActivities.find(activity => activity.code === code)
}

export const getIcfActivitiesByCategory = (category: IcfActivity["category"]): IcfActivity[] => {
  return icfActivities.filter(activity => activity.category === category)
}

export const getIcfActivityCategories = (): Array<{ value: string; label: string }> => {
  return [
    { value: "all", label: "전체" },
    { value: "d1", label: "D1 학습과 지식의 적용" },
    { value: "d2", label: "D2 일반적 과제와 요구" },
    { value: "d3", label: "D3 의사소통" },
    { value: "d4", label: "D4 움직임" },
    { value: "d5", label: "D5 자기관리" },
    { value: "d6", label: "D6 가정생활" },
    { value: "d7", label: "D7 대인상호작용과 관계" },
    { value: "d8", label: "D8 주요생활영역" },
    { value: "d9", label: "D9 지역사회생활, 사회생활 및 시민으로서의 생활" },
  ]
}

