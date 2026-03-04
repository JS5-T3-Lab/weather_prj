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

// 화면에 날씨 데이터를 업데이트하는 함수
function updateWeatherUI(data) {
  // utils.js의 roundTemp 함수로 온도 반올림
  const temp = roundTemp(data.main.temp);
  const cityName = data.name;
  const weatherMain = data.weather[0].main;
  const description = data.weather[0].description;
  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;

  // 아이콘 클래스 결정 (낮/밤 반영)
  const iconClass = getWeatherIconClass(weatherMain, sunrise, sunset);

  // 아이콘 색상도 낮/밤에 따라 변경
  const isDay = isDaytime(sunrise, sunset);
  weatherIconEl.className = `fa-solid ${iconClass}`;
  weatherIconEl.style.color = isDay
    ? "var(--color-sunset)" // 낮: 주황
    : "#7c9cbf"; // 밤: 차분한 파란빛

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

// TODO: 검색창
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  if (keyword.length < 1) return;

  // 한글 검색 → cities.js에서 매핑
  const results = searchCityByKorean(keyword);

  if (results.length > 0) {
    showSearchSuggestions(results); // 자동완성 드롭다운 표시
  }
});

// 도시 선택 시 날씨 요청 (좌표 기반으로 요청 — 영어명 필요 없음!)
async function loadCityWeather(city) {
  const data = await getCurrentWeatherByCoords(city.lat, city.lon);
  // 이후 UI 업데이트
}

// TODO: 시간별 기온/강수량 그래프
let hourlyChart = null;

async function initHourlyChart(lat, lon) {
  const forecast = await getForecastByCoords(lat, lon);

  // 3시간단위 8개, 24시간
  const items = forecast.list.slice(0, 8);
  const labels = items.map((item) => formatHour(item.dt));
  const temps = items.map((item) => roundTemp(item.main.temp));
  const rains = items.map((item) => item.rain?.["3h"] ?? 0);

  const canvas = document.createElement("canvas");
  canvas.id = "hourlyCanvas";
  const area = document.getElementById("hourlyChartArea");
  area.innerHTML = "";
  area.appendChild(canvas);

  // 기존 차트 제거 후 재생성
  if (hourlyChart) hourlyChart.destroy();

  hourlyChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "기온 (°C)",
          data: temps,
          borderColor: "#ff6b35",
          backgroundColor: "rgba(255,107,53,0.1)",
          yAxisID: "yTemp",
          tension: 0.4,
          pointRadius: 4,
        },
        {
          type: "bar",
          label: "강수량 (mm)",
          data: rains,
          backgroundColor: "rgba(77,168,218,0.5)",
          yAxisID: "yRain",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } },
      scales: {
        yTemp: {
          type: "linear",
          position: "left",
          title: { display: true, text: "°C" },
        },
        yRain: {
          type: "linear",
          position: "right",
          title: { display: true, text: "mm" },
          grid: { drawOnChartArea: false },
          min: 0,
        },
      },
    },
  });
}
// TODO: 즐겨찾기 도시 날씨
// TODO: 검색 기능

// 페이지가 로드되면 날씨 초기화 함수 실행
document.addEventListener("DOMContentLoaded", () => {
  initCurrentWeather();
});
