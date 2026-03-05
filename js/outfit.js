/**
 * 옷차림 추천 페이지 - 현재 위치 날씨 조회 및 UI 갱신
 */
(function () {
  const leftCardValues = document.querySelectorAll("#sidebar-left .list-row .value");
  const weatherCard = document.querySelector(".weather-compare-card");
  const outfitCard = document.querySelector(".outfit-recommend-card");

  // API 연동 시 사용 (utils.js에 없을 수 있어 로컬 폴백)
  function formatTemp(t) {
    return t != null && !isNaN(Number(t)) ? Math.round(Number(t)) + "°C" : "—";
  }
  function getWeatherIconClass(icon) {
    var map = { "01d": "fa-sun", "01n": "fa-moon", "02d": "fa-cloud-sun", "02n": "fa-cloud-moon", "03d": "fa-cloud", "03n": "fa-cloud", "04d": "fa-cloud", "04n": "fa-cloud", "09d": "fa-cloud-rain", "09n": "fa-cloud-rain", "10d": "fa-cloud-rain", "10n": "fa-cloud-rain", "11d": "fa-bolt", "11n": "fa-bolt", "13d": "fa-snowflake", "13n": "fa-snowflake", "50d": "fa-fog", "50n": "fa-fog" };
    return map[icon] || "fa-cloud-sun";
  }
  var Utils = {
    formatTemp: (window.Utils && typeof window.Utils.formatTemp === "function") ? window.Utils.formatTemp : formatTemp,
    getWeatherIconClass: (window.Utils && typeof window.Utils.getWeatherIconClass === "function") ? window.Utils.getWeatherIconClass : getWeatherIconClass
  };

  // 날씨 상태 → 이모지 (utils.js getWeatherEmoji와 동일 매핑)
  function getWeatherEmojiLocal(weatherMain) {
    var m = String(weatherMain || "").toLowerCase();
    if (m === "clear") return "☀️";
    if (m === "clouds") return "☁️";
    if (m === "rain") return "🌧️";
    if (m === "drizzle") return "🌦️";
    if (m === "snow") return "❄️";
    if (m === "thunderstorm") return "⛈️";
    return "🌤️";
  }

  /**
   * 기온에 맞는 옷차림 정보 반환 (기온 가이드 기준)
   * @param {number} temp - 기온 (체감온도 권장)
   * @returns {{ label, clothes, iconEmoji, season, tip? }}
   */
  function getOutfitByTemp(temp) {
    const t = Number(temp);
    if (isNaN(t)) {
      return { label: "—", clothes: "기온 정보가 없습니다.", iconEmoji: "👕👗", season: "" };
    }
    if (t >= 28) {
      return {
        label: "28°C 이상",
        season: "여름",
        clothes: "민소매, 반소매, 반바지, 짧은 치마, 린넨 옷",
        iconEmoji: "👕🩳",
        tip: "무더운 여름 날씨예요! 시원한 반소매 옷을 입고 수분 섭취 잊지 마세요.☀️",
      };
    }
    if (t >= 23) {
      return {
        label: "23~27°C",
        season: "",
        clothes: "반소매, 얇은 셔츠, 반바지, 면바지",
        iconEmoji: "👕👖",
        tip: "조금 더워지기 시작했어요. 반소매 차림에 얇은 겉옷 정도가 적당해요.",
      };
    }
    if (t >= 20) {
      return {
        label: "20~22°C",
        season: "봄",
        clothes: "블라우스, 긴소매, 면바지, 슬랙스",
        iconEmoji: "👗👖",
        tip: "완연한 봄/가을 날씨네요. 얇은 긴소매나 셔츠를 입기 딱 좋아요.",
      };
    }
    if (t >= 17) {
      return {
        label: "17~19°C",
        season: "봄",
        clothes: "얇은 가디건·니트, 스웨트셔츠, 후드, 긴바지",
        iconEmoji: "🧥👖",
        tip: "기분 좋게 선선한 날씨예요. 니트나 맨투맨 한 장이면 충분해요!",
      };
    }
    if (t >= 12) {
      return {
        label: "12~16°C",
        season: "가을",
        clothes: "재킷, 가디건, 청재킷, 니트, 스타킹, 청바지",
        iconEmoji: "🧥👖",
        tip: "활동하기 적당하지만 금방 서늘해져요. 가벼운 자켓이나 가디건을 챙기세요.",
      };
    }
    if (t >= 9) {
      return {
        label: "9~11°C",
        season: "가을",
        clothes: "트렌치 코트, 야상 점퍼, 스타킹, 기모바지",
        iconEmoji: "🧥👖",
        tip: "쌀쌀한 날씨예요. 자켓이나 트렌치코트를 걸치면 좋아요.",
      };
    }
    if (t >= 5) {
      return {
        label: "5~8°C",
        season: "겨울",
        clothes: "울 코트, 히트텍, 가죽 옷, 기모",
        iconEmoji: "🧥🧣",
        tip: "옷을 따뜻하게 입으세요.",
      };
    }
    return {
      label: "4°C 이하",
      season: "겨울",
      clothes: "패딩, 두꺼운 코트, 누빔 옷, 기모, 목도리",
      iconEmoji: "🧤🧣",
      tip: "날이 추워요 목도리와 장갑을 챙기세요:)",
    };
  }

  function setLeftSidebar(todayTemp, feelsLike) {
    if (!leftCardValues.length) return;
    if (leftCardValues[0]) leftCardValues[0].textContent = "—"; // 어제는 API에서 미제공
    if (leftCardValues[1]) leftCardValues[1].textContent = Utils.formatTemp(todayTemp);
    if (leftCardValues[2]) leftCardValues[2].textContent = Utils.formatTemp(feelsLike);
  }

  function setWeatherCard(weather) {
    if (!weatherCard || !weather) return;
    var city = weather.city != null ? String(weather.city) : "";
    var description = weather.description != null ? String(weather.description) : "";
    var emoji = getWeatherEmojiLocal(weather.main);
    weatherCard.innerHTML = `
      <div class="weather-current-inner">
        <div class="weather-current-main">
          <span class="weather-current-icon weather-current-emoji" aria-hidden="true">${emoji}</span>
          <div>
            <span class="weather-current-temp">${Utils.formatTemp(weather.temp)}</span>
            <span class="weather-current-city">${city}</span>
          </div>
        </div>
        <p class="weather-current-desc">${description}</p>
        <p class="weather-current-feels">체감 ${Utils.formatTemp(weather.feels_like)}</p>
      </div>
    `;
  }

  function setOutfitCard(weather) {
    if (!outfitCard || !weather) return;
    const info = getOutfitByTemp(weather.feels_like);
    outfitCard.innerHTML = `
      <div class="outfit-recommend-inner">
        <div class="outfit-recommend-icon-wrap">
          <span class="outfit-recommend-icon" aria-hidden="true">${info.iconEmoji}</span>
        </div>
        <p class="outfit-recommend-temp">${Utils.formatTemp(weather.feels_like)} 기준</p>
        <p class="outfit-recommend-label">${info.season ? info.season + " · " : ""}${info.label}</p>
        <p class="outfit-recommend-clothes">${info.clothes}</p>
        ${info.tip ? `<p class="outfit-recommend-tip">${info.tip}</p>` : ""}
      </div>
    `;
  }

  function setLoading() {
    if (weatherCard) {
      weatherCard.innerHTML = '<p class="outfit-loading"><i class="fa-solid fa-spinner fa-spin"></i> 위치 확인 중...</p>';
    }
    if (outfitCard) {
      outfitCard.innerHTML = '<p class="outfit-loading"><i class="fa-solid fa-spinner fa-spin"></i> 날씨 조회 중...</p>';
    }
  }

  function setError(message) {
    if (weatherCard) {
      weatherCard.innerHTML = `<p class="outfit-error"><i class="fa-solid fa-location-dot"></i> ${message}</p>`;
    }
    if (outfitCard) {
      outfitCard.innerHTML = `<p class="outfit-error">${message}<br><small>위치 권한을 허용하거나 브라우저 설정을 확인해 주세요.</small></p>`;
    }
    if (leftCardValues[1]) leftCardValues[1].textContent = "—";
    if (leftCardValues[2]) leftCardValues[2].textContent = "—";
  }

  function run() {
    setLoading();

    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 기능을 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        try {
          var data = await getCurrentWeatherByCoords(lat, lon);
          if (!data || data.cod !== 200) {
            setError(data && data.message ? data.message : "날씨를 가져오지 못했습니다.");
            return;
          }
          var cityName = data.name || "";
          if (typeof findCityByEn === "function") {
            var cityObj = findCityByEn(cityName);
            if (cityObj && cityObj.ko) cityName = cityObj.ko;
          }
          var weather = {
            temp: data.main.temp,
            feels_like: data.main.feels_like,
            icon: data.weather && data.weather[0] ? data.weather[0].icon : "",
            main: data.weather && data.weather[0] ? data.weather[0].main : "",
            description: data.weather && data.weather[0] ? data.weather[0].description : "",
            city: cityName
          };
          setLeftSidebar(weather.temp, weather.feels_like);
          setWeatherCard(weather);
          setOutfitCard(weather);
        } catch (e) {
          setError(e.message || "날씨를 가져오지 못했습니다.");
        }
      },
      function () {
        setError("위치를 사용할 수 없습니다.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
