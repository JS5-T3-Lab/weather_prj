/* =========================
   0) API Settings
   ========================= */

const UNITS = "metric"; // 섭씨 온도
const LANG = "en"; // API 응답 언어

/* =========================
   1) 도시 목록 (cities.js의 CITIES 배열과 동일하게 맞춤)
   - HTML select의 value = en (API 검색용)
   - HTML select의 표시 텍스트 = ko (팀 통일 한글명)
   ========================= */
const CITY_LIST = [
  // 국내
  { ko: "서울", en: "Seoul" },
  { ko: "부산", en: "Busan" },
  { ko: "인천", en: "Incheon" },
  { ko: "대구", en: "Daegu" },
  { ko: "대전", en: "Daejeon" },
  { ko: "광주", en: "Gwangju" },
  { ko: "제주", en: "Jeju" },
  // 해외
  { ko: "도쿄", en: "Tokyo" },
  { ko: "뉴욕", en: "New York" },
  { ko: "런던", en: "London" },
  { ko: "파리", en: "Paris" },
  { ko: "방콕", en: "Bangkok" },
  { ko: "싱가포르", en: "Singapore" },
  { ko: "시드니", en: "Sydney" },
];

/* =========================
   2) 활동 → 표시 날씨 지표 매핑
   ========================= */
/* =========================
   활동별 표시 날씨 지표 매핑
   ※ /data/2.5/forecast 에서 실제 제공되는 필드만 사용
   ※ uvi·dew_point·sunrise/sunset·alerts 는 One Call API 전용이므로 제외
   ========================= */
const ACTIVITY_FIELD_MAP = {
  // 낚시: 풍속·돌풍·풍향 중요, 기온·기압·습도·구름·강수·가시거리
  Fishing: [
    "tempMaxMin",
    "feelsLikeAvg",
    "windMax",
    "windGustMax",
    "windDegAvg",
    "pressureAvg",
    "humidityAvg",
    "cloudsAvg",
    "popMax",
    "precipSum",
    "visAvg",
  ],

  // 등산/트레킹: 체감온도·습도·풍속·돌풍·가시거리·강수(비+눈)
  Hiking: [
    "tempMaxMin",
    "feelsLikeAvg",
    "humidityAvg",
    "windMax",
    "windGustMax",
    "visAvg",
    "popMax",
    "precipSum",
    "snowSum",
  ],

  // 조깅/러닝: 체감온도·습도·풍속·강수확률
  Running: [
    "tempMaxMin",
    "feelsLikeAvg",
    "humidityAvg",
    "windMax",
    "popMax",
    "precipSum",
  ],

  // 자전거 라이딩: 풍속·돌풍·풍향·가시거리·강수·기온·체감
  Cycling: [
    "tempMaxMin",
    "feelsLikeAvg",
    "windMax",
    "windGustMax",
    "windDegAvg",
    "visAvg",
    "popMax",
    "precipSum",
  ],

  // 야외수영/해수욕: 기온·체감·풍속·강수확률·구름
  Swimming: ["tempMaxMin", "feelsLikeAvg", "windMax", "popMax", "cloudsAvg"],

  // 캠핑/피크닉: 기온(최고/최저)·강수·풍속·습도·구름
  Camping: [
    "tempMaxMin",
    "feelsLikeAvg",
    "humidityAvg",
    "windMax",
    "cloudsAvg",
    "popMax",
    "precipSum",
  ],

  // 골프: 풍속·돌풍·강수확률·기온·체감·가시거리
  Golf: [
    "tempMaxMin",
    "feelsLikeAvg",
    "windMax",
    "windGustMax",
    "popMax",
    "precipSum",
    "visAvg",
  ],

  // 야외 구기 (축구·배구 등): 강수확률·풍속·기온·체감
  OutdoorSports: [
    "tempMaxMin",
    "feelsLikeAvg",
    "windMax",
    "popMax",
    "precipSum",
  ],

  // 반려견 산책: 기온·체감·강수확률·풍속
  DogWalk: ["tempMaxMin", "feelsLikeAvg", "popMax", "precipSum", "windMax"],

  // 야외 사진촬영: 구름·가시거리·강수확률
  Photography: ["cloudsAvg", "visAvg", "popMax", "precipSum", "tempMaxMin"],
};

