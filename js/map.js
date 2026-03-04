// js/map.js

// 즐겨찾기 저장 (최대 5개)
function addFavorite(city) {
  let favorites = getFavorites();

  // 이미 등록된 도시면 무시
  if (favorites.find((f) => f.en === city.en)) return;

  // 최대 5개 제한
  if (favorites.length >= 5) {
    alert("즐겨찾기는 최대 5개까지 등록할 수 있어요.");
    return;
  }

  favorites.push(city);
  localStorage.setItem("favorites", JSON.stringify(favorites)); // 브라우저에 저장
}

// 즐겨찾기 불러오기
function getFavorites() {
  const saved = localStorage.getItem("favorites");
  return saved ? JSON.parse(saved) : [];
}

// 즐겨찾기 삭제
function removeFavorite(enName) {
  let favorites = getFavorites().filter((f) => f.en !== enName);
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

const map = L.map("weatherMap").setView([36.5, 127.5], 7); // 대한민국 중심

// 지도 초기화

// 기본 지도 타일
const defaultTile = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap contributors" },
).addTo(map);

// 위성 지도 타일
const satelliteTile = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "© Esri" },
);

// 레이어 토글 버튼 이벤트
document.querySelectorAll(".layer-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".layer-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (btn.dataset.layer === "satellite") {
      map.removeLayer(defaultTile);
      satelliteTile.addTo(map);
    } else {
      map.removeLayer(satelliteTile);
      defaultTile.addTo(map);
    }
  });
});

