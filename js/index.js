/* =============================================
   index.js - 메인 대시보드 페이지 로직
   담당: 강기범, 정성모
   ============================================= */

// ===== DOM 요소 =====
const summaryCardBody = document.querySelector(
  "#sidebar-left .card:first-child .card-body",
);
const weatherIconEl = summaryCardBody.querySelector("i");
const currentTempEl = summaryCardBody.querySelector("h2");
const currentLocationEl = summaryCardBody.querySelector("p");

// ===== 날씨 UI 업데이트 =====
function updateWeatherUI(data) {
  const temp = roundTemp(data.main.temp);
  const cityName = data.name;
  const weatherMain = data.weather[0].main;
  const description = data.weather[0].description;
  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;

  const iconClass = getWeatherIconClass(weatherMain, sunrise, sunset); // utils.js
  const isDay = isDaytime(sunrise, sunset); // utils.js

  weatherIconEl.className = `fa-solid ${iconClass}`;
  weatherIconEl.style.color = isDay ? "var(--color-sunset)" : "#7c9cbf";
  currentTempEl.textContent = `${temp}°C`;
  currentLocationEl.textContent = `${cityName} - ${description}`;
}

// ===== 시간별 날씨 그래프 =====
let hourlyChart = null;
let forecastCache = null; // API 중복 호출 방지용 캐시

async function initHourlyChart(lat, lon) {
  try {
    forecastCache = await getForecastByCoords(lat, lon); // api.js
    renderChart("temp"); // 기본 탭: 기온

    // 탭 전환 이벤트
    document.querySelectorAll(".chart-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".chart-tab")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderChart(btn.dataset.tab);
      });
    });
  } catch (e) {
    console.warn("시간별 그래프 로딩 실패", e);
    document.getElementById("hourlyChartArea").textContent =
      "데이터를 불러오지 못했습니다.";
  }
}

function renderChart(tab) {
  if (!forecastCache) return;

  const items = forecastCache.list.slice(0, 8); // 24시간 (3시간 x 8)
  const labels = items.map((item) => formatHour(item.dt)); // utils.js
  const temps = items.map((item) => roundTemp(item.main.temp));
  const rains = items.map((item) => item.rain?.["3h"] ?? 0);

  const area = document.getElementById("hourlyChartArea");
  area.innerHTML = "";

  const canvas = document.createElement("canvas");
  area.appendChild(canvas);

  if (hourlyChart) hourlyChart.destroy();

  if (tab === "temp") {
    hourlyChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "기온 (°C)",
            data: temps,
            borderColor: "#ff6b35",
            backgroundColor: "rgba(255,107,53,0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#ff6b35",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // ← 높이를 CSS로 제어하기 위해 필요
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: "°C" } },
        },
      },
    });
  } else {
    hourlyChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "강수량 (mm)",
            data: rains,
            backgroundColor: "rgba(77,168,218,0.6)",
            borderColor: "#4da8da",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // ← 동일
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, title: { display: true, text: "mm" } },
        },
      },
    });
  }
}

// ===== 대기질 정보 =====
function getAqiInfo(aqi) {
  const grades = {
    1: { label: "좋음", color: "#22c55e" },
    2: { label: "보통", color: "#84cc16" },
    3: { label: "나쁨", color: "#f59e0b" },
    4: { label: "매우나쁨", color: "#ef4444" },
    5: { label: "위험", color: "#7c3aed" },
  };
  return grades[aqi] || { label: "--", color: "#9ca3af" };
}

