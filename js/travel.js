/* =========================
   0) API Settings
   ========================= */

// [1] config.js에서 선언된 CONFIG 객체에서 API 키를 읽어옴
//     config.js가 먼저 로드되어야 하므로 HTML에서 script 순서 중요
const API_KEY = CONFIG.API_KEY;

// [2] 온도 단위: metric = 섭씨(°C). imperial이면 화씨
const UNITS = "metric";

// [3] API 응답 날씨 설명 언어: en = 영어
const LANG = "en";

/* =========================
   1) Dropdown choices
   ========================= */

// [4] 활동 목록 - HTML select의 option값과 반드시 일치해야 함
const ACTIVITIES   = ["Fishing", "Hiking", "Running"];

// [5] 여행지 목록 - OpenWeather API의 도시 검색명과 일치해야 함
const DESTINATIONS = ["Seoul", "Osaka", "Jeju"];

/* =========================
   2) Activity -> 표시할 날씨 지표 매핑
   ========================= */

// [6] 활동별로 캘린더에 표시할 날씨 항목 목록
//     키 = 활동명(HTML select value), 값 = 표시할 필드 키 배열
const ACTIVITY_FIELD_MAP = {
  Fishing: ["tempMaxMin","popMax","precipSum","windMax","windGustMax","humidityAvg","cloudsAvg"],
  Hiking:  ["tempMaxMin","feelsLikeAvg","popMax","precipSum","windMax","humidityAvg","cloudsAvg"],
  Running: ["tempMaxMin","feelsLikeAvg","popMax","windMax","humidityAvg"]
};

// [7] 필드 키 -> 한글/영문 라벨 매핑 (캘린더 왼쪽 열에 표시)
const FIELD_LABELS = {
  tempMaxMin:   "Temp (max/min)",
  feelsLikeAvg: "Feels like (avg)",
  popMax:       "Precip prob (max)",
  precipSum:    "Precip (sum)",
  windMax:      "Wind (max)",
  windGustMax:  "Gust (max)",
  humidityAvg:  "Humidity (avg)",
  cloudsAvg:    "Clouds (avg)"
};

/* =========================
   3) DOM 요소 연결
   ========================= */

// [8] 폼 전체 - submit 이벤트를 여기에 연결
const $form             = document.getElementById("search-form");

// [9] 활동 선택 드롭다운
const $activitySelect   = document.getElementById("activity-select");

// [10] 목적지 선택 드롭다운
const $destinationSelect= document.getElementById("destination-select");

// [11] 체크인 날짜 input
const $checkin          = document.getElementById("checkin-input");

// [12] 체크아웃 날짜 input
const $checkout         = document.getElementById("checkout-input");

// [13] 에러/안내 메시지를 표시할 div
const $message          = document.getElementById("message-area");

// [14] 로딩 스피너 div (Bootstrap d-none 클래스로 숨김/표시)
const $loading          = document.getElementById("loading");

// [15] 주별 캘린더 카드들이 삽입될 컨테이너
const $results          = document.getElementById("results");

// [16] 결과 상단 메타정보 표시 (도시명·날짜·활동)
const $meta             = document.getElementById("result-meta");

// [17] Reset 버튼
const $reset            = document.getElementById("reset-btn");

// [18] 3시간 예보 모달 전체 div
const $modal            = document.getElementById("hourly-modal");

// [19] 모달 닫기 버튼 (Bootstrap의 data-bs-dismiss가 처리하지만 JS에서도 참조)
const $modalClose       = document.getElementById("modal-close");

// [20] 모달 제목 텍스트 영역
const $modalTitle       = document.getElementById("modal-title");

// [21] 모달 서브타이틀 (도시명·날짜·슬롯수)
const $modalSubtitle    = document.getElementById("modal-subtitle");

// [22] 모달 안에 3시간 예보 테이블이 삽입될 div
const $hourlyTableWrap  = document.getElementById("hourly-list");

// [23] Bootstrap Modal 인스턴스 생성 - show()/hide() 메서드로 모달 제어
//      Bootstrap JS가 로드된 이후에 실행되어야 함
const bsModal = new bootstrap.Modal($modal);

// [24] DOM 요소가 하나라도 없으면 콘솔에 경고 (디버깅용)
if (!$form || !$activitySelect || !$destinationSelect || !$checkin ||
    !$checkout || !$message || !$loading || !$results || !$meta ||
    !$reset || !$modal || !$modalTitle || !$modalSubtitle || !$hourlyTableWrap) {
  console.error("Required HTML element is missing. Check id names in travel.html.");
}

