/* =============================================
   travel.js - ?��?��/취�?�활?�� ?��?�� ?��?���?? 로직
   ?��?��: 강성�??
   ============================================= */

// TODO: ?��?�� ?��?�� 버튼 ?��?���?? (골프, ?��?��, ?��?��, ?���??, 캠핑, ?��?��?���??, ?��?��구기)
// TODO: ?��?�� ?��?�� ?���???��?�� ?��?���??
// TODO: ?���?? ?��?�� UI (8?�� ?��?��)
// TODO: ?��?���?? ?��?�� 결과 ?��?���?? ?��?���?? (강수?��, ?��?��?�� ?��)
Mainjs
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

 // 

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
   3) DOM elements (HTML ����)
   - We grab elements by id so we can read inputs and write results.
   ========================= */

const $form = document.getElementById("search-form"); // �� ��ü(Submit �̺�Ʈ)
const $activitySelect = document.getElementById("activity-select"); // Ȱ�� select
const $destinationSelect = document.getElementById("destination-select"); // ������ select
const $checkin = document.getElementById("checkin-input"); // üũ�� date
const $checkout = document.getElementById("checkout-input"); // üũ�ƿ� date
const $message = document.getElementById("message-area"); // ����/�ȳ� �޽��� ǥ��
const $loading = document.getElementById("loading"); // �ε� ǥ�� �ڽ�
const $results = document.getElementById("results"); // �ֺ� Ķ���� ī�尡 ���? ��
const $meta = document.getElementById("result-meta"); // ���? ���? ��Ÿ ǥ��
const $reset = document.getElementById("reset-btn"); // Reset ��ư

// Modal(�˾�) ���� DOM
const $modal = document.getElementById("hourly-modal"); // ���? ��ü
const $modalClose = document.getElementById("modal-close"); // ���? �ݱ� ��ư
const $modalTitle = document.getElementById("modal-title"); // ���? ���� �ؽ�Ʈ
const $modalSubtitle = document.getElementById("modal-subtitle"); // ���? ����Ÿ��Ʋ �ؽ�Ʈ
const $hourlyTableWrap = document.getElementById("hourly-table-wrap"); // ���? �� ǥ ���� div

/* =========================
   4) Helper functions (���� ���� ��ƿ)
   ========================= */

// ���ڸ� �� �ڸ� ���ڿ��� (��: 4 -> "04")
function pad2(n){ return String(n).padStart(2, "0"); }

