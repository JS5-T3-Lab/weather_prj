/* =============================================
   api.js - OpenWeather API 호출 공통 함수
   담당: 강기범
   모든 페이지에서 이 파일의 함수를 사용하세요.
   ============================================= */

const BASE_URL = "https://api.openweathermap.org/data/2.5";

// 도시명으로 현재 날씨 가져오기
async function getCurrentWeather(city) {
  const res = await fetch(
    `${BASE_URL}/weather?q=${city}&appid=${CONFIG.API_KEY}&units=metric&lang=kr`,
  );
  return res.json();
}

// 위도/경도로 현재 날씨 가져오기
async function getCurrentWeatherByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric&lang=kr`,
  );
  return res.json();
}

// 5일/3시간 예보 가져오기
async function getForecast(city) {
  const res = await fetch(
    `${BASE_URL}/forecast?q=${city}&appid=${CONFIG.API_KEY}&units=metric&lang=kr`,
  );
  return res.json();
}

// 시간별 예보(3시간)
async function getForecastByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric&lang=kr`,
  );
  return res.json();
}

// 대기질 정보 가져오기 (무료 API)
async function getAirPollution(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`,
  );
  return res.json();
}

// 예보 데이터 좌표 기반으로 가져오기 (3시간 단위)
async function getForecastByCoords(lat, lon) {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric&lang=kr`,
  );
  return res.json();
}
