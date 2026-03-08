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
// ===== 날씨 UI 업데이트 =====
function updateWeatherUI(data) {
  // 1. 도시 이름 한글 변환 (cities.js 데이터와 좌표 비교)
  let cityName = data.name;
  if (typeof CITIES !== "undefined") {
    const localCity = CITIES.find(
      (c) =>
        c.en.toLowerCase() === data.name.toLowerCase() ||
        (Math.abs(c.lat - data.coord.lat) < 0.05 &&
          Math.abs(c.lon - data.coord.lon) < 0.05),
    );
    if (localCity) {
      cityName = localCity.ko; // 한국 도시명으로 덮어쓰기
    }
  }

  // 2. OpenWeatherMap의 어색한 기계 번역 다듬기
  let description = data.weather[0].description;
  const descMap = {
    온흐림: "흐림",
    "실약한 비": "이슬비",
    튼구름: "구름 많음",
    "약한 비": "가벼운 비",
  };
  // 딕셔너리에 매핑된 단어가 있으면 덮어쓰고, 없으면 원래 API 단어 사용
  description = descMap[description] || description;

  const temp = roundTemp(data.main.temp);
  const weatherMain = data.weather[0].main;
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
  let temp = "";
  let humi = "";
  let cloud = "";
  let visi = "";
  let trendHTML = "";
  if (weatherData.main.temp < 5) {
    temp = "#히터없나요";
  } else if (weatherData.main.temp > 35) {
    temp = "#열사병걸릴는중";
  }
  if (temp !== "") {
    trendHTML = `<div class="list-row"><span class="label">${temp}</span></div>`;
  }

  if (weatherData.main.humidity > 80) {
    humi = "#목용탕같은날씨";
    trendHTML += `<div class="list-row"><span class="label">${humi}</span></div>`;
  }

  if (weatherData.clouds.all > 80) {
    cloud = "#태양퇴근함";
    trendHTML += `<div class="list-row"><span class="label">${cloud}</span></div>`;
  }

  if (weatherData.visibility < 1000) {
    visi = "#앞이안보여";
    trendHTML += `<div class="list-row"><span class="label">${visi}</span></div>`;
  }

  const trend_content = (document.querySelector(
    "#sidebar-right .card .card-body",
  ).innerHTML = trendHTML);
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

// ===== 검색창 (한글 자동완성 + 영문 글로벌 검색 하이브리드) =====
const searchInput = document.getElementById("searchInput");
const searchWrapper = searchInput.parentElement;
searchWrapper.style.position = "relative";

// 1. 드롭다운 UI 생성
const searchDropdown = document.createElement("ul");
searchDropdown.style.cssText =
  "position: absolute; top: 100%; left: 0; width: 100%; background: white; border: 1px solid var(--border); border-radius: 8px; list-style: none; padding: 0; margin-top: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
searchWrapper.appendChild(searchDropdown);

// 2. 공통 날씨 업데이트 함수 (위도, 경도 기반)
async function updateDashboardByCoords(lat, lon) {
  try {
    forecastCache = null; // 새 도시 데이터 로딩을 위해 캐시 비우기
    const weatherData = await getCurrentWeatherByCoords(lat, lon);

    updateWeatherUI(weatherData);
    await initHourlyChart(lat, lon);
    initAirQuality(lat, lon);
    initYesterdayCompare(lat, lon, weatherData);
    initWeeklyForecast(lat, lon);
    initCurrentTrend(weatherData);
  } catch (error) {
    console.error(error);
    alert("날씨 정보를 불러오지 못했습니다.");
  }
}

// 3. 글로벌 영문 도시 검색 함수 (OpenWeather API 호출)
async function searchGlobalCity(cityName) {
  try {
    // api.js에 정의된 도시명 검색 함수 사용
    const weatherData = await getCurrentWeather(cityName);

    // API가 해당 도시를 찾지 못한 경우 (404 Not Found)
    if (weatherData.cod && weatherData.cod !== 200) {
      alert(
        "도시를 찾을 수 없습니다. 정확한 영문 도시명(예: Paris, London)을 입력해주세요.",
      );
      return;
    }

    // 성공적으로 찾았다면 해당 도시의 위도/경도를 추출해서 대시보드 업데이트
    const lat = weatherData.coord.lat;
    const lon = weatherData.coord.lon;

    updateDashboardByCoords(lat, lon);
  } catch (error) {
    console.error(error);
    alert("글로벌 도시 검색 중 오류가 발생했습니다.");
  }
}

// 4. 입력 시 자동완성 및 글로벌 검색 안내
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.trim();
  if (keyword.length < 1) {
    searchDropdown.style.display = "none";
    return;
  }

  const results = searchCityByKorean(keyword); // cities.js 로컬 검색
  searchDropdown.innerHTML = "";

  if (results.length > 0) {
    // 한글 도시 검색 결과가 있을 때
    results.forEach((city) => {
      const li = document.createElement("li");
      li.textContent = city.ko;
      li.style.cssText =
        "padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; transition: background 0.2s;";

      li.addEventListener(
        "mouseenter",
        () => (li.style.backgroundColor = "#f8fafc"),
      );
      li.addEventListener(
        "mouseleave",
        () => (li.style.backgroundColor = "transparent"),
      );

      li.addEventListener("click", () => {
        searchInput.value = city.ko;
        searchDropdown.style.display = "none";
        updateDashboardByCoords(city.lat, city.lon);
      });

      searchDropdown.appendChild(li);
    });
  } else {
    // 검색 결과가 없으면 영문 글로벌 검색 버튼 표시
    const li = document.createElement("li");
    li.innerHTML = `<i class="fa-solid fa-globe"></i> <b>'${keyword}'</b> 전 세계 영문 검색 (클릭 또는 Enter)`;
    li.style.cssText =
      "padding: 10px 15px; cursor: pointer; color: var(--sky); font-size: 0.9rem; transition: background 0.2s;";

    li.addEventListener(
      "mouseenter",
      () => (li.style.backgroundColor = "#f8fafc"),
    );
    li.addEventListener(
      "mouseleave",
      () => (li.style.backgroundColor = "transparent"),
    );

    li.addEventListener("click", () => {
      searchDropdown.style.display = "none";
      searchGlobalCity(keyword);
    });

    searchDropdown.appendChild(li);
  }

  searchDropdown.style.display = "block";
});

// 5. Enter 키 입력 시 검색 실행
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) return;

    searchDropdown.style.display = "none";

    // 1순위: 로컬 한글 도시와 정확히 일치하는지 확인
    const localMatch = searchCityByKorean(keyword).find(
      (c) => c.ko === keyword,
    );
    if (localMatch) {
      updateDashboardByCoords(localMatch.lat, localMatch.lon);
    } else {
      // 2순위: 일치하는 한글 도시가 없으면 영문 API 검색 시도
      searchGlobalCity(keyword);
    }
  }
});

// 외부 클릭 시 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (!searchWrapper.contains(e.target)) {
    searchDropdown.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initCurrentWeather();
});
