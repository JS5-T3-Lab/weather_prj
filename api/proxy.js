export default async function handler(req, res) {
  // 프론트엔드(api.js)에서 보낸 path(weather, forecast 등)와 나머지 파라미터를 분리
  const { path, ...rest } = req.query;

  // Vercel 환경 변수에서 API 키 꺼내오기
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API 키가 설정되지 않았습니다." });
  }

  // OpenWeatherMap으로 보낼 실제 URL 조립
  const queryParams = new URLSearchParams({
    ...rest,
    appid: apiKey,
  }).toString();
  const apiUrl = `https://api.openweathermap.org/data/2.5/${path}?${queryParams}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "날씨 정보를 가져오는데 실패했습니다." });
  }
}