async function initAirQuality(lat, lon) {
  try {
    const data = await getAirPollution(lat, lon); // api.js
    const { aqi } = data.list[0].main;
    const { pm2_5, pm10, co, o3, no2, so2 } = data.list[0].components;
    const info = getAqiInfo(aqi);

    document.getElementById("aqiGrade").textContent = info.label;
    document.getElementById("aqiGrade").style.color = info.color;
    document.getElementById("aqiLabel").textContent =
      `통합대기환경지수 ${aqi}등급`;
    document.getElementById("aqiPm10").textContent = `${pm10.toFixed(1)} ㎍/㎥`;
    document.getElementById("aqiPm25").textContent =
      `${pm2_5.toFixed(1)} ㎍/㎥`;
    document.getElementById("aqiCo").textContent = `${co.toFixed(1)} ㎍/㎥`;
    document.getElementById("aqiO3").textContent = `${o3.toFixed(1)} ㎍/㎥`;
    document.getElementById("aqiNo2").textContent = `${no2.toFixed(1)} ㎍/㎥`;
    document.getElementById("aqiSo2").textContent = `${so2.toFixed(1)} ㎍/㎥`;
  } catch (e) {
    console.warn("대기질 API 호출 실패", e);
    document.getElementById("aqiLabel").textContent =
      "대기질 정보를 불러오지 못했습니다.";
  }
}

// ===== 어제 이 시간과 비교 =====
async function initYesterdayCompare(lat, lon, todayData) {
  try {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate() - 1).padStart(2, "0"); // 어제 날짜
    const hh = String(now.getHours()).padStart(2, "0");
    const targetHour = `${yyyy}-${mm}-${dd}T${hh}:00`;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=temperature_2m,apparent_temperature,relativehumidity_2m` +
        `&past_days=1&forecast_days=0&timezone=Asia%2FSeoul`,
    );
    const meteo = await res.json();
    const idx = meteo.hourly.time.indexOf(targetHour);

    const yTemp = idx >= 0 ? roundTemp(meteo.hourly.temperature_2m[idx]) : null;
    const yFeel =
      idx >= 0 ? roundTemp(meteo.hourly.apparent_temperature[idx]) : null;
    const yHum =
      idx >= 0 ? Math.round(meteo.hourly.relativehumidity_2m[idx]) : null;

    const tTemp = roundTemp(todayData.main.temp);
    const tFeel = roundTemp(todayData.main.feels_like);
    const tHum = todayData.main.humidity;

    function fillCompare(yestId, todayId, diffId, yVal, tVal, unit) {
      if (yVal === null) {
        document.getElementById(yestId).textContent = `-- ${unit}`;
        return;
      }
      document.getElementById(yestId).textContent = `${yVal} ${unit}`;
      document.getElementById(todayId).textContent = `${tVal} ${unit}`;
      const diff = tVal - yVal;
      const diffEl = document.getElementById(diffId);
      diffEl.textContent =
        diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : `−`;
      diffEl.style.color =
        diff > 0 ? "#ef4444" : diff < 0 ? "#3b82f6" : "#9ca3af";
    }

    fillCompare(
      "cmpTempYest",
      "cmpTempToday",
      "cmpTempDiff",
      yTemp,
      tTemp,
      "°C",
    );
    fillCompare(
      "cmpFeelYest",
      "cmpFeelToday",
      "cmpFeelDiff",
      yFeel,
      tFeel,
      "°C",
    );
    fillCompare("cmpHumYest", "cmpHumToday", "cmpHumDiff", yHum, tHum, "%");
  } catch (e) {
    console.warn("어제 날씨 비교 실패", e);
  }
}

// ===== 1주일 날씨 예보 =====
async function initWeeklyForecast(lat, lon) {
  try {
    // forecastCache가 있으면 재사용 (API 이중 호출 방지)
    const forecast = forecastCache ?? (await getForecastByCoords(lat, lon));

    const dailyMap = {};
    forecast.list.forEach((item) => {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyMap[date]) dailyMap[date] = [];
      dailyMap[date].push(item);
    });

    const container = document.getElementById("weeklyForecastBody");
    container.innerHTML = "";

    Object.entries(dailyMap)
      .slice(0, 7)
      .forEach(([date, items]) => {
        const temps = items.map((i) => i.main.temp);
        const maxTemp = roundTemp(Math.max(...temps));
        const minTemp = roundTemp(Math.min(...temps));
        const midItem = items[Math.floor(items.length / 2)];
        const emoji = getWeatherEmoji(midItem.weather[0].main); // utils.js

        const d = new Date(date);
        const dayLabel = d.toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
          weekday: "short",
        });

        const row = document.createElement("div");
        row.className = "weekly-row";
        row.innerHTML = `
        <span class="weekly-day">${dayLabel}</span>
        <span class="weekly-icon">${emoji}</span>
        <span class="weekly-desc">${midItem.weather[0].description}</span>
        <span class="weekly-temp">
          <span class="weekly-max">${maxTemp}°</span>
          <span class="weekly-min">${minTemp}°</span>
        </span>
      `;
        container.appendChild(row);
      });
  } catch (e) {
    console.warn("1주일 예보 로딩 실패", e);
  }
}

// ===== 즐겨찾기 도시 사이드바 =====
async function loadFavoriteCities() {
  const container = document.getElementById("favoriteCitiesBody");

  // map.js와 동일한 localStorage key 사용
  const saved = localStorage.getItem("favorites");
  const favorites = saved ? JSON.parse(saved) : [];

  if (favorites.length === 0) {
    container.innerHTML = `
      <p style="font-size:0.85rem; color:var(--color-text-sub); text-align:center; padding: 8px 0">
        즐겨찾기한 도시가 없어요<br/>
        <a href="map.html" style="color:var(--color-sky)">날씨 지도</a>에서 추가해보세요
      </p>
    `;
    return;
  }

  container.innerHTML = "";

  for (const city of favorites) {
    try {
      const data = await getCurrentWeatherByCoords(city.lat, city.lon); // api.js
      const temp = roundTemp(data.main.temp);
      const emoji = getWeatherEmoji(data.weather[0].main); // utils.js

      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <span class="label">${emoji} ${city.ko}</span>
        <span class="value highlight-sunset">${temp}°C</span>
      `;
      container.appendChild(row);
    } catch (e) {
      console.warn(`${city.ko} 즐겨찾기 날씨 로딩 실패`, e);
    }
  }
}

