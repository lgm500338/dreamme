import { DreamCategoryId, DreamPlace, GoalItem, PropDefinition } from '../types/dream';

export const DREAM_CATEGORIES: DreamCategoryId[] = [
  'travel',
  'love',
  'style',
  'home',
  'career',
  'wealth',
  'health',
  'growth',
];

export const DREAM_PLACES: DreamPlace[] = [
  {
    id: 'jeju-yacht',
    category: 'travel',
    name: { ko: '제주 바다 프라이빗 요트', en: 'Jeju Ocean Private Yacht', es: 'Yate privado en el mar de Jeju' },
    location: { ko: '대한민국 제주', en: 'Jeju Island, Korea', es: 'Isla de Jeju, Corea' },
    description: {
      ko: '에메랄드빛 제주 바다와 한라산 실루엣을 바라보며 티크 데크 위에서 여유롭게 와인을 즐기는 순간.',
      en: 'Sailing across emerald Jeju waters with Hallasan on the horizon and sunlit teak decks.',
      es: 'Navegando por las aguas esmeralda de Jeju, con el Hallasan en el horizonte y la cubierta de teca bañada por el sol.',
    },
    image: '/src/assets/images/scene_jeju_superyacht.webp',
    soundTheme: 'ocean',
    recommendedMode: 'solo',
    defaultAction: 'wine',
    walkBounds: { minY: 64, maxY: 90 },
    seatSpot: { x: 75.5, y: 73.5 },
    companionSpot: { x: 71.5, y: 69 },
    searchAliases: ['제주', '제주도', '요트', '바다', '와인', 'jeju', 'yacht', 'ocean', 'sea', 'wine', 'cruise', '산토리니', 'santorini', 'yate', 'mar', 'vino', 'crucero', 'corea'],
    stampCode: 'CJU-YACHT',
    stage: {
      imageAspect: 1920 / 1072,
      horizonY: 0.4375,
      heightK: 1.19,
      floor: [[[0.39, 0.6], [0.33, 0.64], [0.275, 0.68], [0.23, 0.72], [0.185, 0.76], [0.145, 0.8], [0.105, 0.84], [0.06, 0.9], [0.03, 0.97], [0.97, 0.97], [0.94, 0.9], [0.895, 0.84], [0.855, 0.8], [0.815, 0.76], [0.77, 0.72], [0.725, 0.68], [0.67, 0.64], [0.61, 0.6]]],
      obstacles: [
        [[0.38, 0.59], [0.62, 0.59], [0.62, 0.636], [0.38, 0.636]], // bow sun-pad
        [[0.678, 0.613], [0.783, 0.688], [0.891, 0.777], [0.824, 0.785], [0.734, 0.696], [0.643, 0.621]], // sofa
        [[0.595, 0.765], [0.67, 0.765], [0.67, 0.795], [0.595, 0.795]], // champagne table
      ],
      spawn: { x: 0.48, y: 0.8 },
      seat: { x: 0.79, y: 0.724 },
      companionSeat: { x: 0.745, y: 0.686 },
      lights: 'superyacht',
    },
  },
  {
    id: 'paris-cafe',
    category: 'travel',
    name: { ko: '파리 에펠탑 테라스 카페', en: 'Paris Eiffel Terrace Cafe', es: 'Café con terraza frente a la Torre Eiffel' },
    location: { ko: '프랑스 파리', en: 'Paris, France', es: 'París, Francia' },
    description: {
      ko: '에펠탑이 보이는 햇살 가득한 노천 테라스에서 크루아상과 에스프레소 한 잔의 여유.',
      en: 'Morning espresso and warm croissants on a cobblestone terrace facing the Eiffel Tower.',
      es: 'Un espresso por la mañana y cruasanes calientes en una terraza adoquinada frente a la Torre Eiffel.',
    },
    image: '/src/assets/images/scene_paris_cafe_1795429091652.webp',
    soundTheme: 'cafe',
    recommendedMode: 'together',
    defaultAction: 'sit',
    walkBounds: { minY: 55, maxY: 84 },
    seatSpot: { x: 64, y: 78 },
    companionSpot: { x: 46, y: 78 },
    searchAliases: ['파리', '에펠탑', '유럽', '카페', '커피', 'paris', 'eiffel', 'europe', 'cafe', 'coffee', '프랑스', 'france', '로마', '이탈리아', 'parís', 'torre eiffel', 'café', 'francia', 'roma', 'italia'],
    stampCode: 'PAR-CAFE',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.53,
      heightK: 1.4,
      floor: [[[0.43, 0.59], [0.535, 0.59], [0.555, 0.68], [0.565, 0.8], [0.575, 0.97], [0.14, 0.97], [0.3, 0.86], [0.37, 0.76], [0.4, 0.66]]],
      spawn: { x: 0.47, y: 0.8 },
      seat: { x: 0.61, y: 0.9 },
      companionSeat: { x: 0.72, y: 0.76 },
    },
  },
  {
    id: 'central-park',
    category: 'health',
    name: { ko: '뉴욕 센트럴파크 호수 산책로', en: 'New York Central Park Lake Walk', es: 'Paseo junto al lago de Central Park' },
    location: { ko: '미국 뉴욕', en: 'New York, USA', es: 'Nueva York, EE. UU.' },
    description: {
      ko: '맨해튼 스카이라인과 잔잔한 호수를 따라 상쾌하게 걷고 건강한 에너지를 채우는 산책길.',
      en: 'A sunlit lakeside promenade framed by lush foliage and the Manhattan skyline.',
      es: 'Un paseo soleado junto al lago, rodeado de vegetación y con el skyline de Manhattan al fondo.',
    },
    image: '/src/assets/images/scene_central_park_1795429093244.webp',
    soundTheme: 'park',
    recommendedMode: 'together',
    defaultAction: 'walk',
    walkBounds: { minY: 58, maxY: 86 },
    seatSpot: { x: 24, y: 76 },
    companionSpot: { x: 58, y: 76 },
    searchAliases: ['뉴욕', '센트럴파크', '산책', '공원', '건강', '운동', '다이어트', '걷기', 'new york', 'central park', 'park', 'walk', 'health', '런던', '하이드파크', 'nueva york', 'parque', 'pasear', 'paseo', 'caminar', 'salud', 'dieta'],
    stampCode: 'NYC-PARK',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.6,
      heightK: 1.4,
      floor: [[[0.37, 0.665], [0.49, 0.665], [0.58, 0.71], [0.63, 0.8], [0.68, 0.9], [0.71, 0.97], [0.21, 0.97], [0.27, 0.86], [0.3, 0.77], [0.34, 0.7]]],
      obstacles: [[[0.3, 0.66], [0.375, 0.66], [0.37, 0.75], [0.3, 0.76]]], // back bench
      spawn: { x: 0.45, y: 0.82 },
      seat: { x: 0.23, y: 0.86 },
      companionSeat: { x: 0.16, y: 0.88 },
    },
  },
  {
    id: 'home-60pyeong',
    category: 'home',
    name: { ko: '60평 한강뷰 아파트 거실', en: '60-Pyeong River View Apartment', es: 'Piso de 200 m² con vistas al río Han' },
    location: { ko: '대한민국 서울 한강변', en: 'Han River, Seoul', es: 'Río Han, Seúl' },
    description: {
      ko: '통창 너머 한강과 서울 스카이라인이 펼쳐지는 넓고 고요한 60평 아파트에서의 여유로운 일상.',
      en: 'Expansive 60-pyeong sunlit apartment living room overlooking the Han River and city horizon.',
      es: 'Un amplio y luminoso salón de 200 m² con vistas al río Han y al horizonte de la ciudad.',
    },
    image: '/src/assets/images/scene_60pyeong_home_1795429103145.webp',
    soundTheme: 'home',
    recommendedMode: 'solo',
    defaultAction: 'stand',
    walkBounds: { minY: 60, maxY: 86 },
    seatSpot: { x: 46, y: 72 },
    companionSpot: { x: 58, y: 73 },
    searchAliases: ['60평', '아파트', '한강', '한강뷰', '집', '내집', '거실', '인테리어', '이사', '60pyeong', 'apartment', 'home', 'seoul', 'living room', '빌라', '주택', 'piso', 'casa', 'hogar', 'salón', 'mudanza', 'seúl'],
    stampCode: 'SEL-60PY',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.5,
      heightK: 1.35,
      floor: [[[0.13, 0.7], [0.3, 0.67], [0.72, 0.665], [0.9, 0.7], [1.0, 0.74], [1.0, 0.97], [0.0, 0.97], [0.0, 0.75]]],
      obstacles: [
        [[0.26, 0.69], [0.455, 0.69], [0.455, 0.845], [0.26, 0.845]], // chaise sofa
        [[0.28, 0.64], [0.71, 0.64], [0.71, 0.715], [0.28, 0.715]], // main sofa
        [[0.53, 0.71], [0.765, 0.71], [0.765, 0.805], [0.53, 0.805]], // coffee table
        [[0.74, 0.63], [0.81, 0.63], [0.81, 0.69], [0.74, 0.69]], // planter
      ],
      spawn: { x: 0.62, y: 0.88 },
      seat: { x: 0.37, y: 0.85 },
      companionSeat: { x: 0.5, y: 0.72 },
    },
  },
  {
    id: 'business-class',
    category: 'wealth',
    name: { ko: '유럽행 비즈니스석 스위트', en: 'Business Class Suite to Europe', es: 'Suite en business rumbo a Europa' },
    location: { ko: '구름 위 38,000ft', en: '38,000 ft Above Clouds', es: 'A 38.000 pies sobre las nubes' },
    description: {
      ko: '창밖 뭉게구름을 바라보며 프라이빗 좌석에서 샴페인과 함께 떠나는 품격 있는 유럽 비행.',
      en: 'Cruising above sunlit clouds in a private leather suite en route to Europe.',
      es: 'Volando sobre nubes iluminadas por el sol en una suite privada de piel rumbo a Europa.',
    },
    image: '/src/assets/images/scene_business_class_1795429093794.webp',
    soundTheme: 'home',
    recommendedMode: 'solo',
    defaultAction: 'sit',
    walkBounds: { minY: 60, maxY: 84 },
    seatSpot: { x: 56, y: 76 },
    companionSpot: { x: 34, y: 77 },
    searchAliases: ['비즈니스', '비즈니스석', '비행기', '유럽여행', '일등석', '항공', '부자', '자유', 'business class', 'flight', 'plane', 'europe', 'wealth', 'business', 'avión', 'vuelo', 'primera clase', 'riqueza', 'libertad'],
    stampCode: 'SKY-BIZ',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.38,
      heightK: 1.3,
      floor: [
        [[0.83, 0.5], [0.885, 0.5], [0.93, 0.72], [0.96, 0.97], [0.72, 0.97], [0.77, 0.72]],
        [[0.12, 0.93], [0.75, 0.93], [0.75, 0.97], [0.12, 0.97]],
      ],
      spawn: { x: 0.82, y: 0.86 },
      seat: { x: 0.58, y: 0.93 },
      companionSeat: { x: 0.22, y: 0.97 },
    },
  },
  {
    id: 'fine-dining',
    category: 'love',
    name: { ko: '파인다이닝 캔들라이트 레스토랑', en: 'Candlelit Fine Dining Restaurant', es: 'Restaurante gourmet a la luz de las velas' },
    location: { ko: '유럽풍 다이닝 살롱', en: 'European Dining Salon', es: 'Salón de estilo europeo' },
    description: {
      ko: '따뜻한 조명과 와인 잔이 반짝이는 테이블에서 소중한 사람과 마주 앉아 나누는 저녁 식사.',
      en: 'An intimate linen-dressed table glowing under crystal chandeliers for an unforgettable dinner.',
      es: 'Una mesa íntima con mantel de lino bajo lámparas de cristal para una cena inolvidable.',
    },
    image: '/src/assets/images/scene_fine_dining_1795429094530.webp',
    soundTheme: 'cafe',
    recommendedMode: 'solo',
    defaultAction: 'wine',
    walkBounds: { minY: 58, maxY: 84 },
    seatSpot: { x: 38, y: 76 },
    companionSpot: { x: 62, y: 76 },
    searchAliases: ['레스토랑', '저녁', '식사', '밥', '밥먹기', '데이트', '사랑', '연인', '좋아하는 사람', '가족', '와인', 'dinner', 'restaurant', 'love', 'date', 'dining', 'cena', 'cenar', 'restaurante', 'cita', 'amor', 'pareja', 'familia', 'alguien especial'],
    stampCode: 'DIN-LOVE',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.5,
      heightK: 1.3,
      floor: [[[0.79, 0.63], [0.97, 0.63], [1.0, 0.7], [1.0, 0.97], [0.72, 0.97], [0.75, 0.83]]],
      obstacles: [[[0.86, 0.6], [0.92, 0.6], [0.92, 0.75], [0.86, 0.75]]], // chair by the aisle
      spawn: { x: 0.85, y: 0.86 },
      seat: { x: 0.79, y: 0.88 },
      companionSeat: { x: 0.22, y: 0.74 },
    },
  },
  {
    id: 'luxury-boutique',
    category: 'style',
    name: { ko: '럭셔리 패션 플래그십 부티크', en: 'Luxury Fashion Flagship Boutique', es: 'Boutique insignia de moda de lujo' },
    location: { ko: '서울 청담 · 밀라노', en: 'Seoul & Milan', es: 'Seúl y Milán' },
    description: {
      ko: '목표 체중과 건강한 몸을 완성하고, 나에게 어울리는 최고급 코트와 스타일을 고르는 설레는 시간.',
      en: 'A serene stone-and-brass flagship salon to celebrate your transformation and personal style.',
      es: 'Un salón sereno de piedra y latón para celebrar tu transformación y tu estilo personal.',
    },
    image: '/src/assets/images/scene_luxury_boutique_1795429091893.webp',
    soundTheme: 'home',
    recommendedMode: 'together',
    defaultAction: 'stand',
    walkBounds: { minY: 60, maxY: 86 },
    seatSpot: { x: 24, y: 76 },
    companionSpot: { x: 64, y: 77 },
    searchAliases: ['명품', '쇼핑', '옷', '패션', '부티크', '10kg', '감량', '다이어트', '변신', '스타일', '백화점', '밀라노', 'shopping', 'boutique', 'fashion', 'luxury', 'style', 'diet', 'compras', 'ropa', 'moda', 'lujo', 'estilo', 'milán', 'perder'],
    stampCode: 'MIL-STYLE',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.5,
      heightK: 1.65,
      floor: [[[0.0, 0.71], [0.38, 0.68], [0.43, 0.6], [0.68, 0.575], [0.95, 0.68], [1.0, 0.72], [1.0, 0.97], [0.0, 0.97]]],
      obstacles: [
        [[0.11, 0.655], [0.385, 0.655], [0.385, 0.715], [0.11, 0.715]], // clothes rail
        [[0.79, 0.745], [0.91, 0.745], [0.91, 0.86], [0.79, 0.86]], // stone plinth
        [[0.63, 0.56], [0.83, 0.56], [0.83, 0.625], [0.63, 0.625]], // shelves
        [[0.0, 0.6], [0.1, 0.6], [0.1, 0.73], [0.0, 0.73]], // chair + side table
      ],
      spawn: { x: 0.5, y: 0.82 },
      seat: { x: 0.85, y: 0.875 },
      companionSeat: { x: 0.74, y: 0.88 },
    },
  },
  {
    id: 'bookstore-signing',
    category: 'growth',
    name: { ko: '내 책 출간 서점 작가 사인회', en: 'Bookstore Author Signing Salon', es: 'Firma de libros de tu propio libro' },
    location: { ko: '아키텍처 북 살롱', en: 'Literary Book Salon', es: 'Salón literario' },
    description: {
      ko: '내 이름이 새겨진 첫 책을 출간하고, 따뜻한 서점에서 독자들과 만나 정성껏 사인하는 순간.',
      en: 'Warm oak shelves and a dedicated author desk where readers gather for your published book.',
      es: 'Estanterías de roble y una mesa de autor donde los lectores se reúnen por tu libro publicado.',
    },
    image: '/src/assets/images/scene_bookstore_signing_1795429090429.webp',
    soundTheme: 'home',
    recommendedMode: 'together',
    defaultAction: 'sign',
    walkBounds: { minY: 58, maxY: 86 },
    seatSpot: { x: 74, y: 78 },
    companionSpot: { x: 52, y: 78 },
    searchAliases: ['책', '출간', '작가', '사인회', '서점', '글쓰기', '공부', '성장', '배움', '도서관', 'book', 'author', 'signing', 'bookstore', 'publish', 'growth', 'libro', 'publicar', 'autor', 'autora', 'firma', 'librería', 'escribir', 'estudiar'],
    stampCode: 'PUB-BOOK',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.47,
      heightK: 1.25,
      floor: [[[0.41, 0.575], [0.6, 0.575], [0.62, 0.7], [0.6, 0.97], [0.12, 0.97], [0.3, 0.72], [0.38, 0.61]]],
      spawn: { x: 0.44, y: 0.82 },
      seat: { x: 0.565, y: 0.57 },
      companionSeat: { x: 0.455, y: 0.57 },
    },
  },
  {
    id: 'tropical-beach',
    category: 'travel',
    name: { ko: '푸켓 · 몰디브 에메랄드 해변 리조트', en: 'Phuket & Maldives Emerald Lagoon', es: 'Laguna esmeralda de Phuket y Maldivas' },
    location: { ko: '푸켓 · 몰디브 · 하와이', en: 'Phuket · Maldives · Hawaii', es: 'Phuket · Maldivas · Hawái' },
    description: {
      ko: '투명한 산호빛 바다와 인피니티 풀 데크 위에서 파도 소리를 들으며 보내는 완벽한 휴양.',
      en: 'Crystal turquoise waters, swaying palms, and a timber boardwalk over a serene lagoon.',
      es: 'Aguas turquesa cristalinas, palmeras que se mecen y una pasarela de madera sobre una laguna tranquila.',
    },
    image: '/src/assets/images/scene_tropical_beach_1795429092449.webp',
    soundTheme: 'ocean',
    recommendedMode: 'together',
    defaultAction: 'stand',
    walkBounds: { minY: 58, maxY: 86 },
    seatSpot: { x: 68, y: 77 },
    companionSpot: { x: 48, y: 78 },
    searchAliases: ['푸켓', '태국', '몰디브', '하와이', '발리', '해변', '휴양지', '리조트', '풀빌라', '수영장', 'phuket', 'thailand', 'maldives', 'hawaii', 'bali', 'beach', 'resort', 'villa', 'playa', 'tailandia', 'maldivas', 'hawái', 'piscina', 'vacaciones'],
    stampCode: 'HKT-BEACH',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.42,
      heightK: 0.85,
      floor: [[[0.77, 0.66], [0.86, 0.56], [0.92, 0.47], [1.0, 0.47], [1.0, 0.97], [0.45, 0.97], [0.57, 0.85], [0.65, 0.76], [0.72, 0.7]]],
      spawn: { x: 0.8, y: 0.84 },
      seat: { x: 0.72, y: 0.8 },
      companionSeat: { x: 0.66, y: 0.87 },
    },
  },
  {
    id: 'keynote-stage',
    category: 'career',
    name: { ko: '글로벌 리더 키노트 강연 무대', en: 'Global Keynote Lecture Stage', es: 'Escenario de conferencia internacional' },
    location: { ko: '그랜드 오디토리움', en: 'Grand Auditorium', es: 'Gran auditorio' },
    description: {
      ko: '따뜻한 스포트라이트 아래 수백 명의 청중 앞에서 나의 비전과 성공 스토리를 전하는 무대.',
      en: 'Step under golden stage lights to share your vision and story before an inspired audience.',
      es: 'Sube bajo las luces doradas del escenario para compartir tu visión y tu historia ante un público inspirado.',
    },
    image: '/src/assets/images/scene_keynote_stage_1795429092384.webp',
    soundTheme: 'home',
    recommendedMode: 'together',
    defaultAction: 'greet',
    walkBounds: { minY: 60, maxY: 86 },
    seatSpot: { x: 44, y: 73 },
    companionSpot: { x: 62, y: 76 },
    searchAliases: ['강연', '연설', '무대', '사업', '사업가', '성공', 'CEO', '대표', '커리어', '유명', 'keynote', 'stage', 'speech', 'career', 'business', 'success', 'leader', 'conferencia', 'charla', 'escenario', 'negocio', 'éxito', 'carrera', 'líder'],
    stampCode: 'KEY-STAGE',
    stage: {
      imageAspect: 1376 / 768,
      horizonY: 0.55,
      heightK: 1.4,
      floor: [[[0.15, 0.63], [0.55, 0.62], [0.68, 0.645], [1.0, 0.71], [1.0, 0.97], [0.08, 0.97], [0.08, 0.66]]],
      obstacles: [
        [[0.43, 0.63], [0.475, 0.63], [0.475, 0.665], [0.43, 0.665]], // podium
        [[0.395, 0.62], [0.43, 0.62], [0.43, 0.655], [0.395, 0.655]], // chair
        [[0.545, 0.615], [0.6, 0.615], [0.6, 0.65], [0.545, 0.65]], // monitor
        [[0.67, 0.64], [0.71, 0.64], [0.71, 0.665], [0.67, 0.665]], // speaker box
      ],
      spawn: { x: 0.5, y: 0.8 },
      seat: { x: 0.413, y: 0.656 },
      companionSeat: { x: 0.37, y: 0.66 },
    },
  },
];

