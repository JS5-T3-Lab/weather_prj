
/************************************************************
 * Travel Weather Planner (MVP)
 * - Uses OpenWeather /data/2.5/forecast ONLY (3-hour steps)
 * - English UI
 * - Activity & Destination are dropdown selects (3 options each)
 * - Calendar view (weeks)
 * - Click a date header -> popup modal shows a 3-hour forecast TABLE
 ************************************************************/

/* =========================
   0) API Settings
   ========================= */
const API_KEY = CONFIG.API_KEY;

// Units for temperature etc. (metric = Celsius)
const UNITS = "metric";

// Response language for weather descriptions (en = English)
const LANG = "en";

/* =========================
   1) Dropdown choices (3 each)
   ========================= */

// Activity list (3 choices as requested)
const ACTIVITIES = ["Fishing", "Hiking", "Running"];

// Destination list (3 choices as requested)
const DESTINATIONS = ["Seoul", "Osaka", "Jeju"];

/* =========================
   2) Activity -> which metrics to show in the calendar summary
   Because /forecast is 3-hour list, we build "daily summary" ourselves.
   ========================= */

const ACTIVITY_FIELD_MAP = {
  Fishing: ["tempMaxMin","popMax","precipSum","windMax","windGustMax","humidityAvg","cloudsAvg"],
  Hiking:  ["tempMaxMin","feelsLikeAvg","popMax","precipSum","windMax","humidityAvg","cloudsAvg"],
  Running: ["tempMaxMin","feelsLikeAvg","popMax","windMax","humidityAvg"]
};

// Labels shown in calendar table (left column)
const FIELD_LABELS = {
  tempMaxMin: "Temp (max/min)",
  feelsLikeAvg: "Feels like (avg)",
  popMax: "Precip prob (max)",
  precipSum: "Precip (sum)",
  windMax: "Wind (max)",
  windGustMax: "Gust (max)",
  humidityAvg: "Humidity (avg)",
  cloudsAvg: "Clouds (avg)"
};

/* =========================
   3) DOM elements (HTML 연결)
   - We grab elements by id so we can read inputs and write results.
   ========================= */

const $form = document.getElementById("search-form"); // 폼전체(Submit event)
const $activitySelect = document.getElementById("activity-select"); 
const $destinationSelect = document.getElementById("destination-select"); // ������ select
const $checkin = document.getElementById("checkin-input"); 
const $checkout = document.getElementById("checkout-input"); 
const $message = document.getElementById("message-area"); // 에러/안내msg
const $loading = document.getElementById("loading"); // 로딩표시박스
const $results = document.getElementById("results"); // 주별 결과캘린더들어갈곳
const $meta = document.getElementById("result-meta"); // 결과상단 메타표시
const $reset = document.getElementById("reset-btn"); // Reset 버튼

// Modal(팝업) 관련 DOM
const $modal = document.getElementById("hourly-modal"); // 모달전체
const $modalClose = document.getElementById("modal-close"); // 모달닫기버튼
const $modalTitle = document.getElementById("modal-title"); // 모달제목텍스트
const $modalSubtitle = document.getElementById("modal-subtitle"); 
const $hourlyTableWrap = document.getElementById("hourly-list"); 

if (!$form || !$activitySelect || !$destinationSelect || !$checkin || !$checkout || !$message || !$loading || !$results || !$meta || !$reset || !$modal || !$modalClose || !$modalTitle || !$modalSubtitle || !$hourlyTableWrap) {
  console.error("Required HTML element is missing. Check id names in travel.html.");
}

/* =========================
   4) Helper functions (자주쓰는 유틸)
   ========================= */

// 숫자를 두 자리 문자열로 (예: 4 -> "04")
function pad2(n){ return String(n).padStart(2, "0"); }

// Date -> "YYYY-MM-DD"
function toDateKey(dateObj){
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth()+1);
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" -> Date 객체로 변환
function parseDateInput(val){
  if(!val) return null;
  const [y,m,d] = val.split("-").map(Number);
  return new Date(y, m-1, d);
}