// ===== 실시간 날씨 트랜드 =====
function initCurrentTrend(weatherData) {
  let temp = ""
  let humi = ""
  let cloud = ""
  let visi = ""
  if (weatherData.main.temp < 5){
    temp = "#히터없나요"
  } else if (weatherData.main.temp > 35) {
    temp = "#열사병걸릴는중"
  }
  if (temp !== ""){
    trendHTML = `<div class="list-row"><span class="label">${temp}</span></div>`
  }

  if (weatherData.main.humidity > 80) {
    humi = "#목용탕같은날씨"
    trendHTML += `<div class="list-row"><span class="label">${humi}</span></div>`
  }

  if (weatherData.clouds.all > 80) {
    cloud = "#태양퇴근함"
    trendHTML += `<div class="list-row"><span class="label">${cloud}</span></div>`
  }

  if (weatherData.visibility < 1000) {
    visi = "#앞이안보여"
    trendHTML += `<div class="list-row"><span class="label">${visi}</span></div>`
  }


  const trend_content = document.querySelector("#sidebar-right .card .card-body").innerHTML = trendHTML;
}

// ===== 메인 초기화 =====
async function initCurrentWeather() {
  let lat, lon;

  try {
    const position = await getCurrentLocation(); // utils.js
    lat = position.coords.latitude;
    lon = position.coords.longitude;
  } catch {
    // 위치 차단 또는 미지원 → 서울 기본값
    lat = 37.5665;
    lon = 126.978;
    currentLocationEl.textContent = "위치 정보 없음 (서울 기준)";
  }

  try {
    const weatherData = await getCurrentWeatherByCoords(lat, lon); // api.js
    updateWeatherUI(weatherData);

    // 각 기능 초기화 (병렬 실행)
    initHourlyChart(lat, lon);
    initAirQuality(lat, lon);
    initYesterdayCompare(lat, lon, weatherData);
    initWeeklyForecast(lat, lon);
    loadFavoriteCities();
    initCurrentTrend(weatherData);
  } catch (error) {
    currentLocationEl.textContent = "날씨 정보를 불러오지 못했습니다.";
    console.error("날씨 API 호출 실패", error);
  }
}

// ===== 검색창 =====
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  if (keyword.length < 1) return;
  const results = searchCityByKorean(keyword); // cities.js
  if (results.length > 0) {
    // TODO: 자동완성 드롭다운 구현 (map.js 참고)
    console.log("검색 결과", results);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initCurrentWeather();
});