/* =========================
   4) Helper 유틸 함수
   ========================= */

// [25] 숫자를 두 자리 문자열로 변환 (예: 4 → "04")
function pad2(n){ return String(n).padStart(2, "0"); }

// [26] Date 객체를 "YYYY-MM-DD" 문자열로 변환
//      dateMap의 키로 사용되므로 형식이 정확해야 함
function toDateKey(dateObj){
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth()+1); // getMonth()는 0부터 시작이므로 +1
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

// [27] "YYYY-MM-DD" 문자열을 Date 객체로 변환
//      input[type=date]의 value가 이 형식이므로 파싱에 사용
function parseDateInput(val){
  if(!val) return null;
  const [y,m,d] = val.split("-").map(Number);
  return new Date(y, m-1, d); // 월은 0-based
}

// [28] Date에 days를 더한 새 Date 반환 (원본 객체는 변경 안 함)
function addDays(dateObj, days){
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

// [29] 주의 시작일을 월요일로 맞춤
//      getDay()는 0=일요일, 1=월요일... 이므로 차이 계산
function startOfWeekMonday(dateObj){
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : (1 - day); // 일요일이면 -6, 나머지는 1-day
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0); // 시간을 자정으로 초기화 (날짜 비교 오류 방지)
  return d;
}

// [30] 주의 끝(일요일) = 월요일 시작일 + 6일
function endOfWeekSunday(dateObj){
  const s = startOfWeekMonday(dateObj);
  return addDays(s, 6);
}

// [31] 체크인~체크아웃 범위를 "주 단위 배열"로 변환
//      각 원소 = { weekStart, weekEnd, days: [Date x 7] }
function buildDateRangeWeeks(checkInDate, checkOutDate){
  const startWeek = startOfWeekMonday(checkInDate);
  const endWeek   = startOfWeekMonday(checkOutDate);
  const weeks = [];
  let cursor = new Date(startWeek);
  while(cursor <= endWeek){
    const weekStart = new Date(cursor);
    const weekEnd   = endOfWeekSunday(cursor);
    const days = [];
    for(let i=0; i<7; i++) days.push(addDays(weekStart, i));
    weeks.push({ weekStart, weekEnd, days });
    cursor = addDays(cursor, 7); // 다음 주로 이동
  }
  return weeks;
}

// [32] 숫자 값을 소수 1자리로 포맷 + 단위 붙이기
//      null/undefined/NaN이면 "-" 반환
function fmtNumber(val, unit=""){
  if(val === null || val === undefined || Number.isNaN(val)) return "-";
  const n = typeof val === "number" ? (Math.round(val*10)/10) : val;
  return `${n}${unit}`;
}

// [33] 0~1 강수 확률을 % 문자열로 변환 (예: 0.3 → "30%")
function fmtPercent01(pop){
  if(pop === null || pop === undefined) return "-";
  return `${Math.round(pop*100)}%`;
}

// [34] Unix timestamp(초)를 "HH:00" 형태 로컬 시간 문자열로 변환
function unixToHourLabel(unixSec){
  const d = new Date(unixSec * 1000); // 밀리초로 변환
  return `${pad2(d.getHours())}:00`;
}

// [35] 로딩 스피너 표시/숨김
//      Bootstrap은 d-none 클래스로 숨김 처리
function setLoading(on){
  $loading.classList.toggle("d-none", !on);
}

// [36] 메시지 영역에 Bootstrap alert 스타일로 메시지 표시
//      type="error" → message-error(빨간), type="ok" → message-ok(녹색)
function showMessage(type, text){
  if(!text){ $message.innerHTML = ""; return; }
  const cls = type === "error" ? "message-error" : "message-ok";
  $message.innerHTML = `<div class="alert ${cls} py-2 small">${text}</div>`;
}

/* =========================
   5) 입력값 검증
   ========================= */

// [37] 날짜가 오늘~5일 이내인지 확인 (/forecast API는 최대 5일 제공)
function isWithinForecastWindow(dateObj){
  const today = new Date();
  today.setHours(0,0,0,0);
  const max = addDays(today, 5);
  return (dateObj >= today) && (dateObj <= max);
}

