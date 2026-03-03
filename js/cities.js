// 한글 도시명 → { 영어명, 위도, 경도 } 매핑 테이블
const CITIES = [
  // 국내
  { ko: "서울", en: "Seoul", lat: 37.5665, lon: 126.978, country: "KR" },
  { ko: "부산", en: "Busan", lat: 35.1796, lon: 129.0756, country: "KR" },
  { ko: "인천", en: "Incheon", lat: 37.4563, lon: 126.7052, country: "KR" },
  { ko: "대구", en: "Daegu", lat: 35.8714, lon: 128.6014, country: "KR" },
  { ko: "대전", en: "Daejeon", lat: 36.3504, lon: 127.3845, country: "KR" },
  { ko: "광주", en: "Gwangju", lat: 35.1595, lon: 126.8526, country: "KR" },
  { ko: "제주", en: "Jeju", lat: 33.4996, lon: 126.5312, country: "KR" },
  // 해외
  { ko: "도쿄", en: "Tokyo", lat: 35.6762, lon: 139.6503, country: "JP" },
  { ko: "뉴욕", en: "New York", lat: 40.7128, lon: -74.006, country: "US" },
  { ko: "런던", en: "London", lat: 51.5074, lon: -0.1278, country: "GB" },
  { ko: "파리", en: "Paris", lat: 48.8566, lon: 2.3522, country: "FR" },
  { ko: "방콕", en: "Bangkok", lat: 13.7563, lon: 100.5018, country: "TH" },
  {
    ko: "싱가포르",
    en: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    country: "SG",
  },
  { ko: "시드니", en: "Sydney", lat: -33.8688, lon: 151.2093, country: "AU" },
];

// 한글 검색어로 도시 찾기
function searchCityByKorean(keyword) {
  return CITIES.filter((city) => city.ko.includes(keyword));
}

// 영어명으로 도시 찾기
function findCityByEn(enName) {
  return CITIES.find((city) => city.en.toLowerCase() === enName.toLowerCase());
}
