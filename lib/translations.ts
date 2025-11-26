export type Language = "ko" | "en" | "ja";

export const translations = {
  ko: {
    // Header
    "header.features": "주요 기능",
    "header.howItWorks": "이용 방법",
    "header.about": "소개",
    "header.startConsultation": "상담 시작하기",
    "header.continueConsultation": "상담 이어가기",
    "header.signIn": "로그인",
    "header.signUp": "회원가입",
    "header.homeAria": "LinkAble 홈으로 이동",
    "header.navAria": "주요 메뉴",

    // Hero Section
    "hero.title": "AI로 연결하는",
    "hero.titleHighlight": "가능성",
    "hero.subtitle":
      "ICF & ISO 표준 기반 맞춤형 보조기기 추천입니다.\n검증된 방법론으로 전문가 매칭을 경험하세요.",
    "hero.getStarted": "시작하기",
    "hero.learnMore": "자세히 보기",
    "hero.icfCertified": "ICF 인증",
    "hero.isoStandards": "ISO 표준",
    "hero.kippaValidated": "K-IPPA 검증",
    "hero.imageAlt": "편안한 공간에서 태블릿을 사용하는 시니어의 모습",

    // Features Section
    "features.title": "LinkAble을 선택하는 이유",
    "features.subtitle": "국제 표준 기반의 과학적 매칭",
    "features.aiAnalysis.title": "AI 생활 분석",
    "features.aiAnalysis.description":
      "ICF 프레임워크를 활용한 고도화된 AI가 일상생활의 필요를 분석하여 맞춤형 보조기기를 스마트하게 매칭합니다.",
    "features.personalSupport.title": "개인 맞춤 지원",
    "features.personalSupport.description":
      "고객님의 요구사항을 이해하고 독립적인 생활을 위한 최적의 솔루션을 안내하는 전담 코디네이터와 연결됩니다.",
    "features.provenResults.title": "K-IPPA 검증된 만족도",
    "features.provenResults.description":
      "K-IPPA 방법론으로 검증된 추천 시스템으로 일상 활동과 삶의 질 향상을 측정 가능하게 보장합니다.",

    // How It Works
    "howItWorks.title": "이용 방법",
    "howItWorks.subtitle": "3단계로 완성되는 맞춤 추천",
    "howItWorks.step1.title": "일상 대화",
    "howItWorks.step1.description":
      "링커와 편안한 대화를 통해 일상의 불편함과 필요를 공유하세요.",
    "howItWorks.step2.title": "스마트 분석",
    "howItWorks.step2.description":
      "AI가 ICF 기준으로 상황을 분석하고 가장 적합한 보조기기 옵션을 찾아냅니다.",
    "howItWorks.step3.title": "맞춤 추천",
    "howItWorks.step3.description":
      "검증된 제품과 전문가 매칭을 받아 일상에 적합한 솔루션을 선택하세요.",

    // CTA Section
    "cta.title": "더 나은 일상을 위한 첫 걸음",
    "cta.subtitle":
      "지금 바로 무료 상담을 시작하고 맞춤형 보조기기를 추천받으세요",
    "cta.button": "무료 상담 시작",
    "cta.scheduleCall": "전문가 통화 예약",
    "cta.freeConsultation": "무료 상담",
    "cta.noCard": "카드 정보 불필요",
    "cta.hipaa": "개인 정보 안전 보호",

    // Footer
    "footer.disclaimer.title": "서비스 이용 안내",
    "footer.disclaimer.content":
      "본 서비스는 보조기기 정보 제공 및 매칭을 위한 플랫폼으로, 전문 진단이나 처방을 제공하지 않습니다. AI 분석 결과는 공식 평가를 대신할 수 없으며, 건강 관련 결정은 반드시 해당 분야 전문가와 상의해 주세요.",
    "footer.description": "ICF & ISO 표준 기반 AI 보조기기 매칭",
    "footer.product": "제품",
    "footer.company": "회사",
    "footer.standards": "표준",
    "footer.aboutUs": "회사 소개",
    "footer.privacyPolicy": "개인정보 처리방침",
    "footer.termsOfService": "이용약관",
    "footer.icfFramework": "ICF 프레임워크",
    "footer.isoCompliant": "ISO 9999 준수",
    "footer.kippaValidated": "K-IPPA 검증",
    "footer.wcagCompliant": "WCAG 2.1 AA",
    "footer.copyright": "© 2025 LinkAble. 모든 권리를 보유하고 있습니다.",

    // Chat Interface
    "chat.title": "링커",
    "chat.subtitle": "LinkAble 코디네이터",
    "chat.disclaimer":
      "본 서비스는 보조기기 정보를 제공하며 전문가 조언을 대체하지 않습니다.",
    "chat.initialMessage":
      "안녕하세요! 저는 링커, LinkAble 코디네이터입니다. 일상생활에서 겪고 계신 어려움에 대해 이야기해주세요. 고객님께 맞는 솔루션을 찾아드리겠습니다.",
    "chat.placeholder": "오늘은 어떤 어려움이 있으신가요?",
    "chat.sendMessage": "메시지 보내기",
    "chat.startVoiceRecording": "음성 녹음 시작",
    "chat.stopVoiceRecording": "음성 녹음 중지",
    "chat.attachPhoto": "환경 사진 첨부",
    "chat.sttNotSupported": "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.",
    "chat.sttError": "음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요.",
    "chat.sttNoSpeech": "음성이 감지되지 않았습니다. 다시 시도해 주세요.",
    "chat.sttNotAllowed": "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해 주세요.",
    "chat.removeImage": "이미지 제거",
    "chat.imageInvalidType": "이미지 파일만 업로드할 수 있습니다.",
    "chat.imageTooLarge": "이미지 크기는 5MB 이하여야 합니다.",
    "chat.imageConversionError": "이미지 변환 중 오류가 발생했습니다. 다시 시도해 주세요.",
    "chat.typing": "코디네이터가 입력 중입니다",
    "chat.yourMessage": "내 메시지",
    "chat.coordinatorMessage": "링커의 메시지",
    "chat.keyboardShortcuts":
      "Enter로 전송 • Shift+Enter로 줄바꿈 • 음성 입력 가능",
    "chat.backToHome": "홈으로 돌아가기",
    "chat.loginRequiredTitle": "로그인이 필요합니다",
    "chat.loginRequiredDescription":
      "LinkAble 코디네이터와 대화를 이어가려면 계정으로 로그인해 주세요.",
    "chat.loginRequiredAction": "로그인하고 상담 시작",
    "chat.genericReply":
      "공유해 주셔서 감사합니다. 조금 더 구체적인 활동이나 불편했던 상황이 있다면 알려주세요.",
    "chat.errorResponse":
      "잠시 후 다시 시도해 주세요. 연결 상태가 불안정합니다.",
    "chat.followUpPrompt":
      "추가로 아래 질문에 답해 주시면 더 정확한 추천이 가능합니다.",
    "chat.viewRecommendations": "추천 보기",
    "chat.loadingRecommendations": "추천 생성 중...",
    "chat.recommendationsReady": "맞춤 추천이 준비되었습니다",
    "chat.viewMoreRecommendations": "더 많은 추천 보기",
    "chat.recommendationPreview": "추천 상품 미리보기",

    // ICF Visualization
    "icfVisualization.title": "ICF 분석 결과",
    "icfVisualization.subtitle": "AI 분석 스냅샷",
    "icfVisualization.description":
      "최근 상담에서 추출된 ICF 코드와 환경 요소를 요약한 내용입니다. 각 코드에 대응하는 ISO 보조기기 분류를 함께 확인할 수 있습니다.",
    "icfVisualization.autoGenerated": "자동 분석",
    "icfVisualization.confidenceLabel": "신뢰도",
    "icfVisualization.category.body": "신체 기능 (b)",
    "icfVisualization.category.activity": "활동 · 참여 (d)",
    "icfVisualization.category.environment": "환경 요소 (e)",
    "icfVisualization.codesCount": "코드 {count}개",
    "icfVisualization.isoHints": "관련 ISO 보조기기",
    "icfVisualization.unknownCode": "등록되지 않은 ICF 코드입니다.",

    // Disclaimer Modal
    "modal.disclaimer.title": "서비스 이용 약관 안내",
    "modal.disclaimer.description":
      "서비스를 이용하기 전에 다음 중요 정보를 읽어주세요.",
    "modal.disclaimer.heading": "서비스 이용 안내",
    "modal.disclaimer.content1":
      "본 서비스는 보조기기 정보 제공 및 매칭을 위한 플랫폼으로, 전문 진단이나 처방을 제공하지 않습니다.",
    "modal.disclaimer.content2":
      "AI 분석 결과는 공식 진단을 대신할 수 없으며, 건강상의 문제는 반드시 해당 분야 전문가와 상의하시기 바랍니다.",
    "modal.disclaimer.content3":
      "본 서비스는 일상생활 개선에 도움이 될 수 있는 보조기기를 찾는 것을 돕기 위해 설계되었으며, 모든 추천은 결정을 내리기 전에 적절한 전문가와 함께 검토해야 합니다.",
    "modal.disclaimer.notice":
      '아래 "이해하고 동의합니다" 버튼을 클릭하면 이 안내를 읽고 이해했음을 확인하는 것입니다.',
    "modal.disclaimer.accept": "이해하고 동의합니다",

    // Dashboard
    "dashboard.title": "K-IPPA 효과성 대시보드",
    "dashboard.subtitle": "보조기기 사용 전후 삶의 질 개선도를 확인하세요",
    "dashboard.improvement": "개선도",
    "dashboard.celebration": "축하합니다! 일상생활이 크게 개선되었습니다!",
    "dashboard.comparison": "사용 전후 비교",
    "dashboard.before": "사용 전",
    "dashboard.after": "사용 후",
    "dashboard.difficulty": "어려움 정도",
    "dashboard.feedback": "제품이 도움이 되셨나요?",
    "dashboard.submitReview": "리뷰 제출",
    "dashboard.veryDissatisfied": "매우 불만족",
    "dashboard.dissatisfied": "불만족",
    "dashboard.neutral": "보통",
    "dashboard.satisfied": "만족",
    "dashboard.verySatisfied": "매우 만족",

    // K-IPPA Form
    "ippa.title": "K-IPPA 효과성 평가",
    "ippa.description": "에 대한 사용 후 평가를 진행해 주세요.",
    "ippa.problemDescription": "해결하고자 했던 문제",
    "ippa.importance": "중요도",
    "ippa.importanceHelp": "이 문제가 일상생활에서 얼마나 중요한지 선택해 주세요. (1=낮음, 5=매우 높음)",
    "ippa.difficultyPre": "사용 전 난이도",
    "ippa.difficultyPreHelp": "보조기기를 사용하기 전 이 활동을 수행하는 것이 얼마나 어려웠는지 선택해 주세요. (1=쉬움, 5=매우 어려움)",
    "ippa.difficultyPost": "사용 후 난이도",
    "ippa.difficultyPostHelp": "보조기기를 사용한 후 이 활동을 수행하는 것이 얼마나 쉬워졌는지 선택해 주세요. (1=쉬움, 5=매우 어려움)",
    "ippa.feedbackComment": "추가 의견 (선택사항)",
    "ippa.feedbackCommentPlaceholder": "보조기기 사용 경험에 대한 자유로운 의견을 남겨주세요.",
    "ippa.feedbackCommentHelp": "의견을 남겨주시면 서비스 개선에 큰 도움이 됩니다.",
    "ippa.previewScore": "예상 효과성 점수",
    "ippa.improvementPreview": "약 {percentage}% 개선 예상",
    "ippa.noImprovementPreview": "개선이 없거나 악화되었습니다.",
    "ippa.submit": "평가 제출",
    "ippa.submitting": "제출 중...",
    "ippa.cancel": "취소",
    "ippa.submitSuccess": "평가가 제출되었습니다!",
    "ippa.submitSuccessMessage": "소중한 피드백 감사합니다. 평가 결과가 서비스 개선에 활용됩니다.",
    "ippa.effectivenessScore": "효과성 점수",
    "ippa.pointsEarned": "{points} 포인트 적립",
    "ippa.interpretation.excellent": "매우 우수한 개선",
    "ippa.interpretation.good": "좋은 개선",
    "ippa.interpretation.moderate": "중간 정도 개선",
    "ippa.interpretation.minimal": "최소한의 개선",
    "ippa.interpretation.none": "변화 없음",
    "ippa.interpretation.worse": "악화됨",

    // K-IPPA Consultation (상담 단계)
    "ippa.consultation.title": "문제 이해를 돕기 위한 간단한 질문",
    "ippa.consultation.description": "더 정확한 추천을 위해 몇 가지 정보를 알려주세요",
    "ippa.consultation.currentDifficulty": "현재 난이도",
    "ippa.consultation.importanceHelp": "이 문제가 일상생활에서 얼마나 중요한지 선택해주세요 (1=낮음, 5=매우 높음)",
    "ippa.consultation.difficultyHelp": "현재 이 활동을 수행하는 것이 얼마나 어려운지 선택해주세요 (1=쉬움, 5=매우 어려움)",
    "ippa.consultation.submit": "확인",
    "ippa.consultation.skip": "건너뛰기",

    // Onboarding / Role Selection
    "onboarding.title": "역할을 선택해주세요",
    "onboarding.subtitle": "LinkAble이 더 나은 서비스를 제공하기 위해 필요합니다",
    "onboarding.role.user.title": "사용자 (당사자)",
    "onboarding.role.user.description": "보조기기를 직접 사용하시는 분입니다",
    "onboarding.role.manager.title": "보호자 / 전문가",
    "onboarding.role.manager.description": "다른 사람을 대신하여 보조기기를 찾아주시는 분입니다",
    "onboarding.continue": "계속하기",
    "onboarding.selecting": "저장 중...",
    "onboarding.error": "역할 저장 중 오류가 발생했습니다. 다시 시도해주세요.",

    // Recommendations
    "recommendations.title": "추천 보조기기",
    "recommendations.subtitle": "고객님의 필요에 맞춰 선별된 제품들입니다",
    "recommendations.matchScore": "매칭도",
    "recommendations.funding": "지원금 가능",
    "recommendations.learnMore": "자세히 보기",
    "recommendations.priceLabel": "예상 가격",
    "recommendations.noPrice": "가격 정보 없음",
    "recommendations.buyNow": "구매하러 가기",
    "recommendations.noLink": "구매 링크 준비 중",
    "recommendations.tagline": "LinkAble • 맞춤형 추천",
    "recommendations.description":
      "최근 상담 분석과 ICF 통찰을 기반으로 선별된 추천 결과입니다.",
    "recommendations.emptyTitle": "아직 추천 데이터가 없습니다.",
    "recommendations.emptyDescription":
      "상담을 완료하면 맞춤형 보조기기 추천이 여기에 표시됩니다.",
    "recommendations.backToChat": "코디네이터 채팅으로 돌아가기",
    "recommendations.viewDashboard": "효과성 대시보드 보기",
    "recommendations.defaultCategory": "보조기기 솔루션",

    // Language Selector
    "language.select": "언어 선택",
    "language.korean": "한국어",
    "language.english": "English",
    "language.japanese": "日本語",

    // Dashboard additions
    "dashboard.tagline": "LinkAble 인사이트 센터",
    "dashboard.heroDescription":
      "상담 진행 현황과 추천 활용도를 한눈에 확인하세요.",
    "dashboard.actionChat": "AI 상담 이어가기",
    "dashboard.actionRecommendations": "추천 목록 보기",
    "dashboard.timelineTitle": "상담 타임라인",
    "dashboard.timelineDescription":
      "최근 상담 상태와 추천 진행 상황을 확인하세요.",
    "dashboard.timelineEmpty":
      "아직 상담 기록이 없습니다. 첫 상담을 시작하면 이곳에 타임라인이 표시됩니다.",
    "dashboard.nextStepsTitle": "다음 단계",
    "dashboard.nextStepsDescription":
      "추천 확인, 클릭률 추적, 평가 요청 등을 빠르게 진행하세요.",
    "dashboard.nextStepActive": "진행 중 상담",
    "dashboard.nextStepPending": "미클릭 추천",
    "dashboard.nextStepReview": "추천 확인",
    "dashboard.nextStepReviewDescription":
      "추천 페이지에서 클릭 현황을 확인하세요.",
    "dashboard.ippaSectionTitle": "K-IPPA 효과성 평가",
    "dashboard.ippaSectionDescription": "구매하신 보조기기 사용 후 평가를 진행해 주세요. 평가를 제출하시면 포인트를 적립해 드립니다.",
    "dashboard.startEvaluation": "평가 시작",
    "dashboard.unknownProduct": "알 수 없는 상품",
    "dashboard.noMatchReason": "추천 사유 없음",
    "dashboard.timelineSummary":
      "추천 {recommendationCount}건 · 클릭 대기 {pendingCount}건",
    "dashboard.updatedAt": "업데이트:",
    "dashboard.noUpdates": "최근 업데이트 없음",
    "dashboard.status.completed": "완료",
    "dashboard.status.inProgress": "진행 중",
    "dashboard.status.archived": "보관됨",
    "dashboard.status.unknown": "상태 미정",
    "dashboard.untitled": "무제 상담",
    "dashboard.pendingSessions": "{count}개 세션이 답변을 기다리고 있어요",
    "dashboard.pendingRecommendationsLabel": "클릭 대기 추천 {count}건",
    "dashboard.progressTitle": "나의 진행 리포트",
    "dashboard.progressSubtitle": "보조기기 사용 전후 삶의 변화를 확인하세요.",
    "dashboard.improvementCallout": "개선 점수",
    "dashboard.difficultyReductionLabel": "난이도 감소",
    "dashboard.comparisonDescription":
      "보조기기 사용 전후 난이도 변화를 비교합니다.",
    "dashboard.chartDifficultyLabel": "난이도 (1-5)",
    "dashboard.beforeDifficultyLabel": "사용 전: 높은 난이도",
    "dashboard.afterDifficultyLabel": "사용 후: 낮은 난이도",
    "dashboard.ratingQuestion": "제품이 얼마나 도움이 되었나요?",
    "dashboard.ratingHelpText":
      "작성해 주신 피드백은 추천 품질 개선에 사용됩니다.",
    "dashboard.ratingAriaPrefix": "별점",
    "dashboard.ratingAriaSuffix": "점 선택",
    "dashboard.rating.excellent": "🎉 훌륭해요! 도움이 되어 기쁩니다.",
    "dashboard.rating.great": "😊 좋네요! 계속 발전하겠습니다.",
    "dashboard.rating.good": "👍 감사합니다! 더 나아질게요.",
    "dashboard.rating.ok": "😐 의견 감사합니다.",
    "dashboard.rating.bad": "😔 더 노력하겠습니다.",
    "dashboard.ratingThanksTitle": "소중한 의견 감사합니다!",
    "dashboard.ratingThanksMessage":
      "{rating}점 평가가 서비스 개선에 큰 도움이 됩니다.",

    // Footer socials
    "footer.socialLinkedIn": "링크드인",
    "footer.socialTwitter": "트위터",
    "footer.socialContact": "문의하기",
  },
  en: {
    // Header
    "header.features": "Features",
    "header.howItWorks": "How It Works",
    "header.about": "About",
    "header.startConsultation": "Start Consultation",
    "header.continueConsultation": "Continue Consultation",
    "header.signIn": "Sign In",
    "header.signUp": "Sign Up",
    "header.homeAria": "Go to LinkAble home",
    "header.navAria": "Main navigation",

    // Hero Section
    "hero.title": "Connecting Possibilities through",
    "hero.titleHighlight": "AI",
    "hero.subtitle":
      "Personalized assistive technology recommendations based on ICF & ISO standards. Experience expert matching powered by proven methodologies.",
    "hero.getStarted": "Get Started",
    "hero.learnMore": "Learn More",
    "hero.icfCertified": "ICF Certified",
    "hero.isoStandards": "ISO Standards",
    "hero.kippaValidated": "K-IPPA Validated",
    "hero.imageAlt": "Elderly person using a tablet comfortably at home",

    // Features Section
    "features.title": "Why Choose LinkAble",
    "features.subtitle":
      "Evidence-based matching powered by international standards",
    "features.aiAnalysis.title": "AI Life Analysis",
    "features.aiAnalysis.description":
      "Advanced AI analyzes your daily life needs using ICF framework to provide smart matching of assistive technologies tailored to your unique lifestyle.",
    "features.personalSupport.title": "Personal Support",
    "features.personalSupport.description":
      "Connect with caring coordinators who understand your requirements and can guide you through finding the right solutions for independent living.",
    "features.provenResults.title": "Proven Satisfaction with K-IPPA",
    "features.provenResults.description":
      "Our recommendations are validated using K-IPPA methodology, ensuring measurable improvements in daily activities and quality of life.",

    // How It Works
    "howItWorks.title": "How It Works",
    "howItWorks.subtitle": "Get personalized recommendations in 3 simple steps",
    "howItWorks.step1.title": "Share Your Story",
    "howItWorks.step1.description":
      "Have a comfortable conversation with 링커 about your daily challenges and needs.",
    "howItWorks.step2.title": "Smart Analysis",
    "howItWorks.step2.description":
      "AI analyzes your situation using ICF standards to find the most suitable assistive technology options.",
    "howItWorks.step3.title": "Get Recommendations",
    "howItWorks.step3.description":
      "Receive validated product matches and expert guidance to choose solutions that fit your lifestyle.",

    // CTA Section
    "cta.title": "Start Your Journey to Better Living",
    "cta.subtitle":
      "Begin your free consultation today and discover assistive technologies matched to your needs",
    "cta.button": "Start Free Consultation",
    "cta.scheduleCall": "Schedule a Call",
    "cta.freeConsultation": "Free consultation",
    "cta.noCard": "No credit card needed",
    "cta.hipaa": "HIPAA compliant",

    // Footer
    "footer.disclaimer.title": "Service Usage Guidelines",
    "footer.disclaimer.content":
      "This service is a platform for providing assistive technology information and matching services, and does not provide expert diagnosis or prescriptions. AI analysis results cannot replace formal evaluations, and for any health-related concerns, you must consult with qualified specialists.",
    "footer.description":
      "AI-powered assistive technology matching based on ICF & ISO standards",
    "footer.product": "Product",
    "footer.company": "Company",
    "footer.standards": "Standards",
    "footer.aboutUs": "About Us",
    "footer.privacyPolicy": "Privacy Policy",
    "footer.termsOfService": "Terms of Service",
    "footer.icfFramework": "ICF Framework",
    "footer.isoCompliant": "ISO 9999 Compliant",
    "footer.kippaValidated": "K-IPPA Validated",
    "footer.wcagCompliant": "WCAG 2.1 AA",
    "footer.copyright": "© 2025 LinkAble. All rights reserved.",

    // Chat Interface
    "chat.title": "링커",
    "chat.subtitle": "LinkAble Coordinator",
    "chat.disclaimer":
      "This service provides assistive technology information and does not replace advice from qualified specialists.",
    "chat.initialMessage":
      "Hello! I'm 링커, your LinkAble Coordinator. I'd love to learn about your daily life and any difficulties you're facing. Please share what's on your mind, and I'll help you find solutions that work for you.",
    "chat.placeholder": "What difficulties are you facing today?",
    "chat.sendMessage": "Send Message",
    "chat.startVoiceRecording": "Start Voice Recording",
    "chat.stopVoiceRecording": "Stop Voice Recording",
    "chat.attachPhoto": "Attach photo of your environment",
    "chat.sttNotSupported": "This browser does not support speech recognition. Please use Chrome or Edge.",
    "chat.sttError": "An error occurred during speech recognition. Please try again.",
    "chat.sttNoSpeech": "No speech detected. Please try again.",
    "chat.sttNotAllowed": "Microphone permission is required. Please allow microphone access in your browser settings.",
    "chat.removeImage": "Remove Image",
    "chat.imageInvalidType": "Only image files can be uploaded.",
    "chat.imageTooLarge": "Image size must be 5MB or less.",
    "chat.imageConversionError": "An error occurred while converting the image. Please try again.",
    "chat.typing": "Coordinator is typing",
    "chat.yourMessage": "Your message",
    "chat.coordinatorMessage": "링커's message",
    "chat.keyboardShortcuts":
      "Press Enter to send • Shift+Enter for new line • Voice input available",
    "chat.backToHome": "Go back to home",
    "chat.loginRequiredTitle": "Sign in required",
    "chat.loginRequiredDescription":
      "Please sign in to continue chatting with your LinkAble coordinator.",
    "chat.loginRequiredAction": "Sign in and continue",
    "chat.genericReply":
      "Thank you for sharing. Could you tell me a bit more about the specific activity or tool that feels challenging?",
    "chat.errorResponse":
      "Sorry, something went wrong. Please try again in a moment.",
    "chat.followUpPrompt":
      "Answering these follow-up questions helps me narrow down the best solution:",
    "chat.viewRecommendations": "View Recommendations",
    "chat.loadingRecommendations": "Loading recommendations...",
    "chat.recommendationsReady": "Your personalized recommendations are ready",
    "chat.viewMoreRecommendations": "View More Recommendations",
    "chat.recommendationPreview": "Recommended Products Preview",

    // ICF Visualization
    "icfVisualization.title": "ICF Analysis Summary",
    "icfVisualization.subtitle": "AI insights",
    "icfVisualization.description":
      "These are the ICF codes identified during the latest consultation, along with potential ISO assistive technology references.",
    "icfVisualization.autoGenerated": "Auto generated",
    "icfVisualization.confidenceLabel": "Confidence",
    "icfVisualization.category.body": "Body functions (b)",
    "icfVisualization.category.activity": "Activity & participation (d)",
    "icfVisualization.category.environment": "Environmental factors (e)",
    "icfVisualization.codesCount": "{count} codes",
    "icfVisualization.isoHints": "Related ISO categories",
    "icfVisualization.unknownCode": "Unregistered ICF code",

    // Disclaimer Modal
    "modal.disclaimer.title": "Service Terms Notice",
    "modal.disclaimer.description":
      "Please read the following important information before using our service.",
    "modal.disclaimer.heading": "Service Usage Guidelines",
    "modal.disclaimer.content1":
      "This service is a platform for providing assistive technology information and matching services, and does not provide expert diagnosis or prescriptions.",
    "modal.disclaimer.content2":
      "AI analysis results cannot replace formal evaluations, and for any health-related concerns, you must consult with qualified specialists.",
    "modal.disclaimer.content3":
      "Our service is designed to help you find assistive technologies that may improve your daily life, but all recommendations should be reviewed with appropriate specialists before making decisions.",
    "modal.disclaimer.notice":
      'By clicking "I Understand and Agree" below, you acknowledge that you have read and understood these guidelines.',
    "modal.disclaimer.accept": "I Understand and Agree",

    // Dashboard
    "dashboard.title": "K-IPPA Effectiveness Dashboard",
    "dashboard.subtitle":
      "Track your quality of life improvements before and after using assistive technology",
    "dashboard.improvement": "Improvement",
    "dashboard.celebration":
      "Congratulations! Your daily life has significantly improved!",
    "dashboard.comparison": "Before & After Comparison",
    "dashboard.before": "Before",
    "dashboard.after": "After",
    "dashboard.difficulty": "Difficulty Level",
    "dashboard.feedback": "Is this product helpful?",
    "dashboard.submitReview": "Submit Review",
    "dashboard.veryDissatisfied": "Very Dissatisfied",
    "dashboard.dissatisfied": "Dissatisfied",
    "dashboard.neutral": "Neutral",
    "dashboard.satisfied": "Satisfied",
    "dashboard.verySatisfied": "Very Satisfied",

    // K-IPPA Consultation (상담 단계)
    "ippa.consultation.title": "Quick Questions to Better Understand Your Needs",
    "ippa.consultation.description": "Please share a few details to help us provide more accurate recommendations",
    "ippa.consultation.currentDifficulty": "Current Difficulty",
    "ippa.consultation.importanceHelp": "How important is this problem in your daily life? (1=Low, 5=Very High)",
    "ippa.consultation.difficultyHelp": "How difficult is it to perform this activity currently? (1=Easy, 5=Very Difficult)",
    "ippa.consultation.submit": "Confirm",
    "ippa.consultation.skip": "Skip",

    // Onboarding / Role Selection
    "onboarding.title": "Please select your role",
    "onboarding.subtitle": "This helps LinkAble provide better service",
    "onboarding.role.user.title": "User (Self)",
    "onboarding.role.user.description": "You are the person who will use the assistive technology",
    "onboarding.role.manager.title": "Caregiver / Professional",
    "onboarding.role.manager.description": "You are helping someone else find assistive technology",
    "onboarding.continue": "Continue",
    "onboarding.selecting": "Saving...",
    "onboarding.error": "An error occurred while saving your role. Please try again.",

    // Recommendations
    "recommendations.title": "Recommended Products",
    "recommendations.subtitle":
      "Carefully selected products matched to your needs",
    "recommendations.matchScore": "Match Score",
    "recommendations.funding": "Funding Available",
    "recommendations.learnMore": "Learn More",
    "recommendations.priceLabel": "Estimated Price",
    "recommendations.noPrice": "Price unavailable",
    "recommendations.buyNow": "Shop Now",
    "recommendations.noLink": "Link unavailable",
    "recommendations.tagline": "LinkAble • Personalized Recommendations",
    "recommendations.description":
      "These picks are powered by your recent consultation insights and ICF analysis.",
    "recommendations.emptyTitle": "No recommendations yet",
    "recommendations.emptyDescription":
      "Complete a consultation to see personalized assistive technology suggestions here.",
    "recommendations.backToChat": "Return to Coordinator Chat",
    "recommendations.viewDashboard": "View Effectiveness Dashboard",
    "recommendations.defaultCategory": "Assistive Solution",

    // Language Selector
    "language.select": "Select Language",
    "language.korean": "한국어",
    "language.english": "English",
    "language.japanese": "日本語",

    // Dashboard additions
    "dashboard.tagline": "LinkAble Insight Center",
    "dashboard.heroDescription":
      "Review your consultation progress and recommendation activity at a glance.",
    "dashboard.actionChat": "Continue AI Consultation",
    "dashboard.actionRecommendations": "Open Recommendations",
    "dashboard.timelineTitle": "Consultation Timeline",
    "dashboard.timelineDescription":
      "Track recent session statuses and recommendation progress.",
    "dashboard.timelineEmpty":
      "No consultation records yet. Start your first session to see activity here.",
    "dashboard.nextStepsTitle": "Next Steps",
    "dashboard.nextStepsDescription":
      "Fast-track your follow-ups: review recommendations, clicks, and evaluations.",
    "dashboard.ippaSectionTitle": "K-IPPA Effectiveness Evaluation",
    "dashboard.ippaSectionDescription": "Please complete the post-use evaluation for purchased assistive devices. You will earn points for submitting evaluations.",
    "dashboard.startEvaluation": "Start Evaluation",
    "dashboard.unknownProduct": "Unknown Product",
    "dashboard.noMatchReason": "No match reason",
    "dashboard.nextStepActive": "Active Consultations",
    "dashboard.nextStepPending": "Pending Clicks",
    "dashboard.nextStepReview": "Review Recommendations",
    "dashboard.nextStepReviewDescription":
      "Check your recommendation list to confirm clicks.",
    "dashboard.timelineSummary":
      "Recommendations {recommendationCount} • Pending clicks {pendingCount}",
    "dashboard.updatedAt": "Updated:",
    "dashboard.noUpdates": "No recent updates",
    "dashboard.status.completed": "Completed",
    "dashboard.status.inProgress": "In Progress",
    "dashboard.status.archived": "Archived",
    "dashboard.status.unknown": "Unknown",
    "dashboard.untitled": "Untitled consultation",
    "dashboard.pendingSessions": "{count} sessions are awaiting replies.",
    "dashboard.pendingRecommendationsLabel":
      "{count} recommendations pending clicks",
    "dashboard.progressTitle": "Your Progress Report",
    "dashboard.progressSubtitle":
      "See how assistive technology improved your daily life",
    "dashboard.improvementCallout": "Improvement Score",
    "dashboard.difficultyReductionLabel": "Difficulty Reduction",
    "dashboard.comparisonDescription":
      "Compare your difficulty level before and after using assistive tech.",
    "dashboard.chartDifficultyLabel": "Difficulty Level (1-5)",
    "dashboard.beforeDifficultyLabel": "Before: High Difficulty",
    "dashboard.afterDifficultyLabel": "After: Low Difficulty",
    "dashboard.ratingQuestion": "How helpful was this product?",
    "dashboard.ratingHelpText":
      "Your feedback helps us refine every recommendation.",
    "dashboard.ratingAriaPrefix": "Rate",
    "dashboard.ratingAriaSuffix": "out of 5 stars",
    "dashboard.rating.excellent": "🎉 Excellent! We're so glad it helped!",
    "dashboard.rating.great": "😊 Great! Thanks for sharing.",
    "dashboard.rating.good": "👍 Good! We'll keep improving.",
    "dashboard.rating.ok": "😐 Thank you for the feedback.",
    "dashboard.rating.bad": "😔 We’ll work harder.",
    "dashboard.ratingThanksTitle": "Thank you for your feedback!",
    "dashboard.ratingThanksMessage":
      "Your {rating}-star rating helps us improve our services.",

    // Footer socials
    "footer.socialLinkedIn": "LinkedIn",
    "footer.socialTwitter": "Twitter",
    "footer.socialContact": "Contact",
  },
  ja: {
    // Header
    "header.features": "主な機能",
    "header.howItWorks": "利用方法",
    "header.about": "紹介",
    "header.startConsultation": "相談開始",
    "header.continueConsultation": "相談を続ける",
    "header.signIn": "ログイン",
    "header.signUp": "新規登録",
    "header.homeAria": "LinkAbleホームに移動",
    "header.navAria": "メインメニュー",

    // Hero Section
    "hero.title": "AIでつなぐ",
    "hero.titleHighlight": "可能性",
    "hero.subtitle":
      "ICFとISO基準に基づいたパーソナライズされた支援機器の推奨。実証された方法論による専門家マッチングを体験してください。",
    "hero.getStarted": "始める",
    "hero.learnMore": "詳しく見る",
    "hero.icfCertified": "ICF認定",
    "hero.isoStandards": "ISO基準",
    "hero.kippaValidated": "K-IPPA検証済み",
    "hero.imageAlt": "落ち着いた空間でタブレットを使うシニアの姿",

    // Features Section
    "features.title": "LinkAbleを選ぶ理由",
    "features.subtitle": "国際基準に基づいた科学的マッチング",
    "features.aiAnalysis.title": "AI生活分析",
    "features.aiAnalysis.description":
      "ICFフレームワークを活用した高度なAIが日常生活のニーズを分析し、お客様のライフスタイルに合わせた支援技術をスマートにマッチングします。",
    "features.personalSupport.title": "個別サポート",
    "features.personalSupport.description":
      "お客様の要件を理解し、自立した生活のための最適なソリューションをご案内する専任コーディネーターとつながります。",
    "features.provenResults.title": "K-IPPAで検証された満足度",
    "features.provenResults.description":
      "K-IPPA方法論で検証された推奨システムにより、日常活動と生活の質の向上を測定可能に保証します。",

    // How It Works
    "howItWorks.title": "利用方法",
    "howItWorks.subtitle": "3つのステップで完成するカスタム推奨",
    "howItWorks.step1.title": "日常の会話",
    "howItWorks.step1.description":
      "링커と快適な会話を通じて、日常の不便さとニーズを共有してください。",
    "howItWorks.step2.title": "スマート分析",
    "howItWorks.step2.description":
      "AIがICF基準で状況を分析し、最適な支援機器のオプションを見つけます。",
    "howItWorks.step3.title": "カスタム推奨",
    "howItWorks.step3.description":
      "検証された製品と専門家のマッチングを受け、日常に適したソリューションを選択してください。",

    // CTA Section
    "cta.title": "より良い日常への第一歩",
    "cta.subtitle":
      "今すぐ無料相談を開始し、カスタマイズされた支援機器の推奨を受けてください",
    "cta.button": "無料相談開始",
    "cta.scheduleCall": "専門家に相談する",
    "cta.freeConsultation": "無料相談",
    "cta.noCard": "カード情報不要",
    "cta.hipaa": "個人情報を安全に保護",

    // Footer
    "footer.disclaimer.title": "サービス利用案内",
    "footer.disclaimer.content":
      "本サービスは支援機器情報提供およびマッチングのためのプラットフォームであり、専門的な診断や処方を提供するものではありません。AIの分析結果は正式な評価に代わるものではなく、健康上の判断は必ず関連分野の専門家にご相談ください。",
    "footer.description": "ICFとISO基準に基づくAI支援機器マッチング",
    "footer.product": "製品",
    "footer.company": "会社",
    "footer.standards": "基準",
    "footer.aboutUs": "会社概要",
    "footer.privacyPolicy": "プライバシーポリシー",
    "footer.termsOfService": "利用規約",
    "footer.icfFramework": "ICFフレームワーク",
    "footer.isoCompliant": "ISO 9999準拠",
    "footer.kippaValidated": "K-IPPA検証済み",
    "footer.wcagCompliant": "WCAG 2.1 AA",
    "footer.copyright": "© 2025 LinkAble. All rights reserved.",

    // Chat Interface
    "chat.title": "링커",
    "chat.subtitle": "LinkAbleコーディネーター",
    "chat.disclaimer":
      "本サービスは支援機器情報を提供し、専門家による助言の代替にはなりません。",
    "chat.initialMessage":
      "こんにちは！私は링커、LinkAbleコーディネーターです。日常生活で抱えている困難についてお聞かせください。お客様に合ったソリューションを見つけるお手伝いをいたします。",
    "chat.placeholder": "今日はどのような困難がありますか？",
    "chat.sendMessage": "メッセージを送信",
    "chat.startVoiceRecording": "音声録音開始",
    "chat.stopVoiceRecording": "音声録音停止",
    "chat.attachPhoto": "環境写真を添付",
    "chat.removeImage": "画像を削除",
    "chat.imageInvalidType": "画像ファイルのみアップロードできます。",
    "chat.imageTooLarge": "画像サイズは5MB以下である必要があります。",
    "chat.imageConversionError": "画像変換中にエラーが発生しました。もう一度お試しください。",
    "chat.typing": "コーディネーターが入力中",
    "chat.yourMessage": "自分のメッセージ",
    "chat.coordinatorMessage": "링커のメッセージ",
    "chat.keyboardShortcuts": "Enterで送信 • Shift+Enterで改行 • 音声入力可能",
    "chat.backToHome": "ホームに戻る",
    "chat.loginRequiredTitle": "ログインが必要です",
    "chat.loginRequiredDescription":
      "LinkAbleコーディネーターとの対話を続けるには、アカウントにログインしてください。",
    "chat.loginRequiredAction": "ログインして相談を開始",
    "chat.genericReply":
      "共有ありがとうございます。もう少し具体的な活動や困っている場面があれば教えてください。",
    "chat.errorResponse":
      "申し訳ありません。しばらくしてからもう一度お試しください。",
    "chat.followUpPrompt":
      "以下の質問に答えていただくと、より正確な提案が可能になります。",
    "chat.viewRecommendations": "推奨を見る",
    "chat.loadingRecommendations": "推奨を生成中...",
    "chat.recommendationsReady": "パーソナライズされた推奨が準備できました",
    "chat.viewMoreRecommendations": "もっと見る",
    "chat.recommendationPreview": "推奨製品プレビュー",

    // ICF Visualization
    "icfVisualization.title": "ICF分析サマリー",
    "icfVisualization.subtitle": "AIインサイト",
    "icfVisualization.description":
      "最新の相談で抽出されたICFコードと、対応するISO支援機器カテゴリの候補を表示します。",
    "icfVisualization.autoGenerated": "自動分析",
    "icfVisualization.confidenceLabel": "信頼度",
    "icfVisualization.category.body": "心身機能 (b)",
    "icfVisualization.category.activity": "活動・参加 (d)",
    "icfVisualization.category.environment": "環境因子 (e)",
    "icfVisualization.codesCount": "コード {count}件",
    "icfVisualization.isoHints": "関連するISO分類",
    "icfVisualization.unknownCode": "登録されていないICFコードです。",

    // Disclaimer Modal
    "modal.disclaimer.title": "サービス利用規約のお知らせ",
    "modal.disclaimer.description":
      "サービスをご利用になる前に、以下の重要な情報をお読みください。",
    "modal.disclaimer.heading": "サービス利用案内",
    "modal.disclaimer.content1":
      "本サービスは支援機器情報提供およびマッチングのためのプラットフォームであり、専門的な診断や処方を提供するものではありません。",
    "modal.disclaimer.content2":
      "AIの分析結果は正式な評価に代わるものではなく、健康に関する判断は必ず関連分野の専門家にご相談ください。",
    "modal.disclaimer.content3":
      "本サービスは日常生活の改善に役立つ支援機器を見つけるために設計されており、すべての推奨事項は決定を下す前に適切な専門家と共に確認する必要があります。",
    "modal.disclaimer.notice":
      "下の「理解して同意します」ボタンをクリックすることで、これらのガイドラインを読んで理解したことを確認します。",
    "modal.disclaimer.accept": "理解して同意します",

    // Dashboard
    "dashboard.title": "K-IPPA効果性ダッシュボード",
    "dashboard.subtitle":
      "支援機器使用前後の生活の質の改善度を確認してください",
    "dashboard.improvement": "改善度",
    "dashboard.celebration":
      "おめでとうございます！日常生活が大きく改善されました！",
    "dashboard.comparison": "使用前後の比較",
    "dashboard.before": "使用前",
    "dashboard.after": "使用後",
    "dashboard.difficulty": "困難度",
    "dashboard.feedback": "製品は役に立ちましたか？",
    "dashboard.submitReview": "レビュー提出",
    "dashboard.veryDissatisfied": "非常に不満",
    "dashboard.dissatisfied": "不満",
    "dashboard.neutral": "普通",
    "dashboard.satisfied": "満足",
    "dashboard.verySatisfied": "非常に満足",

    // K-IPPA Form
    "ippa.title": "K-IPPA効果性評価",
    "ippa.description": "の使用後評価を完了してください。",
    "ippa.problemDescription": "解決したい問題",
    "ippa.importance": "重要度",
    "ippa.importanceHelp": "この問題が日常生活でどれほど重要か選択してください。（1=低い、5=非常に高い）",
    "ippa.difficultyPre": "使用前の難易度",
    "ippa.difficultyPreHelp": "支援機器を使用する前にこの活動を実行することがどれほど困難だったか選択してください。（1=簡単、5=非常に困難）",
    "ippa.difficultyPost": "使用後の難易度",
    "ippa.difficultyPostHelp": "支援機器を使用した後、この活動を実行することがどれほど簡単になったか選択してください。（1=簡単、5=非常に困難）",
    "ippa.feedbackComment": "追加コメント（任意）",
    "ippa.feedbackCommentPlaceholder": "この支援機器の使用経験について自由にご意見をお聞かせください。",
    "ippa.feedbackCommentHelp": "ご意見をいただくと、サービス改善に大いに役立ちます。",
    "ippa.previewScore": "予想効果性スコア",
    "ippa.improvementPreview": "約{percentage}%の改善が予想されます",
    "ippa.noImprovementPreview": "改善がないか、悪化しています。",
    "ippa.submit": "評価を提出",
    "ippa.submitting": "提出中...",
    "ippa.cancel": "キャンセル",
    "ippa.submitSuccess": "評価が提出されました！",
    "ippa.submitSuccessMessage": "貴重なフィードバックありがとうございます。評価結果はサービス改善に活用されます。",
    "ippa.effectivenessScore": "効果性スコア",
    "ippa.pointsEarned": "{points}ポイント獲得",
    "ippa.interpretation.excellent": "非常に優れた改善",
    "ippa.interpretation.good": "良い改善",
    "ippa.interpretation.moderate": "中程度の改善",
    "ippa.interpretation.minimal": "最小限の改善",
    "ippa.interpretation.none": "変化なし",
    "ippa.interpretation.worse": "悪化",

    // K-IPPA Consultation (상담 단계)
    "ippa.consultation.title": "ニーズをよりよく理解するための簡単な質問",
    "ippa.consultation.description": "より正確な推奨を提供するために、いくつかの情報を教えてください",
    "ippa.consultation.currentDifficulty": "現在の難易度",
    "ippa.consultation.importanceHelp": "この問題が日常生活でどれほど重要か選択してください（1=低い、5=非常に高い）",
    "ippa.consultation.difficultyHelp": "現在この活動を実行することがどれほど困難か選択してください（1=簡単、5=非常に困難）",
    "ippa.consultation.submit": "確認",
    "ippa.consultation.skip": "スキップ",

    // Onboarding / Role Selection
    "onboarding.title": "役割を選択してください",
    "onboarding.subtitle": "LinkAbleがより良いサービスを提供するために必要です",
    "onboarding.role.user.title": "ユーザー（本人）",
    "onboarding.role.user.description": "支援技術を直接使用される方です",
    "onboarding.role.manager.title": "保護者 / 専門家",
    "onboarding.role.manager.description": "他の方のために支援技術を探されている方です",
    "onboarding.continue": "続ける",
    "onboarding.selecting": "保存中...",
    "onboarding.error": "役割の保存中にエラーが発生しました。もう一度お試しください。",

    // Recommendations
    "recommendations.title": "推奨支援機器",
    "recommendations.subtitle": "お客様のニーズに合わせて厳選された製品",
    "recommendations.matchScore": "マッチング度",
    "recommendations.funding": "助成金利用可能",
    "recommendations.learnMore": "詳しく見る",
    "recommendations.priceLabel": "推定価格",
    "recommendations.noPrice": "価格情報なし",
    "recommendations.buyNow": "購入ページへ",
    "recommendations.noLink": "リンク準備中",
    "recommendations.tagline": "LinkAble • パーソナライズ推奨",
    "recommendations.description":
      "最新の相談結果とICF分析に基づいた推奨リストです。",
    "recommendations.emptyTitle": "まだ推奨データがありません。",
    "recommendations.emptyDescription":
      "相談を完了すると、ここにカスタム支援機器の推奨が表示されます。",
    "recommendations.backToChat": "コーディネーターに戻る",
    "recommendations.viewDashboard": "効果性ダッシュボードを見る",
    "recommendations.defaultCategory": "支援機器ソリューション",

    // Language Selector
    "language.select": "言語選択",
    "language.korean": "한국어",
    "language.english": "English",
    "language.japanese": "日本語",

    // Dashboard additions
    "dashboard.tagline": "LinkAble インサイトセンター",
    "dashboard.heroDescription":
      "相談の進行状況と推奨の活用度をひと目で把握できます。",
    "dashboard.actionChat": "AI相談を続ける",
    "dashboard.actionRecommendations": "推奨を見る",
    "dashboard.timelineTitle": "相談タイムライン",
    "dashboard.timelineDescription":
      "直近の相談状況と推奨の進捗を確認しましょう。",
    "dashboard.timelineEmpty":
      "まだ相談記録がありません。最初の相談を開始するとここに表示されます。",
    "dashboard.nextStepsTitle": "次のステップ",
    "dashboard.nextStepsDescription":
      "推奨の確認・クリック追跡・評価依頼を素早く進めましょう。",
    "dashboard.ippaSectionTitle": "K-IPPA効果性評価",
    "dashboard.ippaSectionDescription": "購入した支援機器の使用後評価を完了してください。評価を提出するとポイントが付与されます。",
    "dashboard.startEvaluation": "評価開始",
    "dashboard.unknownProduct": "不明な製品",
    "dashboard.noMatchReason": "推奨理由なし",
    "dashboard.nextStepActive": "進行中の相談",
    "dashboard.nextStepPending": "未クリック推奨",
    "dashboard.nextStepReview": "推奨を確認",
    "dashboard.nextStepReviewDescription":
      "推奨リストでクリック状況を確認してください。",
    "dashboard.timelineSummary":
      "推奨 {recommendationCount}件・未クリック {pendingCount}件",
    "dashboard.updatedAt": "更新:",
    "dashboard.noUpdates": "最近の更新はありません",
    "dashboard.status.completed": "完了",
    "dashboard.status.inProgress": "進行中",
    "dashboard.status.archived": "保管",
    "dashboard.status.unknown": "状態未定",
    "dashboard.untitled": "無題の相談",
    "dashboard.pendingSessions": "{count}件のセッションが回答待ちです",
    "dashboard.pendingRecommendationsLabel": "{count}件の推奨が未クリックです",
    "dashboard.progressTitle": "進捗レポート",
    "dashboard.progressSubtitle":
      "支援機器利用前後の生活変化を確認しましょう。",
    "dashboard.improvementCallout": "改善スコア",
    "dashboard.difficultyReductionLabel": "難易度の低下",
    "dashboard.comparisonDescription": "支援機器使用前後の難易度を比較します。",
    "dashboard.chartDifficultyLabel": "難易度 (1-5)",
    "dashboard.beforeDifficultyLabel": "使用前: 高い難易度",
    "dashboard.afterDifficultyLabel": "使用後: 低い難易度",
    "dashboard.ratingQuestion": "この製品はどのくらい役に立ちましたか？",
    "dashboard.ratingHelpText":
      "いただいたフィードバックは推奨品質の向上に役立てます。",
    "dashboard.ratingAriaPrefix": "評価",
    "dashboard.ratingAriaSuffix": "（5段階）",
    "dashboard.rating.excellent":
      "🎉 素晴らしいですね！お役に立てて嬉しいです。",
    "dashboard.rating.great": "😊 良かったです！さらに改善していきます。",
    "dashboard.rating.good": "👍 ありがとうございます！より良くしていきます。",
    "dashboard.rating.ok": "😐 ご意見ありがとうございます。",
    "dashboard.rating.bad": "😔 もっと努力します。",
    "dashboard.ratingThanksTitle": "ご意見ありがとうございます！",
    "dashboard.ratingThanksMessage":
      "いただいた{rating}点の評価はサービス改善に活用されます。",

    // Footer socials
    "footer.socialLinkedIn": "LinkedIn",
    "footer.socialTwitter": "Twitter",
    "footer.socialContact": "お問い合わせ",
  },
} as const;

export function getTranslation(lang: Language, key: string): string {
  const keys = key.split(".");
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}