// [38] 폼 입력 전체 검증 함수
//      반환값: { ok: true/false, message: "오류설명" }
function validateInputs({ activity, destination, checkIn, checkOut }){

  // [39] API 키가 기본값(###)이거나 비어있으면 실패
  if(!API_KEY || API_KEY === '###'){
    return { ok:false, message:"js/config.js 에 API 키를 설정해주세요." };
  }

  // [40] 활동 미선택 시 실패
  if(!activity){
    return { ok:false, message:"활동을 선택해주세요." };
  }

  // [41] 목적지 미선택 시 실패
  if(!destination){
    return { ok:false, message:"여행지를 선택해주세요." };
  }

  // [42] 날짜 미입력 시 실패
  if(!checkIn || !checkOut){
    return { ok:false, message:"체크인·체크아웃 날짜를 모두 입력해주세요." };
  }

  // [43] 체크아웃이 체크인보다 빠를 때 실패
  if(checkOut < checkIn){
    return { ok:false, message:"체크아웃은 체크인 이후 날짜여야 합니다." };
  }

  // [44] OpenWeather /forecast 는 최대 5일 → 범위 초과 시 실패
  if(!isWithinForecastWindow(checkIn) || !isWithinForecastWindow(checkOut)){
    return { ok:false, message:"이 기능은 오늘부터 최대 5일 이내 날짜만 지원합니다." };
  }

  return { ok:true, message:"" };
}

/* =========================
   6) OpenWeather API 호출
   ========================= */