/* 날씨 지표 키 → 한글 라벨 (map.html 팀 통일 기준) */
const FIELD_LABELS = {
  tempMaxMin: "기온 (최고/최저)",
  feelsLikeAvg: "체감온도 (평균)",
  humidityAvg: "습도 (평균)",
  pressureAvg: "기압 (평균)",
  windMax: "풍속 (최대)",
  windGustMax: "돌풍 (최대)",
  windDegAvg: "풍향 (평균°)",
  visAvg: "가시거리 (평균)",
  cloudsAvg: "구름 (평균)",
  popMax: "강수확률 (최대)",
  precipSum: "강수량 (합계)",
  snowSum: "적설량 (합계)",
};

/* 모달 3시간 예보 행 라벨 (한글) */
const HOURLY_ROW_LABELS = {
  weather: "날씨 상태",
  temp: "기온",
  feels: "체감온도",
  pop: "강수확률",
  precip3h: "강수량 (3h)",
  wind: "풍속",
  gust: "돌풍",
  windDeg: "풍향",
  humidity: "습도",
  pressure: "기압",
  clouds: "구름",
  vis: "가시거리",
};

/* =========================
   3) DOM 요소 연결
   ========================= */
const $form = document.getElementById("search-form");
const $activitySelect = document.getElementById("activity-select");
const $destinationSelect = document.getElementById("destination-select");
const $checkin = document.getElementById("checkin-input");
const $checkout = document.getElementById("checkout-input");
const $message = document.getElementById("message-area");
const $loading = document.getElementById("loading");
const $results = document.getElementById("results");
const $meta = document.getElementById("result-meta");
const $reset = document.getElementById("reset-btn");
const $modal = document.getElementById("hourly-modal");
const $modalClose = document.getElementById("modal-close");
const $modalTitle = document.getElementById("modal-title");
const $modalSubtitle = document.getElementById("modal-subtitle");
const $hourlyTableWrap = document.getElementById("hourly-list");

// Bootstrap Modal 인스턴스
const bsModal = new bootstrap.Modal($modal);

// DOM 누락 경고
if (
  !$form ||
  !$activitySelect ||
  !$destinationSelect ||
  !$checkin ||
  !$checkout ||
  !$message ||
  !$loading ||
  !$results ||
  !$meta ||
  !$reset ||
  !$modal ||
  !$modalTitle ||
  !$modalSubtitle ||
  !$hourlyTableWrap
) {
  console.error(
    "Required HTML element is missing. Check id names in travel.html.",
  );
}

/* =========================
   3-1) 도시 목록을 select에 동적으로 채우기
        (HTML option을 JS에서 생성 → 도시 추가/삭제가 CITY_LIST만 수정하면 됨)
   ========================= */
CITY_LIST.forEach((city) => {
  const opt = document.createElement("option");
  opt.value = city.en; // API 호출에 사용
  opt.textContent = city.ko; // 화면 표시 한글명
  $destinationSelect.appendChild(opt);
});

