/* =============================================
   api.js - OpenWeather API 호출 공통 함수 (Vercel Proxy 연동)
   담당: 강기범
   ============================================= */

// 우리가 만든 Vercel 내부 API를 기본 주소로 설정합니다.
const BASE_URL = "/api/proxy";

// 도시명으로 현재 날씨 가져오기
async function getCurrentWeather(city) {
  const res = await fetch(
    `${BASE_URL}?path=weather&q=${city}&units=metric&lang=kr`,
  );
  return res.json();
}

// 위도/경도로 현재 날씨 가져오기
async function getCurrentWeatherByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}?path=weather&lat=${lat}&lon=${lon}&units=metric&lang=kr`,
  );
  return res.json();
}

// 5일/3시간 예보 가져오기
async function getForecast(city) {
  const res = await fetch(
    `${BASE_URL}?path=forecast&q=${city}&units=metric&lang=kr`,
  );
  return res.json();
}

// 시간별 예보(3시간)
async function getForecastByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}?path=forecast&lat=${lat}&lon=${lon}&units=metric&lang=kr`,
  );
  return res.json();
}

// 대기질 정보 가져오기
async function getAirPollution(lat, lon) {
  const res = await fetch(
    `${BASE_URL}?path=air_pollution&lat=${lat}&lon=${lon}`,
  );
  return res.json();
}