export const AVATAR_PROPS: PropDefinition[] = [
  {
    id: 'none',
    name: { ko: '소품 없음', en: 'No Prop', es: 'Sin objeto' },
    unlockProgress: 0,
    unlockHint: { ko: '기본 제공', en: 'Default', es: 'Incluido' },
  },
  {
    id: 'coffee',
    name: { ko: '모닝 에스프레소', en: 'Morning Espresso', es: 'Espresso de la mañana' },
    unlockProgress: 0,
    unlockHint: { ko: '기본 제공', en: 'Default', es: 'Incluido' },
  },
  {
    id: 'wine',
    name: { ko: '크리스탈 와인 잔', en: 'Crystal Wine Glass', es: 'Copa de vino de cristal' },
    unlockProgress: 0,
    unlockHint: { ko: '기본 제공', en: 'Default', es: 'Incluido' },
  },
  {
    id: 'sunglasses',
    name: { ko: '리조트 선글라스', en: 'Resort Sunglasses', es: 'Gafas de sol' },
    unlockProgress: 20,
    unlockHint: { ko: '목표 달성률 20%', en: '20% Goal Progress', es: '20 % de progreso' },
  },
  {
    id: 'champagne',
    name: { ko: '축배 샴페인 플루트', en: 'Celebration Champagne', es: 'Champán' },
    unlockProgress: 40,
    unlockHint: { ko: '목표 달성률 40%', en: '40% Goal Progress', es: '40 % de progreso' },
  },
  {
    id: 'shoppingBag',
    name: { ko: '부티크 쇼핑백', en: 'Boutique Shopping Bag', es: 'Bolsa de lujo' },
    unlockProgress: 60,
    unlockHint: { ko: '목표 달성률 60%', en: '60% Goal Progress', es: '60 % de progreso' },
  },
  {
    id: 'bestsellerBook',
    name: { ko: '내 이름 베스트셀러', en: 'My Bestseller Book', es: 'Mi bestseller' },
    unlockProgress: 75,
    unlockHint: { ko: '목표 달성률 75%', en: '75% Goal Progress', es: '75 % de progreso' },
  },
  {
    id: 'goldKey',
    name: { ko: '드림 하우스 골드 키', en: 'Dream Home Gold Key', es: 'Llave de mi casa' },
    unlockProgress: 90,
    unlockHint: { ko: '목표 달성률 90%', en: '90% Goal Progress', es: '90 % de progreso' },
  },
];

