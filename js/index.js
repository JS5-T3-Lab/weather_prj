/* =============================================
   index.js - 메인 대시보드 페이지 로직
   담당: 강기범, 정성모
   ============================================= */

// TODO: 현재 위치 날씨 표시
// DOM 요소 선택
const summaryCardBody = document.querySelector(
  "#sidebar-left .card:first-child .card-body",
);
const weatherIconEl = summaryCardBody.querySelector("i");
const currentTempEl = summaryCardBody.querySelector("h2");
const currentLocationEl = summaryCardBody.querySelector("p");

// 날씨 상태에 따른 FontAwesome 아이콘 클래스 반환 함수
function getWeatherIconClass(weatherMain) {
  switch (weatherMain.toLowerCase()) {
    case "clear":
      return "fa-sun";
    case "clouds":
      return "fa-cloud";
    case "rain":
      return "fa-cloud-rain";
    case "snow":
      return "fa-snowflake";
    case "thunderstorm":
      return "fa-bolt";
    case "drizzle":
      return "fa-cloud-showers-water";
    default:
      return "fa-cloud-sun";
  }
}

// 화면에 날씨 데이터를 업데이트하는 함수
function updateWeatherUI(data) {
  // utils.js의 roundTemp 함수로 온도 반올림
  const temp = roundTemp(data.main.temp);
  const cityName = data.name;
  const weatherMain = data.weather[0].main;
  const description = data.weather[0].description;

  // 아이콘, 온도, 위치 텍스트 업데이트
  weatherIconEl.className = `fa-solid ${getWeatherIconClass(weatherMain)}`;
  currentTempEl.textContent = `${temp}°C`;
  currentLocationEl.textContent = `${cityName} - ${description}`;
}

// 현재 위치 날씨 초기화 함수
async function initCurrentWeather() {
  try {
    // 1. 브라우저 위치 정보 가져오기 (utils.js 활용)
    const position = await getCurrentLocation();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // 2. 위경도로 날씨 데이터 요청 (api.js 활용)
    const weatherData = await getCurrentWeatherByCoords(lat, lon);

    // 3. UI 업데이트
    updateWeatherUI(weatherData);
  } catch (error) {
    console.warn(
      "위치 정보를 가져올 수 없어 기본 지역(서울)으로 대체합니다.",
      error,
    );

    // 위치 정보를 지원하지 않거나 사용자가 차단한 경우 기본 지역(Seoul)으로 API 호출
    try {
      const fallbackData = await getCurrentWeather("Seoul");
      updateWeatherUI(fallbackData);
    } catch (apiError) {
      currentLocationEl.textContent = "날씨 정보를 불러오지 못했습니다.";
    }
  }
}
// TODO: 시간별 기온/강수량 그래프
// TODO: 즐겨찾기 도시 날씨
// TODO: 검색 기능
