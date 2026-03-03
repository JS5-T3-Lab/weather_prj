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