// Date -> "YYYY-MM-DD"
function toDateKey(dateObj){
  const y = dateObj.getFullYear();
  const m = pad2(dateObj.getMonth()+1);
  const d = pad2(dateObj.getDate());
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" -> Date ��ü�� ��ȯ
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

// �� ���� ������ �����Ϸ� ����
function startOfWeekMonday(dateObj){
  const d = new Date(dateObj);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0) ? -6 : (1 - day); // Sunday�� -6 �ؼ� �����Ϸ�
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

// �� ���� ��(�Ͽ���)
function endOfWeekSunday(dateObj){
  const s = startOfWeekMonday(dateObj);
  return addDays(s, 6);
}

// üũ��~üũ�ƿ� ������ "�� ���� ī��"�� �����?
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

// ���� null/undefined�� "-" ǥ��, ���ڴ� �Ҽ� 1�ڸ�
function fmtNumber(val, unit=""){
  if(val === null || val === undefined || Number.isNaN(val)) return "-";
  const n = typeof val === "number" ? (Math.round(val*10)/10) : val;
  return `${n}${unit}`;
}

// 0~1 Ȯ���� %�� (��: 0.3 -> 30%)
function fmtPercent01(pop){
  if(pop === null || pop === undefined) return "-";
  return `${Math.round(pop*100)}%`;
}

// unix seconds -> "HH:00" ����(���� Ÿ��)
function unixToHourLabel(unixSec){
  const d = new Date(unixSec * 1000);
  return `${pad2(d.getHours())}:00`;
}

// �ε� �ڽ� �����?/���̱�
function setLoading(on){
  $loading.classList.toggle("hidden", !on);
}

// �޽��� ���?: ok/error ��Ÿ�� ����
function showMessage(type, text){
  if(!text){
    $message.innerHTML = "";
    return;
  }
  const cls = type === "error" ? "message error" : "message ok";
  $message.innerHTML = `<div class="${cls}">${text}</div>`;
}

/* =========================
   5) Validation (�Է� �� ����)
   - /forecast is about 5 days, so we limit date range.
   ========================= */

// ���� ��¥�� "����~5��" �ȿ� �ִ��� �˻�
function isWithinForecastWindow(dateObj){
  const today = new Date();
  today.setHours(0,0,0,0);
  const max = addDays(today, 5); // ���������� 5��
  return (dateObj >= today) && (dateObj <= max);
}

// �� �Է� ����: missing/invalid/date range
function validateInputs({ activity, destination, checkIn, checkOut }){
  // API_KEY �̼����̸� �ٷ� ����
  if(API_KEY === "PUT_YOUR_OPENWEATHER_API_KEY_HERE" || !API_KEY){
    return { ok:false, message:"Please set API_KEY in main.js first." };
  }
  // Ȱ�� ���� ����
  if(!activity){
    return { ok:false, message:"Please select an activity." };
  }
  // ������ ���� ����
  if(!destination){
    return { ok:false, message:"Please select a destination." };
  }
  // ��¥ �Է� ����
  if(!checkIn || !checkOut){
    return { ok:false, message:"Please select both check-in and check-out dates." };
  }
  // üũ�ƿ��� �� ������ ����
  if(checkOut < checkIn){
    return { ok:false, message:"Check-out must be after check-in." };
  }
  // /forecast ����(5��) ���̸� ����
  if(!isWithinForecastWindow(checkIn) || !isWithinForecastWindow(checkOut)){
    return { ok:false, message:"This MVP only supports the next ~5 days (/data/2.5/forecast). Please pick dates within 5 days from today." };
  }
  // ���?
  return { ok:true, message:"" };
}

/* =========================
   6) API call: OpenWeather /data/2.5/forecast
   ========================= */

// ���ø����� /forecast ȣ���ϴ� �Լ�
async function fetchForecastByCity(city){
  // API URL �����? (q=���ø�)
  const url =
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}` +
    `&appid=${encodeURIComponent(CONFIG.API_KEY)}` +
    `&units=${encodeURIComponent(UNITS)}` +
    `&lang=${encodeURIComponent(LANG)}`;

  // fetch: ��Ʈ��ũ ��û
  const res = await fetch(url);

  // JSON �Ľ�
  const data = await res.json();

  // HTTP ����(res.ok == false)�� �� ���� ����
  if(!res.ok){
    const cod = data?.cod ?? res.status;
    const msg = data?.message ?? "Unknown error";
    throw new Error(`OpenWeather error (${cod}): ${msg}`);
  }

  // �����̸� ������ ����
  return data;
}

/* =========================
   7) Group forecast list[] by date
   - forecastData.list: 3-hour entries
   - We create dateMap:
     dateMap["YYYY-MM-DD"] = { items: [...], summary: {...} }
   ========================= */

// /forecast ������(list[])�� ��¥���� ����
function groupForecastByDate(forecastData){
  const dateMap = {};
  const list = forecastData?.list || [];

  // �� item�� 3�ð� ���� ����
  list.forEach(item => {
    const d = new Date(item.dt * 1000); // dt unix sec -> Date
    const key = toDateKey(d); // "YYYY-MM-DD"

    // key�� ó���̸� �� ���� ����
    dateMap[key] = dateMap[key] || { items: [], summary: null };

    // items �迭�� push
    dateMap[key].items.push(item);
  });

  // ��¥�� ���?(summary) �����?
  Object.keys(dateMap).forEach(key => {
    const items = dateMap[key].items;

    // �� ���� �迭 ����(�ִ� ����)
    const temps = items.map(x => x?.main?.temp).filter(v => v !== null && v !== undefined);
    const feels = items.map(x => x?.main?.feels_like).filter(v => v !== null && v !== undefined);
    const pops  = items.map(x => x?.pop).filter(v => v !== null && v !== undefined);
    const humid = items.map(x => x?.main?.humidity).filter(v => v !== null && v !== undefined);
    const clouds= items.map(x => x?.clouds?.all).filter(v => v !== null && v !== undefined);
    const wind  = items.map(x => x?.wind?.speed).filter(v => v !== null && v !== undefined);
    const gust  = items.map(x => x?.wind?.gust).filter(v => v !== null && v !== undefined);

    // ������(3�ð� ����) �ջ�: rain["3h"] + snow["3h"]
    const rain3h = items.map(x => x?.rain?.["3h"] ?? 0);
    const snow3h = items.map(x => x?.snow?.["3h"] ?? 0);
    const precipSum = rain3h.reduce((a,b)=>a+b,0) + snow3h.reduce((a,b)=>a+b,0);

    // summary ��ü �����?
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

// ���? ����
function openModal(){
  $modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // ���? ��ũ�� ����
}

// ���? �ݱ�
function closeModal(){
  $modal.classList.add("hidden");
  document.body.style.overflow = "";
  $hourlyTableWrap.innerHTML = ""; // ���� ǥ ���� ����
}

// �ݱ� ��ư Ŭ�� -> closeModal
$modalClose.addEventListener("click", closeModal);

// ���?(��ο�? �κ�) Ŭ�� -> closeModal
$modal.addEventListener("click", (e) => {
  if(e.target && e.target.dataset && e.target.dataset.close === "true") closeModal();
});

// ESC Ű -> closeModal
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !$modal.classList.contains("hidden")) closeModal();
});

/* =========================
   9) Build TABLE inside modal (requested format)
   - Columns = time slots (3-hour)
   - Rows = variables
   ========================= */

// �ð� ���� �迭 �����?: ["00:00", "03:00", ...] and also keep items
function buildTimeSlots(items){
  // items�� 3�ð� ���� ���� �迭(�� ��¥��)
  // �� item���� dt�� �̾� HH:00�� ��ȯ
  return items.map(it => unixToHourLabel(it.dt));
}

// Ư�� item���� ���� ���� �����ϴ� ���� �Լ���(ǥ�� �� ��)
function getCellValue(varKey, it){
  // varKey���� ǥ���� ���� �ٸ��� �����?
  switch(varKey){
    case "weather":
      // weather[0].main + description
      return it?.weather?.[0]
        ? `${it.weather[0].main}${it.weather[0].description ? ` (${it.weather[0].description})` : ""}`
        : "-";
    case "temp":
      return fmtNumber(it?.main?.temp, "��C");
    case "feels":
      return fmtNumber(it?.main?.feels_like, "��C");
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

// ���? ǥ�� �׸��� �ٽ� �Լ�
function render3HourTableModal({ cityName, dateKey, items }){
  // ���? ����/����Ÿ��Ʋ ����
  $modalTitle.textContent = "3-hour forecast table";
  $modalSubtitle.textContent = `${cityName} ? ${dateKey} ? ${items.length} time slots`;

  // ǥ���� ������ ����(����)�� ���� (���Ͻø� ���⼭ ���� �� �߰�/�����ϸ� ��)
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

  // columns: �ð� ��
  const timeSlots = buildTimeSlots(items);

  // ---- HTML table �����? ----
  // thead: ù ���� "Variable" + �ð���
  const thead = `
    <thead>
      <tr>
        <th style="width:180px;">Time</th>
        ${timeSlots.map(t => `<th>${t}</th>`).join("")}
      </tr>
    </thead>
  `;

  // tbody: �� row(����)�� ����, �ð� ���Ը��� �� ����
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

  // ���� table HTML
  const tableHTML = `
    <div class="hourly-table-wrap">
      <table class="hourly-table">
        ${thead}
        ${tbody}
      </table>
    </div>
  `;

  // ���? �ȿ� ǥ ����
  $hourlyTableWrap.innerHTML = tableHTML;

  // ���? ����
  openModal();
}

/* =========================
   10) Calendar summary (week table)
   ========================= */

// 1�� Ȱ���� �����̹Ƿ�, Ȱ���� �´� field ���? ��������
function collectFieldsForActivity(activity){
  return ACTIVITY_FIELD_MAP[activity] || [];
}

// calendar ���� ���� ���? �����?
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

// ���� ����: ��¥ Ŭ�� �� dateMap�� �ٽ� ���� ���� �����ص�
let __state = {
  cityName: "",
  dateMap: null,
  checkInKey: "",
  checkOutKey: "",
  activity: ""
};

// �ֺ� Ķ������ �������ϴ� �Լ�
function renderResults({ cityName, activity, checkIn, checkOut, dateMap }){
  // �� �迭 �����?
  const weeks = buildDateRangeWeeks(checkIn, checkOut);

  // ������ Ȱ���� �ʿ��� ���? �ʵ� ���?
  const fields = collectFieldsForActivity(activity);

  // üũ��/üũ�ƿ� Ű
  const checkInKey = toDateKey(checkIn);
  const checkOutKey = toDateKey(checkOut);

  // ���� ����
  __state = { cityName, dateMap, checkInKey, checkOutKey, activity };

  // ���? ��Ÿ ���� ǥ��
  $meta.textContent = `${cityName} ? ${checkInKey} �� ${checkOutKey} ? Activity: ${activity}`;

  // ���? ���� ����
  $results.innerHTML = "";

  // �� �ָ��� ī�� ����
  weeks.forEach((wk, index) => {
    const wkStartKey = toDateKey(wk.weekStart);
    const wkEndKey = toDateKey(wk.weekEnd);

    // ī�� div ����
    const card = document.createElement("div");
    card.className = "week-card";

    // ī�� HTML ����: header + table
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

    // ? ��¥ ���? Ŭ�� �̺�Ʈ ���� (���? ǥ ����)
    card.querySelectorAll("th[data-datekey]").forEach(th => {
      th.addEventListener("click", () => {
        const dateKey = th.dataset.datekey; // Ŭ���� ��¥
        const hasData = th.dataset.hasdata === "1"; // ������ �ֳ�?

        if(!hasData){
          showMessage("error", "No 3-hour forecast for this date (outside the 5-day window).");
          return;
        }

        const items = __state.dateMap?.[dateKey]?.items || []; // �� ��¥ items
        render3HourTableModal({ cityName: __state.cityName, dateKey, items }); // ���? ǥ ����
      });
    });

    // ī�� ȭ�鿡 �߰�
    $results.appendChild(card);
  });
}

/* =========================
   11) Form events (submit / reset)
   ========================= */

// Search ��ư Ŭ��(�� submit) �� ����
$form.addEventListener("submit", async (e) => {
  e.preventDefault(); // �� �⺻ ����(������ ���ε�) ����
  showMessage("", ""); // �޽��� �ʱ�ȭ

  // �Է°� �б�
  const activity = $activitySelect.value;
  const destination = $destinationSelect.value;
  const checkIn = parseDateInput($checkin.value);
  const checkOut = parseDateInput($checkout.value);

  // �Է� ����
  const v = validateInputs({ activity, destination, checkIn, checkOut });
  if(!v.ok){
    showMessage("error", v.message);
    return;
  }

  // ���? �ʱ�ȭ
  $results.innerHTML = "";
  $meta.textContent = "";

  try{
    setLoading(true); // �ε� ǥ�� ON

    // API ��û
    const forecastData = await fetchForecastByCity(destination);

    setLoading(false); // �ε� ǥ�� OFF

    // ���信 city.name�� ������ �װ� ���?(������ destination �״��?)
    const cityName = forecastData?.city?.name ? forecastData.city.name : destination;

    // ��¥���� ����
    const dateMap = groupForecastByDate(forecastData);

    // ���� �Ⱓ �ȿ� �����Ͱ� ���� ���� �ִ��� ���� üũ
    let missing = 0;
    const cursor = new Date(checkIn);
    while(cursor <= checkOut){
      const k = toDateKey(cursor);
      if(!dateMap[k]?.items?.length) missing++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // �ȳ� �޽���
    if(missing > 0){
      showMessage("error", `Some selected days have no /forecast data (${missing} day(s)). We'll show what is available.`);
    } else {
      showMessage("ok", "Forecast loaded. Click a date header to open the 3-hour table.");
    }

    // Ķ���� ����
    renderResults({ cityName, activity, checkIn, checkOut, dateMap });

  } catch(err){
    console.error(err); // ������ �ֿܼ� ���� ���?
    setLoading(false);
    showMessage("error", `Failed to load forecast. ${err.message}`); // ȭ�鿡 ���� ���?
  }
});

// Reset ��ư Ŭ�� �� �Է°�/ȭ�� �ʱ�ȭ
$reset.addEventListener("click", () => {
  $activitySelect.value = "";
  $destinationSelect.value = "";
  $checkin.value = "";
  $checkout.value = "";

  showMessage("", "");
  $results.innerHTML = "";
  $meta.textContent = "";
});