// Date + days
function addDays(dateObj, days){
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

// 한주시작을 월요일로
function startOfWeekMonday(dateObj){
  const d = new Date(dateObj);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0) ? -6 : (1 - day); // Sunday면 -6해서 월요일로
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

// 한주의 끝(일요일)
function endOfWeekSunday(dateObj){
  const s = startOfWeekMonday(dateObj);
  return addDays(s, 6);
}

// 체크인~체크아웃 범위를 "주 단위 카드"로 만들기
function buildDateRangeWeeks(checkInDate, checkOutDate){
  const startWeek = startOfWeekMonday(checkInDate);
  const endWeek = startOfWeekMonday(checkOutDate);

  const weeks = [];
  let cursor = new Date(startWeek);

  while(cursor <= endWeek){
    const weekStart = new Date(cursor);
    const weekEnd = endOfWeekSunday(cursor);
    const days = [];
    for(let i=0; i<7; i++){
      days.push(addDays(weekStart, i));
    }
    weeks.push({ weekStart, weekEnd, days });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

// 값이 null/undefined면 "-" 표시, 숫자는 소수 1자리
function fmtNumber(val, unit=""){
  if(val === null || val === undefined || Number.isNaN(val)) return "-";
  const n = typeof val === "number" ? (Math.round(val*10)/10) : val;
  return `${n}${unit}`;
}

// 0~1 확률을 %로 (예: 0.3 -> 30%)
function fmtPercent01(pop){
  if(pop === null || pop === undefined) return "-";
  return `${Math.round(pop*100)}%`;
}

// unix seconds -> "HH:00"형태(로컬 타임)
function unixToHourLabel(unixSec){
  const d = new Date(unixSec * 1000);
  return `${pad2(d.getHours())}:00`;
}

// 로딩 박스 숨기기/보이기
function setLoading(on){
  $loading.classList.toggle("hidden", !on);
}

// 메시지 출력: ok/error 스타일 선택
function showMessage(type, text){
  if(!text){
    $message.innerHTML = "";
    return;
  }
  const cls = type === "error" ? "message error" : "message ok";
  $message.innerHTML = `<div class="${cls}">${text}</div>`;
}

/* =========================
   5) Validation (입력 값 검증)
   - /forecast is about 5 days, so we limit date range.
   ========================= */

// 선택 날짜가 "오늘~5일" 안에 있는지 검사
function isWithinForecastWindow(dateObj){
  const today = new Date();
  today.setHours(0,0,0,0);
  const max = addDays(today, 5); // 보수적으로 5일
  return (dateObj >= today) && (dateObj <= max);
}

// 폼 입력 검증: missing/invalid/date range
function validateInputs({ activity, destination, checkIn, checkOut }){
  // API_KEY 미설정이면 바로 실패
  // if(API_KEY === API_KEY || !API_KEY){
  //   return { ok: false, message: "Please set OPENWEATHER_API_KEY in js/config.js first." };
  // }
  // 활동 선택 여부
  if(!activity){
    return { ok:false, message:"Please select an activity." };
  }
  // 여행지 선택 여부
  if(!destination){
    return { ok:false, message:"Please select a destination." };
  }
  // 날짜 입력 여부
  if(!checkIn || !checkOut){
    return { ok:false, message:"Please select both check-in and check-out dates." };
  }
  // 체크아웃이 더 빠르면 실패
  if(checkOut < checkIn){
    return { ok:false, message:"Check-out must be after check-in." };
  }
  // /forecast 범위(5일) 밖이면 실패
  if(!isWithinForecastWindow(checkIn) || !isWithinForecastWindow(checkOut)){
    return { ok:false, message:"This MVP only supports the next ~5 days (/data/2.5/forecast). Please pick dates within 5 days from today." };
  }
  
  return { ok:true, message:"" };
}

/* =========================
   6) API call: OpenWeather /data/2.5/forecast
   ========================= */

// 도시명으로 /forecast 호출하는 함수
async function fetchForecastByCity(city){
  // API URL 만들기 (q=도시명)
  const url =
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}` +
    `&appid=${encodeURIComponent(API_KEY)}` +
    `&units=${encodeURIComponent(UNITS)}` +
    `&lang=${encodeURIComponent(LANG)}`;

  // fetch: 네트워크 요청
  const res = await fetch(url);

  // JSON 파싱
  const data = await res.json();

  // HTTP 오류(res.ok == false)일 때 에러 던짐
  if(!res.ok){
    const cod = data?.cod ?? res.status;
    const msg = data?.message ?? "Unknown error";
    throw new Error(`OpenWeather error (${cod}): ${msg}`);
  }

  //성공이면 데이터 리턴
  return data;
}

/* =========================
   7) Group forecast list[] by date
   - forecastData.list: 3-hour entries
   - We create dateMap:
     dateMap["YYYY-MM-DD"] = { items: [...], summary: {...} }
   ========================= */

// /forecast 데이터(list[])를 날짜별로 묶기
function groupForecastByDate(forecastData){
  const dateMap = {};
  const list = forecastData?.list || [];

  //  각 item은 3시간 단위 예보
  list.forEach(item => {
    const d = new Date(item.dt * 1000); // dt unix sec -> Date
    const key = toDateKey(d); // "YYYY-MM-DD"

    // key가 처음이면 빈 구조 생성
    dateMap[key] = dateMap[key] || { items: [], summary: null };

    // items 배열에 push
    dateMap[key].items.push(item);
  });

  // 날짜별 요약(summary) 만들기
  Object.keys(dateMap).forEach(key => {
    const items = dateMap[key].items;

    // 각 변수 배열 추출(값없으면 걸러내기)
    const temps = items.map(x => x?.main?.temp).filter(v => v !== null && v !== undefined);
    const feels = items.map(x => x?.main?.feels_like).filter(v => v !== null && v !== undefined);
    const pops  = items.map(x => x?.pop).filter(v => v !== null && v !== undefined);
    const humid = items.map(x => x?.main?.humidity).filter(v => v !== null && v !== undefined);
    const clouds= items.map(x => x?.clouds?.all).filter(v => v !== null && v !== undefined);
    const wind  = items.map(x => x?.wind?.speed).filter(v => v !== null && v !== undefined);
    const gust  = items.map(x => x?.wind?.gust).filter(v => v !== null && v !== undefined);

    // 강수량(3시간 누적) 합산: rain["3h"] + snow["3h"]
    const rain3h = items.map(x => x?.rain?.["3h"] ?? 0);
    const snow3h = items.map(x => x?.snow?.["3h"] ?? 0);
    const precipSum = rain3h.reduce((a,b)=>a+b,0) + snow3h.reduce((a,b)=>a+b,0);

    // summary 객체 만들기
    dateMap[key].summary = {
      tempMax: temps.length ? Math.max(...temps) : null,
      tempMin: temps.length ? Math.min(...temps) : null,
      feelsLikeAvg: feels.length ? (feels.reduce((a,b)=>a+b,0)/feels.length) : null,
      popMax: pops.length ? Math.max(...pops) : null,
      humidityAvg: humid.length ? (humid.reduce((a,b)=>a+b,0)/humid.length) : null,
      cloudsAvg: clouds.length ? (clouds.reduce((a,b)=>a+b,0)/clouds.length) : null,
      windMax: wind.length ? Math.max(...wind) : null,
      windGustMax: gust.length ? Math.max(...gust) : null,
      precipSum: precipSum
    };
  });

  return dateMap;
}

/* =========================
   8) Modal open/close
   ========================= */

// 모달 열기
function openModal(){
  $modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지
}

// 모달 닫기
function closeModal(){
  $modal.classList.add("hidden");
  document.body.style.overflow = "";
  $hourlyTableWrap.innerHTML = ""; // 이전 표 내용 제거
}

// 닫기 버튼 클릭 -> closeModal
$modalClose.addEventListener("click", closeModal);

// 배경(어두운 부분) 클릭  -> closeModal
$modal.addEventListener("click", (e) => {
  if(e.target && e.target.dataset && e.target.dataset.close === "true") closeModal();
});

// ESC  -> closeModal
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !$modal.classList.contains("hidden")) closeModal();
});

/* =========================
   9) Build TABLE inside modal (requested format)
   - Columns = time slots (3-hour)
   - Rows = variables
   ========================= */

// 시간 슬롯 배열 만들기: ["00:00", "03:00", ...] and also keep items
function buildTimeSlots(items){
    // items는 3시간 단위 예보 배열(그 날짜의)
  // 각 item에서 dt를 뽑아 HH:00로 변환

  return items.map(it => unixToHourLabel(it.dt));
}

// 특정 item에서 변수 값을 추출하는 작은 함수들(표의 셀 값)
function getCellValue(varKey, it){
  // varKey마다 표시할 값을 다르게 만든다
  switch(varKey){
    case "weather":
      // weather[0].main + description
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
      // 3h precipitation = rain["3h"] + snow["3h"]
      const rain = it?.rain?.["3h"] ?? 0;
      const snow = it?.snow?.["3h"] ?? 0;
      const total = rain + snow;
      return total > 0 ? fmtNumber(total, " mm/3h") : "-";
    }
    case "wind":
      return fmtNumber(it?.wind?.speed, " m/s");
    case "gust":
      return fmtNumber(it?.wind?.gust, " m/s");
    case "humidity":
      return fmtNumber(it?.main?.humidity, "%");
    case "clouds":
      return fmtNumber(it?.clouds?.all, "%");
    case "vis":
      return fmtNumber(it?.visibility, " m");
    default:
      return "-";
  }
}

// 모달 표를 그리는 핵심 함수
function render3HourTableModal({ cityName, dateKey, items }){
  // 모달 제목/서브타이틀 세팅
  $modalTitle.textContent = "3-hour forecast table";
  $modalSubtitle.textContent = `${cityName} ? ${dateKey} ? ${items.length} time slots`;

  // 표에서 보여줄 “행(변수)” 정의 (원하면 여기서 행을 더 추가/삭제)
  const rows = [
    { key: "weather", label: "Weather" },
    { key: "temp", label: "Temp" },
    { key: "feels", label: "Feels like" },
    { key: "pop", label: "POP" },
    { key: "precip3h", label: "Precip (3h)" },
    { key: "wind", label: "Wind" },
    { key: "gust", label: "Gust" },
    { key: "humidity", label: "Humidity" },
    { key: "clouds", label: "Clouds" },
    { key: "vis", label: "Visibility" },
  ];

  // columns: 시간 라벨
  const timeSlots = buildTimeSlots(items);

  // ---- HTML table 만들기 ----
  // thead: 첫 행은 "Variable" + 시간들
  const thead = `
    <thead>
      <tr>
        <th style="width:180px;">Time</th>
        ${timeSlots.map(t => `<th>${t}</th>`).join("")}
      </tr>
    </thead>
  `;

  // tbody: 각 row(변수)에 대해, 시간 슬롯마다 셀 생성
  const tbody = `
    <tbody>
      ${rows.map(r => `
        <tr>
          <td class="hourly-row-name">${r.label}</td>
          ${items.map(it => `<td>${getCellValue(r.key, it)}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;

  // 최종 table HTML
  const tableHTML = `
    <div class="hourly-table-wrap">
      <table class="hourly-table">
        ${thead}
        ${tbody}
      </table>
    </div>
  `;

  // 모달 안에 표 삽입
  $hourlyTableWrap.innerHTML = tableHTML;

  // 모달 열기
  openModal();
}

/* =========================
   10) Calendar summary (week table)
   ========================= */

// 1개 활동만 선택이므로, 활동에 맞는 field 목록 가져오기
function collectFieldsForActivity(activity){
  return ACTIVITY_FIELD_MAP[activity] || [];
}

// calendar 셀에 넣을 요약값 만들기
function getSummaryValue(fieldKey, summary){
  if(!summary) return "-";
  switch(fieldKey){
    case "tempMaxMin":
      return `${fmtNumber(summary.tempMax,"��C")} / ${fmtNumber(summary.tempMin,"��C")}`;
    case "feelsLikeAvg":
      return fmtNumber(summary.feelsLikeAvg,"��C");
    case "popMax":
      return fmtPercent01(summary.popMax);
    case "precipSum":
      return fmtNumber(summary.precipSum, " mm");
    case "windMax":
      return fmtNumber(summary.windMax, " m/s");
    case "windGustMax":
      return fmtNumber(summary.windGustMax, " m/s");
    case "humidityAvg":
      return fmtNumber(summary.humidityAvg, "%");
    case "cloudsAvg":
      return fmtNumber(summary.cloudsAvg, "%");
    default:
      return "-";
  }
}

// 상태 저장: 날짜 클릭 시 dateMap을 다시 쓰기 위해 저장해둠
let __state = {
  cityName: "",
  dateMap: null,
  checkInKey: "",
  checkOutKey: "",
  activity: ""
};

// 주별 캘린더를 렌더링하는 함수
function renderResults({ cityName, activity, checkIn, checkOut, dateMap }){
  //주 배열 만들기
  const weeks = buildDateRangeWeeks(checkIn, checkOut);

  //선택한 활동에 필요한 요약 필드 목록
  const fields = collectFieldsForActivity(activity);

  // 체크인/체크아웃 키
  const checkInKey = toDateKey(checkIn);
  const checkOutKey = toDateKey(checkOut);

  // 상태저장
  __state = { cityName, dateMap, checkInKey, checkOutKey, activity };

  // 상단메타정보표시
  $meta.textContent = `${cityName} ? ${checkInKey} �� ${checkOutKey} ? Activity: ${activity}`;

  // 결과 영역 비우기
  $results.innerHTML = "";

  // 각 주마다 카드 생성
  weeks.forEach((wk, index) => {
    const wkStartKey = toDateKey(wk.weekStart);
    const wkEndKey = toDateKey(wk.weekEnd);

    // 카드 div 생성
    const card = document.createElement("div");
    card.className = "week-card";

    // 카드 HTML 구성: header + table
    card.innerHTML = `
      <div class="week-header">
        <div>
          <div class="week-title">${wkStartKey} ~ ${wkEndKey} (Week)</div>
          <div class="week-sub">Week starts Monday ? Click a date header for the 3-hour table</div>
        </div>
        <div class="week-sub">#${index+1}</div>
      </div>

      <div class="table-wrap">
        <table class="calendar-table">
          <thead>
            <tr>
              <th style="width:180px;">Metric</th>
              ${wk.days.map(d => {
                const key = toDateKey(d);
                const inStay = (key >= checkInKey && key <= checkOutKey);
                const badge = inStay ? `<span class="badge">stay</span>` : "";
                const label = `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
                const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
                const hasData = !!dateMap[key]?.items?.length; // forecast�� ������ 1

                return `
                  <th
                    class="${inStay ? "cell-active" : "cell-muted"}"
                    data-datekey="${key}"
                    data-hasdata="${hasData ? "1" : "0"}"
                    style="cursor:pointer;"
                    title="${hasData ? "Click to open 3-hour table" : "No /forecast data"}"
                  >
                    <div class="cell-date">
                      <div class="date-top">
                        <span class="date-pill">${label} (${dow})</span>
                        ${badge}
                      </div>
                      <div class="week-sub">${key}</div>
                    </div>
                  </th>
                `;
              }).join("")}
            </tr>
          </thead>

          <tbody>
            ${fields.map(fieldKey => {
              return `
                <tr>
                  <td class="row-label">${FIELD_LABELS[fieldKey] || fieldKey}</td>
                  ${wk.days.map(d => {
                    const key = toDateKey(d);
                    const inStay = (key >= checkInKey && key <= checkOutKey);
                    const cellCls = inStay ? "cell-active" : "cell-muted";
                    const summary = dateMap[key]?.summary; // ��¥ ���?
                    const v = getSummaryValue(fieldKey, summary); // ���? ǥ��
                    return `<td class="${cellCls}"><span class="value">${v}</span></td>`;
                  }).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    // ⭐ 날짜 헤더 클릭 이벤트 연결 (모달 표 띄우기)
    card.querySelectorAll("th[data-datekey]").forEach(th => {
      th.addEventListener("click", () => {
        const dateKey = th.dataset.datekey; //클릭한 날짜
        const hasData = th.dataset.hasdata === "1"; // 데이터 있나?

        if(!hasData){
          showMessage("error", "No 3-hour forecast for this date (outside the 5-day window).");
          return;
        }

        const items = __state.dateMap?.[dateKey]?.items || []; //그 날짜 itemsitems
        render3HourTableModal({ cityName: __state.cityName, dateKey, items }); // 모달 표 렌더
      });
    });

    // 카드 화면에 추가
    $results.appendChild(card);
  });
}

/* =========================
   11) Form events (submit / reset)
   ========================= */

// Search 버튼 클릭(폼 submit) 시 실행
$form.addEventListener("submit", async (e) => {
  e.preventDefault(); // 폼 기본 제출(페이지 리로드) 막기
  showMessage("", ""); // 메시지 초기화

  // 입력값 읽기
  const activity = $activitySelect.value;
  const destination = $destinationSelect.value;
  const checkIn = parseDateInput($checkin.value);
  const checkOut = parseDateInput($checkout.value);

  // 입력 검증
  const v = validateInputs({ activity, destination, checkIn, checkOut });
  if(!v.ok){
    showMessage("error", v.message);
    return;
  }

  // 결과 초기화
  $results.innerHTML = "";
  $meta.textContent = "";

  try{
    setLoading(true); // 로딩 표시 ON

    // API 요청
    const forecastData = await fetchForecastByCity(destination);

    setLoading(false); //로딩 표시  OFF

    // 응답에 city.name이 있으면 그걸 사용(없으면 destination 그대로)
    const cityName = forecastData?.city?.name ? forecastData.city.name : destination;

    // 날짜별로 묶기
    const dateMap = groupForecastByDate(forecastData);

    // 선택 기간 안에 데이터가 없는 날이 있는지 간단 체크
    let missing = 0;
    const cursor = new Date(checkIn);
    while(cursor <= checkOut){
      const k = toDateKey(cursor);
      if(!dateMap[k]?.items?.length) missing++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // 안내 메시지
    if(missing > 0){
      showMessage("error", `Some selected days have no /forecast data (${missing} day(s)). We'll show what is available.`);
    } else {
      showMessage("ok", "Forecast loaded. Click a date header to open the 3-hour table.");
    }

    // 캘린더 렌더
    renderResults({ cityName, activity, checkIn, checkOut, dateMap });

  } catch(err){
    console.error(err); // 개발자 콘솔에 에러 출력
    setLoading(false);
    showMessage("error", `Failed to load forecast. ${err.message}`); // 화면에 에러 출력
  }
});

// 어느 요소를 못 찾았는지 빨리 확인
if (!$form || !$activitySelect || !$destinationSelect || !$checkin || !$checkout || !$message || !$loading || !$results || !$meta || !$reset || !$modal || !$modalClose || !$modalTitle || !$modalSubtitle || !$hourlyTableWrap) {
  console.error("Required HTML element is missing. Check id names in travel.html.");
}

// Reset 버튼 클릭 시 입력값/화면 초기화
$reset.addEventListener("click", () => {
  $activitySelect.value = "";
  $destinationSelect.value = "";
  $checkin.value = "";
  $checkout.value = "";

  showMessage("", "");
  $results.innerHTML = "";
  $meta.textContent = "";
});