// [45] 도시명으로 /data/2.5/forecast 를 호출하고 JSON 반환
//      async/await 사용: 비동기 네트워크 요청을 동기처럼 작성
async function fetchForecastByCity(city){

  // [46] URL 조합: q=도시명, appid=API키, units=단위, lang=언어
  //      encodeURIComponent: URL에 특수문자가 있을 때 안전하게 인코딩
  const url =
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}` +
    `&appid=${encodeURIComponent(CONFIG.API_KEY)}` + // config.js의 키 직접 참조
    `&units=${encodeURIComponent(UNITS)}` +
    `&lang=${encodeURIComponent(LANG)}`;

  // [47] fetch: 브라우저 내장 HTTP 요청 함수
  const res  = await fetch(url);

  // [48] 응답 본문을 JSON으로 파싱
  const data = await res.json();

  // [49] HTTP 상태코드가 200번대가 아니면 에러 throw
  //      OpenWeather는 실패 시 cod(코드)와 message를 JSON으로 반환
  if(!res.ok){
    const cod = data?.cod ?? res.status;
    const msg = data?.message ?? "Unknown error";
    throw new Error(`OpenWeather error (${cod}): ${msg}`);
  }

  return data; // 성공 시 전체 forecast 데이터 반환
}

/* =========================
   7) API 응답을 날짜별로 그루핑
   ========================= */

// [50] forecastData.list (3시간 단위 배열)를 날짜별로 묶고 일별 요약 계산
function groupForecastByDate(forecastData){
  const dateMap = {};
  const list = forecastData?.list || [];

  // [51] 각 3시간 예보 항목을 날짜 키로 분류
  list.forEach(item => {
    const d   = new Date(item.dt * 1000); // Unix초 → Date
    const key = toDateKey(d);             // "YYYY-MM-DD"
    dateMap[key] = dateMap[key] || { items: [], summary: null };
    dateMap[key].items.push(item);
  });

  // [52] 날짜별로 일별 요약(최고/최저/평균 등) 계산
  Object.keys(dateMap).forEach(key => {
    const items = dateMap[key].items;

    // [53] 각 지표 배열 추출 (null/undefined 제거)
    const temps  = items.map(x => x?.main?.temp).filter(v => v != null);
    const feels  = items.map(x => x?.main?.feels_like).filter(v => v != null);
    const pops   = items.map(x => x?.pop).filter(v => v != null);
    const humid  = items.map(x => x?.main?.humidity).filter(v => v != null);
    const clouds = items.map(x => x?.clouds?.all).filter(v => v != null);
    const wind   = items.map(x => x?.wind?.speed).filter(v => v != null);
    const gust   = items.map(x => x?.wind?.gust).filter(v => v != null);

    // [54] 강수량 = rain["3h"] + snow["3h"] 합산 (없으면 0으로 처리)
    const rain3h    = items.map(x => x?.rain?.["3h"] ?? 0);
    const snow3h    = items.map(x => x?.snow?.["3h"] ?? 0);
    const precipSum = rain3h.reduce((a,b)=>a+b,0) + snow3h.reduce((a,b)=>a+b,0);

    // [55] 일별 요약 객체 저장
    dateMap[key].summary = {
      tempMax:      temps.length  ? Math.max(...temps)                    : null,
      tempMin:      temps.length  ? Math.min(...temps)                    : null,
      feelsLikeAvg: feels.length  ? feels.reduce((a,b)=>a+b,0)/feels.length : null,
      popMax:       pops.length   ? Math.max(...pops)                     : null,
      humidityAvg:  humid.length  ? humid.reduce((a,b)=>a+b,0)/humid.length : null,
      cloudsAvg:    clouds.length ? clouds.reduce((a,b)=>a+b,0)/clouds.length : null,
      windMax:      wind.length   ? Math.max(...wind)                     : null,
      windGustMax:  gust.length   ? Math.max(...gust)                     : null,
      precipSum
    };
  });

  return dateMap;
}

/* =========================
   8) Bootstrap Modal 열기/닫기
   ========================= */

// [56] Bootstrap Modal 인스턴스의 show() 메서드로 모달 열기
//      body 스크롤은 Bootstrap이 자동으로 막아줌
function openModal(){
  bsModal.show();
}

// [57] Bootstrap Modal 인스턴스의 hide() 메서드로 모달 닫기
function closeModal(){
  bsModal.hide();
  $hourlyTableWrap.innerHTML = ""; // 이전 표 내용 초기화
}

// [58] 모달 닫기 버튼 클릭 → closeModal (Bootstrap data-bs-dismiss와 병행)
$modalClose.addEventListener("click", closeModal);

// [59] ESC 키 입력 → 모달이 열려있으면 닫기
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeModal();
});

/* =========================
   9) 3시간 예보 테이블 생성 (모달 안)
   ========================= */

// [60] items 배열에서 각 시간 슬롯의 "HH:00" 라벨 배열 반환
function buildTimeSlots(items){
  return items.map(it => unixToHourLabel(it.dt));
}

// [61] 특정 예보 항목(it)에서 varKey에 해당하는 값 추출
//      switch/case로 각 날씨 항목별 다른 경로로 접근
function getCellValue(varKey, it){
  switch(varKey){
    case "weather":
      // 날씨 상태 (예: "Rain (light rain)")
      return it?.weather?.[0]
        ? `${it.weather[0].main}${it.weather[0].description ? ` (${it.weather[0].description})` : ""}`
        : "-";
    case "temp":     return fmtNumber(it?.main?.temp, "°C");
    case "feels":    return fmtNumber(it?.main?.feels_like, "°C");
    case "pop":      return fmtPercent01(it?.pop);
    case "precip3h": {
      // 3시간 강수량 = 비 + 눈
      const rain = it?.rain?.["3h"] ?? 0;
      const snow = it?.snow?.["3h"] ?? 0;
      const total = rain + snow;
      return total > 0 ? fmtNumber(total, " mm/3h") : "-";
    }
    case "wind":     return fmtNumber(it?.wind?.speed, " m/s");
    case "gust":     return fmtNumber(it?.wind?.gust,  " m/s");
    case "humidity": return fmtNumber(it?.main?.humidity, "%");
    case "clouds":   return fmtNumber(it?.clouds?.all, "%");
    case "vis":      return fmtNumber(it?.visibility, " m");
    default:         return "-";
  }
}

// [62] 모달 안에 3시간 예보 테이블을 생성하고 Bootstrap Modal을 열기
function render3HourTableModal({ cityName, dateKey, items }){

  // [63] 모달 제목/서브타이틀 업데이트
  $modalTitle.textContent    = "3-hour forecast table";
  $modalSubtitle.textContent = `${cityName} · ${dateKey} · ${items.length} time slots`;

  // [64] 표에 표시할 행(날씨 변수) 정의 배열
  const rows = [
    { key: "weather",  label: "Weather"      },
    { key: "temp",     label: "Temp"         },
    { key: "feels",    label: "Feels like"   },
    { key: "pop",      label: "POP"          },
    { key: "precip3h", label: "Precip (3h)"  },
    { key: "wind",     label: "Wind"         },
    { key: "gust",     label: "Gust"         },
    { key: "humidity", label: "Humidity"     },
    { key: "clouds",   label: "Clouds"       },
    { key: "vis",      label: "Visibility"   },
  ];

  // [65] 열 헤더 = 시간 라벨 배열
  const timeSlots = buildTimeSlots(items);

  // [66] Bootstrap table 클래스로 표 스타일 자동 적용
  //      table-bordered: 테두리, table-sm: 셀 패딩 축소, table-striped: 줄무늬
  const thead = `
    <thead class="sky-header">
      <tr>
        <th style="width:130px;">Variable</th>
        ${timeSlots.map(t => `<th>${t}</th>`).join("")}
      </tr>
    </thead>`;

  // [67] tbody: 각 날씨 변수(행) × 각 시간 슬롯(열) 조합으로 셀 값 생성
  const tbody = `
    <tbody>
      ${rows.map(r => `
        <tr>
          <td class="hourly-row-name">${r.label}</td>
          ${items.map(it => `<td>${getCellValue(r.key, it)}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>`;

  // [68] 완성된 테이블 HTML을 모달 컨테이너에 삽입
  $hourlyTableWrap.innerHTML = `
    <table class="hourly-table">
      ${thead}${tbody}
    </table>`;

  // [69] Bootstrap Modal API로 모달 표시
  openModal();
}

/* =========================
   10) 주별 캘린더 렌더링
   ========================= */

// [70] 활동에 맞는 표시 필드 목록 반환
function collectFieldsForActivity(activity){
  return ACTIVITY_FIELD_MAP[activity] || [];
}

// [71] 일별 요약(summary)에서 필드 키에 해당하는 값을 포맷하여 반환
function getSummaryValue(fieldKey, summary){
  if(!summary) return "-";
  switch(fieldKey){
    case "tempMaxMin":   return `${fmtNumber(summary.tempMax,"°C")} / ${fmtNumber(summary.tempMin,"°C")}`;
    case "feelsLikeAvg": return fmtNumber(summary.feelsLikeAvg,"°C");
    case "popMax":       return fmtPercent01(summary.popMax);
    case "precipSum":    return fmtNumber(summary.precipSum, " mm");
    case "windMax":      return fmtNumber(summary.windMax, " m/s");
    case "windGustMax":  return fmtNumber(summary.windGustMax, " m/s");
    case "humidityAvg":  return fmtNumber(summary.humidityAvg, "%");
    case "cloudsAvg":    return fmtNumber(summary.cloudsAvg, "%");
    default:             return "-";
  }
}

// [72] 전역 상태 저장 객체
//      날짜 헤더 클릭 시 dateMap을 다시 참조하기 위해 저장
let __state = { cityName: "", dateMap: null, checkInKey: "", checkOutKey: "", activity: "" };

// [73] 주별 캘린더 전체를 렌더링하는 핵심 함수
function renderResults({ cityName, activity, checkIn, checkOut, dateMap }){

  // [74] 체크인~체크아웃을 포함하는 주(week) 배열 생성
  const weeks = buildDateRangeWeeks(checkIn, checkOut);

  // [75] 선택된 활동의 표시 필드 목록
  const fields = collectFieldsForActivity(activity);

  const checkInKey  = toDateKey(checkIn);
  const checkOutKey = toDateKey(checkOut);

  // [76] 상태 저장 (날짜 클릭 이벤트에서 재사용)
  __state = { cityName, dateMap, checkInKey, checkOutKey, activity };

  // [77] 상단 메타 정보 표시 (Bootstrap badge 스타일)
  $meta.innerHTML = `
    <span class="badge-stay me-1">${cityName}</span>
    <span class="me-1" style="font-size:0.82rem; color:var(--color-text-sub)">${checkInKey} → ${checkOutKey}</span>
    <span class="me-1" style="font-size:0.82rem; color:var(--color-text-sub)">${activity}</span>`;

  // [78] 기존 결과 영역 초기화
  $results.innerHTML = "";

  // [79] 주(week)별로 카드 생성
  weeks.forEach((wk, index) => {
    const wkStartKey = toDateKey(wk.weekStart);
    const wkEndKey   = toDateKey(wk.weekEnd);

    // [80] 주 카드 div 생성
    const card = document.createElement("div");
    card.className = "week-card mb-3";

    // [81] 카드 내부 HTML 구성
    card.innerHTML = `

      <!-- [82] 카드 헤더: 주 날짜 범위 + 주 번호 표시 -->
      <div class="week-header">
        <div>
          <span class="fw-bold">${wkStartKey} ~ ${wkEndKey}</span>
          <small class="ms-2 opacity-75">· 날짜 헤더 클릭 시 3시간 상세 예보</small>
        </div>
        <span class="badge bg-light text-dark">Week #${index+1}</span>
      </div>

      <!-- [83] 캘린더 테이블 래퍼 (가로 스크롤 대응) -->
      <div class="table-wrap">
        <table class="calendar-table">
          <thead>
            <tr>
              <!-- [84] 왼쪽 고정 열 헤더 -->
              <th style="width:140px;">Metric</th>

              <!-- [85] 7일 날짜 헤더 생성 (map으로 반복) -->
              ${wk.days.map(d => {
                const key    = toDateKey(d);
                const inStay = (key >= checkInKey && key <= checkOutKey);

                // [86] 여행 기간 내 날짜에 Bootstrap badge "stay" 표시
                const badge  = inStay
                  ? `<span class="badge-stay">stay</span>`
                  : "";

                const label  = `${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
                const dow    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];

                // [87] 이 날짜에 API 데이터가 있는지 확인
                const hasData = !!dateMap[key]?.items?.length;

                return `
                  <th
                    class="${inStay ? "cell-active" : "cell-muted"}"
                    data-datekey="${key}"
                    data-hasdata="${hasData ? "1" : "0"}"
                    style="cursor:pointer;"
                    title="${hasData ? "클릭: 3시간 상세 예보" : "예보 데이터 없음"}"
                  >
                    <div class="cell-date">
                      <div class="date-top">
                        <!-- [88] 날짜 표시 pill -->
                        <span class="date-pill">${label} (${dow})</span>
                        ${badge}
                      </div>
                      <!-- [89] YYYY-MM-DD 작은 글씨로 표시 -->
                      <div style="font-size:0.68rem; color:#94a3b8;">${key}</div>
                    </div>
                  </th>`;
              }).join("")}
            </tr>
          </thead>

          <tbody>
            <!-- [90] 활동별 필드 행 생성 -->
            ${fields.map(fieldKey => `
              <tr>
                <td class="row-label">${FIELD_LABELS[fieldKey] || fieldKey}</td>
                ${wk.days.map(d => {
                  const key     = toDateKey(d);
                  const inStay  = (key >= checkInKey && key <= checkOutKey);
                  const cellCls = inStay ? "cell-active" : "cell-muted";
                  const summary = dateMap[key]?.summary;

                  // [91] 해당 날짜·필드의 요약값 가져오기
                  const v = getSummaryValue(fieldKey, summary);
                  return `<td class="${cellCls}"><span class="value">${v}</span></td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;

    // [92] 날짜 헤더(th) 클릭 → 해당 날짜의 3시간 예보 모달 열기
    card.querySelectorAll("th[data-datekey]").forEach(th => {
      th.addEventListener("click", () => {
        const dateKey = th.dataset.datekey;
        const hasData = th.dataset.hasdata === "1";

        // [93] 데이터가 없는 날짜 클릭 시 안내 메시지
        if(!hasData){
          showMessage("error", "이 날짜는 5일 예보 범위를 벗어나 데이터가 없습니다.");
          return;
        }

        // [94] __state에서 해당 날짜의 items 가져와 모달 렌더링
        const items = __state.dateMap?.[dateKey]?.items || [];
        render3HourTableModal({ cityName: __state.cityName, dateKey, items });
      });
    });

    // [95] 완성된 카드를 결과 영역에 추가
    $results.appendChild(card);
  });
}

/* =========================
   11) 우측 사이드바 활동 팁 표시
   ========================= */

// [96] 활동별 날씨 주의사항 안내 텍스트 정의
const ACTIVITY_TIPS = {
  Fishing: `
    <ul class="list-unstyled mb-0 small">
      <li>🎣 <b>Wind</b>: 5m/s 이하 권장</li>
      <li>🌧️ <b>강수</b>: 적을수록 좋음</li>
      <li>💧 <b>습도</b>: 60~80% 적합</li>
      <li>☁️ <b>구름</b>: 흐린 날 입질 활발</li>
    </ul>`,
  Hiking: `
    <ul class="list-unstyled mb-0 small">
      <li>🥾 <b>체감온도</b>: 10~20°C 최적</li>
      <li>🌂 <b>강수확률</b>: 20% 이하 권장</li>
      <li>💨 <b>Wind</b>: 8m/s 이하 안전</li>
      <li>👀 <b>가시거리</b>: 맑을수록 좋음</li>
    </ul>`,
  Running: `
    <ul class="list-unstyled mb-0 small">
      <li>🏃 <b>체감온도</b>: 5~18°C 최적</li>
      <li>💧 <b>습도</b>: 40~60% 쾌적</li>
      <li>💨 <b>Wind</b>: 맞바람 주의</li>
      <li>☔ <b>강수확률</b>: 낮을수록 좋음</li>
    </ul>`
};

// [97] activity-select 변경 시 우측 사이드바 팁 업데이트
$activitySelect.addEventListener("change", () => {
  const tips = document.getElementById("activity-tips");
  const val  = $activitySelect.value;
  // [98] 선택된 활동의 팁이 있으면 표시, 없으면 기본 문구
  tips.innerHTML = ACTIVITY_TIPS[val] || "활동을 선택하면 맞춤 날씨 안내가 표시됩니다.";
});

/* =========================
   12) 폼 이벤트 (submit / reset)
   ========================= */

// [99] Search 버튼 클릭 (폼 submit) 이벤트
$form.addEventListener("submit", async (e) => {
  e.preventDefault(); // [100] 기본 폼 제출(페이지 새로고침) 방지

  showMessage("", ""); // [101] 이전 메시지 초기화

  // [102] 입력값 읽기
  const activity    = $activitySelect.value;
  const destination = $destinationSelect.value;
  const checkIn     = parseDateInput($checkin.value);
  const checkOut    = parseDateInput($checkout.value);

  // [103] 입력 검증 - 실패 시 에러 메시지 표시 후 중단
  const v = validateInputs({ activity, destination, checkIn, checkOut });
  if(!v.ok){ showMessage("error", v.message); return; }

  // [104] 이전 결과 초기화
  $results.innerHTML = "";
  $meta.innerHTML    = "";

  try {
    setLoading(true); // [105] 로딩 스피너 ON

    // [106] OpenWeather API 호출 (비동기 - 응답 대기)
    const forecastData = await fetchForecastByCity(destination);

    setLoading(false); // [107] 로딩 스피너 OFF

    // [108] API 응답의 city.name이 있으면 사용 (없으면 입력값 그대로)
    const cityName = forecastData?.city?.name || destination;

    // [109] 응답 데이터를 날짜별로 그루핑
    const dateMap = groupForecastByDate(forecastData);

    // [110] 선택 기간 중 데이터 없는 날 수 확인
    let missing = 0;
    const cursor = new Date(checkIn);
    while(cursor <= checkOut){
      if(!dateMap[toDateKey(cursor)]?.items?.length) missing++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // [111] 데이터 누락 여부에 따라 안내 메시지
    if(missing > 0){
      showMessage("error", `${missing}일치 예보 데이터가 없습니다. 있는 날짜만 표시합니다.`);
    } else {
      showMessage("ok", "예보 데이터를 불러왔습니다. 날짜 헤더를 클릭하면 3시간 상세 예보를 볼 수 있습니다.");
    }

    // [112] 캘린더 렌더링 실행
    renderResults({ cityName, activity, checkIn, checkOut, dateMap });

  } catch(err) {
    console.error(err); // [113] 개발자 콘솔에 전체 에러 출력
    setLoading(false);
    showMessage("error", `예보 데이터를 불러오지 못했습니다: ${err.message}`);
  }
});

// [114] Reset 버튼 클릭 → 모든 입력값과 결과 초기화
$reset.addEventListener("click", () => {
  $activitySelect.value   = "";
  $destinationSelect.value= "";
  $checkin.value          = "";
  $checkout.value         = "";
  showMessage("", "");
  $results.innerHTML = "";
  $meta.innerHTML    = "";
  document.getElementById("activity-tips").innerHTML =
    "활동을 선택하면 맞춤 날씨 안내가 표시됩니다.";
});

// [115] 페이지 로드 시 오늘 날짜를 체크인/체크아웃 최솟값으로 설정
//       과거 날짜 선택 방지
const todayStr = toDateKey(new Date());
if($checkin)  $checkin.min  = todayStr;
if($checkout) $checkout.min = todayStr;