export const DEFAULT_GOALS: GoalItem[] = [
  {
    id: 'goal-health-weight',
    title: '건강하게 10kg 감량 & 체력 만들기',
    category: 'health',
    current: 2.5,
    target: 10,
    unit: 'kg',
    step: 0.5,
    linkedPlaceId: 'luxury-boutique',
    lastCheckedDate: null,
  },
  {
    id: 'goal-travel-fund',
    title: '제주 요트 & 유럽 비즈니스 여행 자금 저축',
    category: 'travel',
    current: 120,
    target: 500,
    unit: '만원',
    step: 20,
    linkedPlaceId: 'jeju-yacht',
    lastCheckedDate: null,
  },
  {
    id: 'goal-book-writing',
    title: '내 이름으로 출간할 책 원고 집필',
    category: 'growth',
    current: 4,
    target: 20,
    unit: '챕터',
    step: 1,
    linkedPlaceId: 'bookstore-signing',
    lastCheckedDate: null,
  },
];

export function matchDreamSentenceToPlace(text: string): {
  place: DreamPlace;
  category: DreamCategoryId;
  action: DreamPlace['defaultAction'];
} {
  const q = text.toLowerCase().trim();
  if (!q) {
    return {
      place: DREAM_PLACES[0],
      category: DREAM_PLACES[0].category,
      action: DREAM_PLACES[0].defaultAction,
    };
  }

  let bestPlace = DREAM_PLACES[0];
  let bestScore = 0;

  for (const place of DREAM_PLACES) {
    let score = 0;
    for (const alias of place.searchAliases) {
      if (q.includes(alias.toLowerCase())) {
        score += alias.length + 2;
      }
    }
    if (q.includes(place.name.ko.toLowerCase()) || q.includes(place.name.en.toLowerCase()) || q.includes(place.name.es.toLowerCase())) {
      score += 10;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPlace = place;
    }
  }

  let action = bestPlace.defaultAction;
  if (q.includes('식사') || q.includes('저녁') || q.includes('밥') || q.includes('와인') || q.includes('커피') || q.includes('cena') || q.includes('vino') || q.includes('café')) {
    action = 'wine';
  } else if (q.includes('사인') || q.includes('책') || q.includes('출간') || q.includes('libro') || q.includes('firma')) {
    action = 'sign';
  } else if (q.includes('산책') || q.includes('걷') || q.includes('쇼핑') || q.includes('pase') || q.includes('camin') || q.includes('compras')) {
    action = 'walk';
  } else if (q.includes('강연') || q.includes('인사') || q.includes('연설') || q.includes('conferencia') || q.includes('charla')) {
    action = 'greet';
  } else if (q.includes('앉')) {
    action = 'sit';
  }

  return {
    place: bestPlace,
    category: bestPlace.category,
    action,
  };
}