/* =========================
   4) Helper 유틸 함수
   ========================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Date → "YYYY-MM-DD"  (로컬 시간 기준)
function toDateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth() + 1);
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" → Date (로컬 자정)
function parseDateInput(val) {
  if (!val) return null;
  const [y, m, d] = val.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date + days
function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

// 주 시작 = 월요일
function startOfWeekMonday(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 주 끝 = 일요일
function endOfWeekSunday(dateObj) {
  return addDays(startOfWeekMonday(dateObj), 6);
}

// 체크인~체크아웃을 주 단위 배열로 변환
function buildDateRangeWeeks(checkInDate, checkOutDate) {
  const startWeek = startOfWeekMonday(checkInDate);
  const endWeek = startOfWeekMonday(checkOutDate);
  const weeks = [];
  let cursor = new Date(startWeek);
  while (cursor <= endWeek) {
    const weekStart = new Date(cursor);
    const weekEnd = endOfWeekSunday(cursor);
    const days = [];
    for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    weeks.push({ weekStart, weekEnd, days });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function fmtNumber(val, unit = "") {
  if (val === null || val === undefined || Number.isNaN(val)) return "-";
  const n = typeof val === "number" ? Math.round(val * 10) / 10 : val;
  return `${n}${unit}`;
}

function fmtPercent01(pop) {
  if (pop === null || pop === undefined) return "-";
  return `${Math.round(pop * 100)}%`;
}

// ✅ 수정 1) 날짜 버그 수정 - Unix timestamp를 로컬 시간대 기준으로 변환
// 기존: new Date(dt*1000) → UTC 기준으로 날짜 계산되어 한국(UTC+9)에서 날짜 밀림 발생
// 수정: dt_txt (API가 제공하는 로컬 시간 문자열) 사용
//       dt_txt 예시: "2025-03-07 09:00:00" → 앞 10자만 잘라서 날짜 키로 사용
function dtToLocalDateKey(item) {
  // dt_txt가 있으면 앞 10자(YYYY-MM-DD) 사용 → 서버 로컬 시간 기준
  if (item.dt_txt) return item.dt_txt.slice(0, 10);
  // 없으면 기존 방식 (로컬 브라우저 시간)
  return toDateKey(new Date(item.dt * 1000));
}

// Unix timestamp → "HH:00" (로컬 시간)
function unixToHourLabel(unixSec) {
  const d = new Date(unixSec * 1000);
  return `${pad2(d.getHours())}:00`;
}

// 로딩 표시 토글
function setLoading(on) {
  $loading.classList.toggle("d-none", !on);
}

// 메시지 표시
function showMessage(type, text) {
  if (!text) {
    $message.innerHTML = "";
    return;
  }
  const cls = type === "error" ? "message error" : "message ok";
  $message.innerHTML = `<div class="${cls}">${text}</div>`;
}

/* =========================
   5) 입력값 검증
   ========================= */

// API가 실제로 제공하는 마지막 날짜를 반환 (동적 계산)
// /forecast 는 3시간×40슬롯 = 오늘~약 5~6일 후까지 제공
function getForecastLastDate(forecastData) {
  const list = forecastData?.list || [];
  if (!list.length) return null;
  const lastItem = list[list.length - 1];
  const key = dtToLocalDateKey(lastItem); // "YYYY-MM-DD"
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function validateInputs({ activity, destination, checkIn, checkOut }) {
  if (!API_KEY || API_KEY === "###") {
    return { ok: false, message: "js/config.js 에 API 키를 설정해주세요." };
  }
  if (!activity) {
    return { ok: false, message: "활동을 선택해주세요." };
  }
  if (!destination) {
    return { ok: false, message: "여행지를 선택해주세요." };
  }
  if (!checkIn || !checkOut) {
    return { ok: false, message: "체크인·체크아웃 날짜를 모두 입력해주세요." };
  }
  if (checkOut < checkIn) {
    return { ok: false, message: "체크아웃은 체크인 이후 날짜여야 합니다." };
  }

  // 과거 날짜 입력은 막되, 미래 범위 초과는 막지 않음
  // → API 응답 기준으로 데이터 있는 만큼만 표시하고 안내 메시지로 처리
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkIn < today) {
    return { ok: false, message: "체크인 날짜는 오늘 이후여야 합니다." };
  }

  return { ok: true, message: "" };
}

/* =========================
   6) OpenWeather API 호출
   ========================= */

async function fetchForecastByCity(city) {
  const url = `/api/proxy?path=forecast&q=${encodeURIComponent(city)}&units=metric&lang=kr`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const cod = data?.cod ?? res.status;
    const msg = data?.message ?? "Unknown error";
    throw new Error(`OpenWeather error (${cod}): ${msg}`);
  }
  return data;
}

/* =========================
   7) API 응답을 날짜별로 그루핑
   ========================= */

