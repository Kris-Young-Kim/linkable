# ISO 9999:2022 매핑 참조 가이드

**기준 문서**: ISO 9999:2022 (7th Edition)  
**작성일**: 2025.11.25

## ISO 9999:2022 구조

ISO 9999:2022는 3단계 계층 구조를 사용합니다:
- **Class (클래스)**: 2자리 숫자 (예: 12, 15, 18)
- **Subclass (서브클래스)**: 4자리 숫자 (예: 1202, 1509, 1830)
- **Division (세분류)**: 6자리 숫자 (예: 120201, 150901)

## 주요 클래스 목록

### 04 - Assistive products for measuring, stimulating or training physiological and psychological functions
생리적/심리적 기능 측정, 자극, 훈련용 보조기기

### 06 - Orthoses and prostheses
보조기 및 의지

### 09 - Assistive products for self-care activities and participation in self-care
자가관리 활동 및 참여용 보조기기

### 12 - Assistive products for activities and participation relating to personal mobility and transportation
개인 이동 및 교통 관련 활동 및 참여용 보조기기
- **1202**: Assistive products for walking, not manipulated by the arms
- **1203**: Assistive products for walking, manipulated by one arm
- **1206**: Assistive products for walking, manipulated by both arms
- **1207**: Accessories for assistive products for walking
- **1208**: Guide canes and symbol canes for orientation
- **1222**: Manual wheelchairs
- **1223**: Powered wheelchairs
- **1231**: Assistive products for changing body position
- **1236**: Assistive products for lifting persons

### 15 - Assistive products for domestic activities and participation in domestic life
가정 활동 및 참여용 보조기기
- **1503**: Assistive products for preparing food and drink
- **1506**: Assistive products for dishwashing
- **1509**: Assistive products for eating and drinking
- **1512**: Assistive products for housecleaning
- **1515**: Assistive products for making and maintaining textiles for domestic use
- **1518**: Assistive products for gardening and lawn care for domestic use

### 18 - Furnishings, fixtures and other assistive products for supporting activities in indoor and outdoor human-made environments
실내외 인공 환경에서 활동 지원용 가구, 고정물 및 기타 보조기기
- **1803**: Tables
- **1806**: Light fixtures
- **1809**: Sitting furniture
- **1812**: Beds and bed equipment
- **1815**: Assistive products for height adjustment of furniture
- **1818**: Supporting handrails and grab bars
- **1821**: Gate, door, window and curtain openers/closers
- **1824**: Construction elements in homes and other premises
- **1830**: Assistive products for vertical accessibility (경사로, 승강기 등)
- **1833**: Safety equipment for homes and other premises
- **1836**: Furniture for storage

### 22 - Assistive products for communication and information management
의사소통 및 정보 관리용 보조기기

### 24 - Assistive products for controlling, carrying, moving and handling objects and devices
물체 및 장치 제어, 운반, 이동, 취급용 보조기기

### 27 - Assistive products for controlling, adapting or measuring elements of physical environments
물리적 환경 요소 제어, 적응, 측정용 보조기기

### 28 - Assistive products for work activities and participation in employment
직업 활동 및 고용 참여용 보조기기

### 30 - Assistive products for recreation and leisure
여가 및 레크리에이션용 보조기기
- **3003**: Assistive products for play
- **3009**: Assistive products for sports

## ICF 코드 → ISO 9999:2022 매핑 규칙

### 매핑 원칙
1. **ICF d-code (활동)** → ISO 12, 15, 22, 24, 28, 30 클래스
2. **ICF e-code (환경요소)** → ISO 18, 27 클래스
3. **ICF b-code (신체기능)** → ISO 04, 06, 09 클래스

### 주요 매핑 예시

| ICF 코드 | ISO 9999:2022 | 설명 |
|---------|---------------|------|
| d450 (걷기) | 1202, 1203, 1206 | 보행 보조기기 |
| d450 + e120 (단차) | 1830 | 수직 접근성 보조기기 (경사로) |
| d550 (식사) | 1509 | 식사/음주 보조기기 |
| b765 (불수의적 움직임) + d550 | 1509 | 무게조절 식사 도구 |
| d410 (앉기) + d420 (서기) | 1231 | 체위 변경 보조기기 |
| d920 (여가) | 3003 | 여가 활동 보조기기 |
| e120 (건물 및 건축물) | 1830, 1818 | 수직 접근성, 손잡이 |

## 코드 형식

ISO 9999:2022 코드는 공백 없이 6자리 숫자로 표현하거나, 계층 구조를 나타내기 위해 공백을 사용할 수 있습니다:
- **Subclass 레벨**: `1202`, `1509`, `1830` (4자리)
- **Division 레벨**: `120201`, `150901`, `183001` (6자리)
- **표시 형식**: `12 02`, `15 09`, `18 30` (공백 포함, 가독성 향상)

## 참고사항

- ISO 9999:2022는 2016년 6판에서 2022년 7판으로 업데이트되었습니다
- 주요 변경사항: 클래스 05 삭제, 클래스 09, 12, 22 대폭 수정
- 이 문서는 WHO Family of International Classifications (WHO-FIC)의 관련 구성원입니다
- ICF와 밀접하게 연관되어 있어 ICF 코드를 ISO 코드로 매핑하는 것이 자연스럽습니다

