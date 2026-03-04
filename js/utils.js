/* =============================================
   utils.js - 공통 유틸리티 함수
   담당: 강기범
   ============================================= */

// 날짜 포맷 변환 (Unix timestamp → "오전 9시")
function formatHour(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleTimeString("ko-KR", { hour: "numeric" });
}

// 섭씨 → 화씨 변환
function celsiusToFahrenheit(celsius) {
  return Math.round((celsius * 9) / 5 + 32);
}

// 소수점 반올림
function roundTemp(temp) {
  return Math.round(temp);
}

// 현재 위치 가져오기 (브라우저 Geolocation API)
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("위치 정보를 지원하지 않는 브라우저입니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

// 날씨 상태 → FontAwesome 아이콘 클래스 반환 (낮/밤 반영)
function isDaytime(sunriseUnix, sunsetUnix) {
  const now = Math.floor(Date.now() / 1000);
  return now >= sunriseUnix && now < sunsetUnix;
}

function getWeatherIconClass(weatherMain, sunriseUnix, sunsetUnix) {
  const daytime = isDaytime(sunriseUnix, sunsetUnix);
  switch (weatherMain.toLowerCase()) {
    case "clear":
      return daytime ? "fa-sun" : "fa-moon";
    case "clouds":
      return daytime ? "fa-cloud-sun" : "fa-cloud-moon";
    case "rain":
      return "fa-cloud-rain";
    case "snow":
      return "fa-snowflake";
    case "thunderstorm":
      return "fa-bolt";
    case "drizzle":
      return "fa-cloud-showers-water";
    default:
      return daytime ? "fa-cloud-sun" : "fa-cloud-moon";
  }
}

// 날씨 상태 → 이모지 반환
function getWeatherEmoji(weatherMain) {
  switch (weatherMain.toLowerCase()) {
    case "clear":
      return "☀️";
    case "clouds":
      return "☁️";
    case "rain":
      return "🌧️";
    case "drizzle":
      return "🌦️";
    case "snow":
      return "❄️";
    case "thunderstorm":
      return "⛈️";
    default:
      return "🌤️";
  }
}