function groupForecastByDate(forecastData) {
  const dateMap = {};
  const list = forecastData?.list || [];

  // ✅ 수정 1 적용) dt_txt 기반으로 날짜 키 생성 → 시간대 오차 없음
  list.forEach((item) => {
    const key = dtToLocalDateKey(item);
    dateMap[key] = dateMap[key] || { items: [], summary: null };
    dateMap[key].items.push(item);
  });

  // 날짜별 일별 요약 계산
  Object.keys(dateMap).forEach((key) => {
    const items = dateMap[key].items;

    const temps = items.map((x) => x?.main?.temp).filter((v) => v != null);
    const feels = items
      .map((x) => x?.main?.feels_like)
      .filter((v) => v != null);
    const pops = items.map((x) => x?.pop).filter((v) => v != null);
    const humid = items.map((x) => x?.main?.humidity).filter((v) => v != null);
    const clouds = items.map((x) => x?.clouds?.all).filter((v) => v != null);
    const wind = items.map((x) => x?.wind?.speed).filter((v) => v != null);
    const gust = items.map((x) => x?.wind?.gust).filter((v) => v != null);

    const rain3h = items.map((x) => x?.rain?.["3h"] ?? 0);
    const snow3h = items.map((x) => x?.snow?.["3h"] ?? 0);
    const precipSum =
      rain3h.reduce((a, b) => a + b, 0) + snow3h.reduce((a, b) => a + b, 0);
    const snowSum = snow3h.reduce((a, b) => a + b, 0);

    // 기압·풍향·가시거리 추가 (첨부 매핑표 반영)
    const pressure = items
      .map((x) => x?.main?.pressure)
      .filter((v) => v != null);
    const windDeg = items.map((x) => x?.wind?.deg).filter((v) => v != null);
    const vis = items.map((x) => x?.visibility).filter((v) => v != null);

    dateMap[key].summary = {
      tempMax: temps.length ? Math.max(...temps) : null,
      tempMin: temps.length ? Math.min(...temps) : null,
      feelsLikeAvg: feels.length
        ? feels.reduce((a, b) => a + b, 0) / feels.length
        : null,
      popMax: pops.length ? Math.max(...pops) : null,
      humidityAvg: humid.length
        ? humid.reduce((a, b) => a + b, 0) / humid.length
        : null,
      pressureAvg: pressure.length
        ? pressure.reduce((a, b) => a + b, 0) / pressure.length
        : null,
      cloudsAvg: clouds.length
        ? clouds.reduce((a, b) => a + b, 0) / clouds.length
        : null,
      windMax: wind.length ? Math.max(...wind) : null,
      windGustMax: gust.length ? Math.max(...gust) : null,
      windDegAvg: windDeg.length
        ? windDeg.reduce((a, b) => a + b, 0) / windDeg.length
        : null,
      visAvg: vis.length ? vis.reduce((a, b) => a + b, 0) / vis.length : null,
      precipSum,
      snowSum,
    };
  });

  return dateMap;
}

/* =========================
   8) 모달 열기/닫기
   ========================= */

function openModal() {
  bsModal.show();
}

function closeModal() {
  bsModal.hide();
  $hourlyTableWrap.innerHTML = "";
}

$modalClose.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* =========================
   9) 3시간 예보 테이블 (모달)
   ========================= */

function buildTimeSlots(items) {
  return items.map((it) => unixToHourLabel(it.dt));
}

function getCellValue(varKey, it) {
  switch (varKey) {
    case "weather":
      return it?.weather?.[0]
        ? `${it.weather[0].main}${it.weather[0].description ? ` (${it.weather[0].description})` : ""}`
        : "-";
    case "temp":
      return fmtNumber(it?.main?.temp, "°C");
    case "feels":
      return fmtNumber(it?.main?.feels_like, "°C");
    case "pop":
      return fmtPercent01(it?.pop);
    case "precip3h": {
      const rain = it?.rain?.["3h"] ?? 0;
      const snow = it?.snow?.["3h"] ?? 0;
      const total = rain + snow;
      return total > 0 ? fmtNumber(total, " mm/3h") : "-";
    }
    case "wind":
      return fmtNumber(it?.wind?.speed, " m/s");
    case "gust":
      return fmtNumber(it?.wind?.gust, " m/s");
    case "windDeg":
      return it?.wind?.deg != null ? `${it.wind.deg}°` : "-";
    case "humidity":
      return fmtNumber(it?.main?.humidity, "%");
    case "pressure":
      return fmtNumber(it?.main?.pressure, " hPa");
    case "clouds":
      return fmtNumber(it?.clouds?.all, "%");
    case "vis":
      return it?.visibility != null
        ? `${Math.round(it.visibility / 100) / 10} km`
        : "-";
    default:
      return "-";
  }
}

