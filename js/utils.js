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