// 주요 도시에 날씨 데이터 표시
async function renderCityMarkers() {
  for (const city of CITIES) {
    try {
      const data = await getCurrentWeatherByCoords(city.lat, city.lon);
      const temp = roundTemp(data.main.temp);
      const emoji = getWeatherEmoji(data.weather[0].main); // utils.js

      const markerHtml = `
        <div class="weather-marker">
          <span>${emoji}</span>
          <span>${temp}°C</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "", // Leaflet 기본 스타일 제거
        iconAnchor: [36, 16], // 마커 중앙 기준점
      });

      const marker = L.marker([city.lat, city.lon], { icon: customIcon });

      // 마커 클릭 → 상세 패널 열기
      marker.on("click", () => openDetailPanel(city, data));
      marker.addTo(map);
    } catch (e) {
      console.warn(`${city.ko} 마커 로딩 실패`, e);
    }
  }
}
// 도시 상세 패널 열기 /닫기
function openDetailPanel(city, data) {
  const panel = document.getElementById("cityDetailPanel");

  // 날씨 데이터 채우기
  document.getElementById("detailCityName").textContent = city.ko;
  document.getElementById("detailCityCountry").textContent = city.country;
  document.getElementById("detailTemp").textContent =
    `${roundTemp(data.main.temp)}°C`;
  document.getElementById("detailDesc").textContent =
    data.weather[0].description;
  document.getElementById("detailFeelsLike").textContent =
    `${roundTemp(data.main.feels_like)}°C`;
  document.getElementById("detailHumidity").textContent =
    `${data.main.humidity}%`;
  document.getElementById("detailWind").textContent = `${data.wind.speed} m/s`;
  document.getElementById("detailVisibility").textContent = data.visibility
    ? `${(data.visibility / 1000).toFixed(1)} km`
    : "-- km";

  // 날씨 아이콘 (utils.js의 getWeatherIconClass 사용, 낮/밤 반영)
  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;
  const iconClass = getWeatherIconClass(data.weather[0].main, sunrise, sunset);
  const iconEl = document.getElementById("detailWeatherIcon");
  iconEl.className = `fa-solid ${iconClass} detail-weather-icon`;
  iconEl.style.color = isDaytime(sunrise, sunset)
    ? "var(--color-sunset)"
    : "#7c9cbf";

  // 즐겨찾기 버튼 상태 반영
  updateFavoriteBtn(city);

  // 즐겨찾기 버튼 클릭 이벤트 (onclick으로 매번 교체 → 중복 등록 방지)
  document.getElementById("favoriteToggleBtn").onclick = () => {
    const isAlready = !!getFavorites().find((f) => f.en === city.en);
    if (isAlready) {
      removeFavorite(city.en);
    } else {
      addFavorite(city);
    }
    updateFavoriteBtn(city);
    renderFavoriteList();
  };

  panel.style.display = "block";
}

// 즐겨찾기 버튼 텍스트 / 스타일 상태 업데이트
function updateFavoriteBtn(city) {
  const btn = document.getElementById("favoriteToggleBtn");
  const isFav = !!getFavorites().find((f) => f.en === city.en);

  if (isFav) {
    btn.classList.add("is-favorite");
    btn.querySelector("i").className = "fa-solid fa-star";
    btn.querySelector("span").textContent = "즐겨찾기 해제";
  } else {
    btn.classList.remove("is-favorite");
    btn.querySelector("i").className = "fa-regular fa-star";
    btn.querySelector("span").textContent = "즐겨찾기 추가";
  }
}

// 패널 닫기
document.getElementById("panelCloseBtn").addEventListener("click", () => {
  document.getElementById("cityDetailPanel").style.display = "none";
});

// 즐겨찾기 사이드바 랜더링
async function renderFavoriteList() {
  const container = document.getElementById("favoriteList");
  const countEl = document.getElementById("favoriteCount");
  const favorites = getFavorites();

  countEl.textContent = `${favorites.length} / 5`;

  if (favorites.length === 0) {
    container.innerHTML = `
      <div class="empty-favorite">
        <i class="fa-regular fa-star"></i>
        <p>즐겨찾기한 도시가 없어요</p>
        <p>지도에서 도시를 선택해보세요</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  for (const city of favorites) {
    try {
      const data = await getCurrentWeatherByCoords(city.lat, city.lon);
      const temp = roundTemp(data.main.temp);
      const emoji = getWeatherEmoji(data.weather[0].main);

      const item = document.createElement("div");
      item.className = "favorite-item";
      item.innerHTML = `
        <span class="favorite-item-icon">${emoji}</span>
        <div class="favorite-item-info">
          <div class="favorite-item-name">${city.ko}</div>
          <div class="favorite-item-temp">${data.weather[0].description}</div>
        </div>
        <span class="news-city-temp">${temp}°C</span>
        <i class="fa-solid fa-xmark favorite-item-remove" title="삭제"></i>
      `;

      // X 버튼 → 즐겨찾기 삭제
      item
        .querySelector(".favorite-item-remove")
        .addEventListener("click", (e) => {
          e.stopPropagation(); // 부모 클릭 이벤트 방지
          removeFavorite(city.en);
          renderFavoriteList();
        });

      // 아이템 클릭 → 지도 이동 + 상세 패널
      item.addEventListener("click", () => {
        map.setView([city.lat, city.lon], 10);
        openDetailPanel(city, data);
      });

      container.appendChild(item);
    } catch (e) {
      console.warn(`${city.ko} 즐겨찾기 로딩 실패`, e);
    }
  }
}

// 우측 주요 도시 뉴스 피드 랜더링
async function renderNewsFeed() {
  const container = document.getElementById("cityNewsFeed");
  container.innerHTML = "";

  // cities.js의 CITIES 전체 표시 (국내 먼저 → 해외 순서)
  for (const city of CITIES) {
    try {
      const data = await getCurrentWeatherByCoords(city.lat, city.lon);
      const temp = roundTemp(data.main.temp);
      const emoji = getWeatherEmoji(data.weather[0].main);

      const item = document.createElement("div");
      item.className = "news-feed-item";
      item.innerHTML = `
        <span class="news-city-icon">${emoji}</span>
        <div class="news-city-info">
          <div class="news-city-name">${city.ko}</div>
          <div class="news-city-desc">
            ${data.weather[0].description} · 습도 ${data.main.humidity}%
          </div>
        </div>
        <span class="news-city-temp">${temp}°C</span>
      `;

      // 클릭 → 지도 이동 + 상세 패널
      item.addEventListener("click", () => {
        map.setView([city.lat, city.lon], 10);
        openDetailPanel(city, data);
      });

      container.appendChild(item);
    } catch (e) {
      console.warn(`${city.ko} 뉴스피드 로딩 실패`, e);
    }
  }
}

// 한글 검색 자동 완성
const mapSearchInput = document.getElementById("mapSearchInput");
const searchDropdown = document.getElementById("searchDropdown");
const searchClear = document.getElementById("searchClear");

mapSearchInput.addEventListener("input", () => {
  const keyword = mapSearchInput.value.trim();
  searchClear.style.display = keyword ? "block" : "none";

  if (!keyword) {
    closeDropdown();
    return;
  }

  // cities.js의 searchCityByKorean 활용
  const results = searchCityByKorean(keyword);

  if (results.length === 0) {
    closeDropdown();
    return;
  }

  // 드롭다운 아이템 생성
  searchDropdown.innerHTML = "";
  results.forEach((city) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="city-ko">${city.ko}</span>
      <span class="city-en">${city.en}</span>
    `;
    li.addEventListener("click", async () => {
      mapSearchInput.value = city.ko;
      searchClear.style.display = "block";
      closeDropdown();

      // 지도 이동 + 상세 패널 열기
      try {
        map.setView([city.lat, city.lon], 10);
        const data = await getCurrentWeatherByCoords(city.lat, city.lon);
        openDetailPanel(city, data);
      } catch (e) {
        console.warn(`${city.ko} 검색 날씨 로딩 실패`, e);
      }
    });
    searchDropdown.appendChild(li);
  });

  searchDropdown.classList.add("open");
});

// X 버튼 → 검색어 초기화
searchClear.addEventListener("click", () => {
  mapSearchInput.value = "";
  searchClear.style.display = "none";
  closeDropdown();
});

// 검색창 외부 클릭 시 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".map-search-wrap") &&
    !e.target.closest(".search-dropdown")
  ) {
    closeDropdown();
  }
});

function closeDropdown() {
  searchDropdown.classList.remove("open");
  searchDropdown.innerHTML = "";
}

// 내 위치 버튼 + 페이지 최초 실행
document.getElementById("myLocationBtn").addEventListener("click", async () => {
  try {
    const pos = await getCurrentLocation(); // utils.js
    map.setView([pos.coords.latitude, pos.coords.longitude], 10);
  } catch (e) {
    alert(
      "위치 정보를 가져올 수 없어요.\n브라우저 설정에서 위치 권한을 허용해주세요.",
    );
  }
});

// 페이지 로드 시 전체 실행
document.addEventListener("DOMContentLoaded", () => {
  renderFavoriteList(); // 즐겨찾기 사이드바 (빠름)
  renderNewsFeed(); // 우측 뉴스 피드
  renderCityMarkers(); // 지도 마커 (API 호출 많아서 마지막)
});