function render3HourTableModal({ cityName, dateKey, items }) {
  $modalTitle.textContent = "3시간 예보 상세";
  $modalSubtitle.textContent = `${cityName} · ${dateKey} · ${items.length}개 시간대`;

  const rows = [
    { key: "weather", label: HOURLY_ROW_LABELS.weather },
    { key: "temp", label: HOURLY_ROW_LABELS.temp },
    { key: "feels", label: HOURLY_ROW_LABELS.feels },
    { key: "pop", label: HOURLY_ROW_LABELS.pop },
    { key: "precip3h", label: HOURLY_ROW_LABELS.precip3h },
    { key: "wind", label: HOURLY_ROW_LABELS.wind },
    { key: "gust", label: HOURLY_ROW_LABELS.gust },
    { key: "windDeg", label: HOURLY_ROW_LABELS.windDeg },
    { key: "humidity", label: HOURLY_ROW_LABELS.humidity },
    { key: "pressure", label: HOURLY_ROW_LABELS.pressure },
    { key: "clouds", label: HOURLY_ROW_LABELS.clouds },
    { key: "vis", label: HOURLY_ROW_LABELS.vis },
  ];

  const timeSlots = buildTimeSlots(items);

  const thead = `
    <thead>
      <tr>
        <th style="width:120px;">구분</th>
        ${timeSlots.map((t) => `<th>${t}</th>`).join("")}
      </tr>
    </thead>`;

  const tbody = `
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td class="hourly-row-name">${r.label}</td>
          ${items.map((it) => `<td>${getCellValue(r.key, it)}</td>`).join("")}
        </tr>
      `,
        )
        .join("")}
    </tbody>`;

  $hourlyTableWrap.innerHTML = `
    <table class="hourly-table">
      ${thead}${tbody}
    </table>`;

  openModal();
}

/* =========================
   10) 주별 캘린더 렌더링
   ========================= */

function collectFieldsForActivity(activity) {
  return ACTIVITY_FIELD_MAP[activity] || [];
}

function getSummaryValue(fieldKey, summary) {
  if (!summary) return "-";
  switch (fieldKey) {
    case "tempMaxMin":
      return `${fmtNumber(summary.tempMax, "°C")} / ${fmtNumber(summary.tempMin, "°C")}`;
    case "feelsLikeAvg":
      return fmtNumber(summary.feelsLikeAvg, "°C");
    case "popMax":
      return fmtPercent01(summary.popMax);
    case "precipSum":
      return fmtNumber(summary.precipSum, " mm");
    case "snowSum":
      return summary.snowSum > 0 ? fmtNumber(summary.snowSum, " mm") : "-";
    case "windMax":
      return fmtNumber(summary.windMax, " m/s");
    case "windGustMax":
      return fmtNumber(summary.windGustMax, " m/s");
    case "windDegAvg":
      return summary.windDegAvg != null
        ? `${Math.round(summary.windDegAvg)}°`
        : "-";
    case "humidityAvg":
      return fmtNumber(summary.humidityAvg, "%");
    case "pressureAvg":
      return fmtNumber(summary.pressureAvg, " hPa");
    case "cloudsAvg":
      return fmtNumber(summary.cloudsAvg, "%");
    case "visAvg":
      return summary.visAvg != null
        ? `${Math.round(summary.visAvg / 100) / 10} km`
        : "-";
    default:
      return "-";
  }
}

let __state = {
  cityName: "",
  dateMap: null,
  checkInKey: "",
  checkOutKey: "",
  activity: "",
};

// ✅ 수정 4) 요일별 배경색 정의
// 화(Tue)·목(Thu)·토(Sat) = 옅은 베이지
// 날짜 헤더 행 = 하늘색 계열, 인덱스(변수명) 열 = 회색 계열
const DOW_STRIPE = {
  Tue: "#fdf6ec", // 화요일 - 옅은 베이지
  Thu: "#fdf6ec", // 목요일 - 옅은 베이지
  Sat: "#f0f7fd", // 토요일 - 옅은 파란색
};

function renderResults({ cityName, activity, checkIn, checkOut, dateMap }) {
  const weeks = buildDateRangeWeeks(checkIn, checkOut);
  const fields = collectFieldsForActivity(activity);
  const checkInKey = toDateKey(checkIn);
  const checkOutKey = toDateKey(checkOut);

  __state = { cityName, dateMap, checkInKey, checkOutKey, activity };

  // 상단 메타 정보
  $meta.textContent = `${cityName} · ${checkInKey} → ${checkOutKey} · ${activity}`;

  $results.innerHTML = "";

  const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  weeks.forEach((wk, index) => {
    const wkStartKey = toDateKey(wk.weekStart);
    const wkEndKey = toDateKey(wk.weekEnd);

    const card = document.createElement("div");
    card.className = "week-card";

    card.innerHTML = `
      <div class="week-header">
        <div>
          <span class="week-title">${wkStartKey} ~ ${wkEndKey}</span>
          <span class="week-sub ms-2">· 날짜 클릭 시 3시간 상세 예보</span>
        </div>
        <span class="week-num">Week #${index + 1}</span>
      </div>

      <div class="table-wrap">
        <table class="calendar-table">
          <thead>
            <tr>
              <!-- ✅ 수정 4) 인덱스 열 헤더 배경색 -->
              <th class="col-index">날씨 지표</th>

              ${wk.days
                .map((d) => {
                  const key = toDateKey(d);
                  const dow = DOWS[d.getDay()];
                  const inStay = key >= checkInKey && key <= checkOutKey;
                  const badge = inStay ? `<span class="badge">체류</span>` : "";
                  const label = `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

                  // ✅ 수정 4) 요일별 줄무늬 배경 + 날짜 헤더 색
                  const stripeBg = DOW_STRIPE[dow] || "";
                  const hasData = !!dateMap[key]?.items?.length;

                  return `
                  <th
                    class="col-day ${inStay ? "cell-active" : "cell-muted"}"
                    data-datekey="${key}"
                    data-hasdata="${hasData ? "1" : "0"}"
                    data-dow="${dow}"
                    style="${stripeBg ? `background-color:${stripeBg} !important;` : ""}"
                    title="${hasData ? "클릭: 3시간 상세 예보" : "예보 데이터 없음"}"
                  >
                    <div class="cell-date">
                      <div class="date-top">
                        <span class="date-pill">${label} (${dow})</span>
                        ${badge}
                      </div>
                      <div class="date-key-sub">${key}</div>
                    </div>
                  </th>`;
                })
                .join("")}
            </tr>
          </thead>

          <tbody>
            ${fields
              .map(
                (fieldKey) => `
              <tr>
                <!-- ✅ 수정 2) 한글 변수명 표시 -->
                <td class="row-label col-index">${FIELD_LABELS[fieldKey] || fieldKey}</td>

                ${wk.days
                  .map((d) => {
                    const key = toDateKey(d);
                    const dow = DOWS[d.getDay()];
                    const inStay = key >= checkInKey && key <= checkOutKey;
                    const summary = dateMap[key]?.summary;
                    const v = getSummaryValue(fieldKey, summary);

                    // ✅ 수정 4) 데이터 셀에도 요일 줄무늬 배경 적용
                    const stripeBg = DOW_STRIPE[dow] || "";
                    const baseCls = inStay ? "cell-active" : "cell-muted";

                    return `<td
                    class="${baseCls}"
                    style="${stripeBg && !inStay ? `background-color:${stripeBg} !important;` : ""}"
                  ><span class="value">${v}</span></td>`;
                  })
                  .join("")}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>`;

    // 날짜 헤더 클릭 → 3시간 예보 모달
    card.querySelectorAll("th[data-datekey]").forEach((th) => {
      th.addEventListener("click", () => {
        const dateKey = th.dataset.datekey;
        const hasData = th.dataset.hasdata === "1";
        if (!hasData) {
          showMessage(
            "error",
            "이 날짜는 OpenWeather 예보 제공 범위를 벗어나 데이터가 없습니다.",
          );
          return;
        }
        const items = __state.dateMap?.[dateKey]?.items || [];
        render3HourTableModal({ cityName: __state.cityName, dateKey, items });
      });
    });

    $results.appendChild(card);
  });
}

/* =========================
   11) 우측 사이드바 활동 팁
   ========================= */

const ACTIVITY_TIPS = {
  Fishing: `
    <ul class="tips-list">
      <li>🎣 <b>풍속</b>: 5 m/s 이하 권장</li>
      <li>💨 <b>돌풍</b>: 8 m/s 이하 안전</li>
      <li>🌧️ <b>강수량</b>: 적을수록 좋음</li>
      <li>💧 <b>습도</b>: 60~80% 적합</li>
      <li>👁️ <b>가시거리</b>: 5 km 이상 권장</li>
      <li>☁️ <b>구름</b>: 흐린 날 입질 활발</li>
    </ul>`,
  Hiking: `
    <ul class="tips-list">
      <li>🌡️ <b>체감온도</b>: 10~20°C 최적</li>
      <li>💧 <b>습도</b>: 50~70% 쾌적</li>
      <li>💨 <b>풍속</b>: 8 m/s 이하 안전</li>
      <li>🌨️ <b>적설·강수</b>: 없을수록 좋음</li>
      <li>👁️ <b>가시거리</b>: 멀수록 좋음</li>
    </ul>`,
  Running: `
    <ul class="tips-list">
      <li>🏃 <b>체감온도</b>: 5~18°C 최적</li>
      <li>💧 <b>습도</b>: 40~60% 쾌적</li>
      <li>💨 <b>풍속</b>: 맞바람 주의</li>
      <li>☔ <b>강수확률</b>: 낮을수록 좋음</li>
    </ul>`,
  Cycling: `
    <ul class="tips-list">
      <li>💨 <b>풍속</b>: 5 m/s 이하 권장</li>
      <li>🌪️ <b>돌풍</b>: 특히 주의 필요</li>
      <li>🧭 <b>풍향</b>: 맞바람 방향 확인</li>
      <li>👁️ <b>가시거리</b>: 3 km 이상 권장</li>
      <li>☔ <b>강수확률</b>: 낮을수록 좋음</li>
    </ul>`,
  Swimming: `
    <ul class="tips-list">
      <li>🌡️ <b>기온</b>: 25°C 이상 권장</li>
      <li>🌊 <b>풍속</b>: 5 m/s 이하 안전</li>
      <li>☀️ <b>구름</b>: 맑을수록 좋음</li>
      <li>🌧️ <b>강수확률</b>: 10% 이하 권장</li>
    </ul>`,
  Camping: `
    <ul class="tips-list">
      <li>🌡️ <b>최저기온</b>: 10°C 이상 쾌적</li>
      <li>💧 <b>습도</b>: 70% 이하 권장</li>
      <li>💨 <b>풍속</b>: 강풍 시 텐트 주의</li>
      <li>☁️ <b>구름</b>: 별 관측 시 맑음 필요</li>
      <li>🌧️ <b>강수량</b>: 없을수록 좋음</li>
    </ul>`,
  Golf: `
    <ul class="tips-list">
      <li>💨 <b>풍속</b>: 4 m/s 이하 권장</li>
      <li>🌪️ <b>돌풍</b>: 비거리·방향에 영향</li>
      <li>🌧️ <b>강수확률</b>: 10% 이하 권장</li>
      <li>🌡️ <b>체감온도</b>: 10~25°C 쾌적</li>
      <li>👁️ <b>가시거리</b>: 그린 확인 필요</li>
    </ul>`,
  OutdoorSports: `
    <ul class="tips-list">
      <li>🌧️ <b>강수확률</b>: 10% 이하 권장</li>
      <li>💨 <b>풍속</b>: 강풍 시 경기 영향</li>
      <li>🌡️ <b>체감온도</b>: 15~25°C 최적</li>
      <li>☔ <b>강수량</b>: 미끄러운 노면 주의</li>
    </ul>`,
  DogWalk: `
    <ul class="tips-list">
      <li>🐾 <b>기온</b>: 5~25°C 쾌적</li>
      <li>🌡️ <b>체감온도</b>: 소형견 추위 취약</li>
      <li>🌧️ <b>강수확률</b>: 낮을수록 좋음</li>
      <li>💨 <b>풍속</b>: 소형견 강풍 주의</li>
    </ul>`,
  Photography: `
    <ul class="tips-list">
      <li>☁️ <b>구름</b>: 일출/일몰 시 적당한 구름 아름다움</li>
      <li>👁️ <b>가시거리</b>: 원경 촬영 시 10 km 이상</li>
      <li>🌧️ <b>강수확률</b>: 낮을수록 좋음</li>
      <li>🌡️ <b>기온</b>: 장비 결로 주의 (저온·고습)</li>
    </ul>`,
};

$activitySelect.addEventListener("change", () => {
  const tips = document.getElementById("activity-tips");
  const val = $activitySelect.value;
  tips.innerHTML =
    ACTIVITY_TIPS[val] || "활동을 선택하면 맞춤 날씨 안내가 표시됩니다.";
});

/* =========================
   12) 폼 이벤트 (submit / reset)
   ========================= */

$form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage("", "");

  const activity = $activitySelect.value;
  const destination = $destinationSelect.value;
  const checkIn = parseDateInput($checkin.value);
  const checkOut = parseDateInput($checkout.value);

  const v = validateInputs({ activity, destination, checkIn, checkOut });
  if (!v.ok) {
    showMessage("error", v.message);
    return;
  }

  $results.innerHTML = "";
  $meta.textContent = "";

  try {
    setLoading(true);
    const forecastData = await fetchForecastByCity(destination);
    setLoading(false);

    const cityName = forecastData?.city?.name || destination;
    const dateMap = groupForecastByDate(forecastData);

    // API가 실제로 제공하는 마지막 날짜 (동적 - 호출 시점마다 다름)
    const forecastLastDate = getForecastLastDate(forecastData);
    const forecastLastKey = forecastLastDate ? toDateKey(forecastLastDate) : "";

    // 선택한 체크아웃이 API 제공 범위를 초과하는지 확인
    const checkOutKey = toDateKey(checkOut);
    const isOverRange = forecastLastDate && checkOut > forecastLastDate;

    // 데이터 있는 날 / 없는 날 카운트
    let hasAny = 0;
    let missing = 0;
    const cursor = new Date(checkIn);
    while (cursor <= checkOut) {
      if (dateMap[toDateKey(cursor)]?.items?.length) hasAny++;
      else missing++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // 안내 메시지 조합
    if (hasAny === 0) {
      // 선택 기간 전체가 API 범위 밖 → 아무것도 없음
      showMessage(
        "error",
        `선택하신 기간(${toDateKey(checkIn)} ~ ${checkOutKey})에 예보 데이터가 없습니다. ` +
          `조회 가능한 마지막 날짜는 ${forecastLastKey} 입니다.`,
      );
      setLoading(false);
      return;
    } else if (isOverRange) {
      // 일부는 있고 일부는 범위 초과 → 있는 만큼 보여주고 안내
      showMessage(
        "error",
        `OpenWeather 예보는 최대 ${forecastLastKey}까지만 제공됩니다. ` +
          `그 이후(${missing}일)는 데이터 없이 표시됩니다. 날짜를 클릭하면 3시간 상세 예보를 볼 수 있습니다.`,
      );
    } else {
      showMessage(
        "ok",
        "예보 데이터를 불러왔습니다. 날짜를 클릭하면 3시간 상세 예보를 볼 수 있습니다.",
      );
    }

    renderResults({ cityName, activity, checkIn, checkOut, dateMap });
  } catch (err) {
    console.error(err);
    setLoading(false);
    showMessage("error", `예보 데이터를 불러오지 못했습니다: ${err.message}`);
  }
});

$reset.addEventListener("click", () => {
  $activitySelect.value = "";
  $destinationSelect.value = "";
  $checkin.value = "";
  $checkout.value = "";
  showMessage("", "");
  $results.innerHTML = "";
  $meta.textContent = "";
  document.getElementById("activity-tips").innerHTML =
    "활동을 선택하면 맞춤 날씨 안내가 표시됩니다.";
});

// 오늘 날짜를 min 값으로 설정 (과거 날짜 선택 방지)
const todayStr = toDateKey(new Date());
if ($checkin) $checkin.min = todayStr;
if ($checkout) $checkout.min = todayStr;
