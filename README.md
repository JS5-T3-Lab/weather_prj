# 🌤️ Weatherman 프로젝트 시작 가이드

> 처음 프로젝트에 참여하는 팀원을 위한 설정 가이드입니다.  
> 순서대로 따라하면 누구나 개발 환경을 구성할 수 있어요!

---

## ✅ 시작 전 준비물 확인

아래 항목이 설치되어 있는지 먼저 확인해주세요.

| 항목 | 확인 방법 | 설치 링크 |
|------|-----------|-----------|
| Git | 터미널에 `git --version` 입력 | https://git-scm.com |
| VS Code (권장) | 프로그램 목록에서 확인 | https://code.visualstudio.com |

---

## 📌 STEP 1 : 프로젝트 Clone (내 컴퓨터에 가져오기)

### 1-1. 터미널 열기
- **Windows** : 시작 메뉴 → `cmd` 또는 `PowerShell` 검색 후 실행
- **Mac** : `Cmd + Space` → `터미널` 검색 후 실행

### 1-2. 원하는 폴더로 이동
```bash
# 예시: 바탕화면으로 이동할 경우
cd Desktop
```

### 1-3. 프로젝트 Clone
```bash
git clone https://github.com/팀장_계정명/weatherman.git
```

### 1-4. 프로젝트 폴더로 이동
```bash
cd weatherman
```

### 1-5. VS Code로 열기
```bash
code .
```

> ✅ VS Code에서 프로젝트 파일들이 보이면 Clone 성공!

---

## 📌 STEP 2 : OpenWeather API 키 발급받기

> API 키는 날씨 데이터를 가져오기 위해 꼭 필요해요.  
> 팀원 각자가 개인 키를 발급받아야 해요.

### 2-1. 회원가입
👉 https://openweathermap.org 접속 → 우측 상단 **Sign In** → **Create an Account**

### 2-2. API 키 확인
- 로그인 후 우측 상단 본인 이름 클릭 → **My API Keys**
- 기본으로 생성된 키(`Default`)를 복사해두세요.

> ⚠️ 처음 발급 후 **최대 2시간** 정도 지나야 키가 활성화돼요.  
> 그 전에는 API 호출이 실패할 수 있어요.

---

## 📌 STEP 3 : config.js 설정하기

> API 키를 코드에 등록하는 단계예요.

### 3-1. 파일 복사
`js` 폴더 안에 있는 `config.example.js` 파일을 복사해서  
이름을 `config.js` 로 바꿔주세요.

**방법 1 : VS Code에서**
- `js/config.example.js` 파일을 우클릭 → **Copy**
- `js` 폴더에 붙여넣기 → 파일명을 `config.js` 로 변경

**방법 2 : 터미널에서**
```bash
# Windows
copy js\config.example.js js\config.js

# Mac
cp js/config.example.js js/config.js
```

### 3-2. API 키 입력
`js/config.js` 파일을 열고, 아래와 같이 본인 키를 입력하세요.

```javascript
// js/config.js
const CONFIG = {
  API_KEY: "여기에_본인_API_키_입력"  // ← 따옴표 안에 붙여넣기
};
```

**예시**
```javascript
const CONFIG = {
  API_KEY: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
};
```

> ✅ 저장했으면 완료!

---

## 📌 STEP 4 : .gitignore 확인하기

> `config.js`가 실수로 GitHub에 올라가지 않도록 차단하는 설정이에요.  
> 이미 팀장이 설정해뒀기 때문에 **별도 작업 없이 확인만 하면 돼요.**

프로젝트 최상단의 `.gitignore` 파일을 열었을 때 아래 내용이 있으면 정상이에요.

```
js/config.js
```

> ⚠️ 만약 없다면 팀장에게 알려주세요!

---

## 📌 STEP 5 : 정상 작동 확인

`index.html` 파일을 브라우저로 열어서 날씨 데이터가 불러와지면 설정 완료예요!

**VS Code에서 바로 여는 방법**
- `index.html` 파일을 우클릭 → **Open with Live Server** (Live Server 확장 설치 필요)
- 또는 `index.html` 파일을 그냥 더블클릭해서 브라우저로 열기

---

## ⚠️ 자주 하는 실수 모음

| 실수 | 해결 방법 |
|------|-----------|
| `config.js` 없이 실행 | STEP 3 다시 확인 |
| API 키가 작동 안 함 | 발급 후 최대 2시간 대기 |
| `config.js`를 GitHub에 올림 | 팀장에게 바로 알리고, API 키 재발급 |
| Clone이 안 됨 | GitHub 저장소 주소 다시 확인 |

---

## 📁 프로젝트 구조 안내

```
📁 weatherman/
│
├── 📄 index.html          ← 메인페이지 (현재날씨 대시보드)
├── 📄 travel.html         ← 여행/취미 날씨 페이지
├── 📄 outfit.html         ← 옷차림 추천 페이지
│
├── 📄 .gitignore          ← config.js GitHub 업로드 차단
│
├── 📁 css/
│   ├── style.css          ← 공통 스타일
│   ├── index.css          ← 메인페이지 전용 스타일
│   ├── travel.css         ← 여행페이지 전용 스타일
│   └── outfit.css         ← 옷차림페이지 전용 스타일
│
├── 📁 js/
│   ├── config.js          ← ❌ 내 컴퓨터에만 존재 (GitHub 비공개)
│   ├── config.example.js  ← ✅ GitHub 공개 (양식 파일)
│   ├── api.js             ← API 호출 공통 함수
│   ├── utils.js           ← 공통 유틸 함수
│   ├── index.js           ← 메인페이지 로직
│   ├── travel.js          ← 여행페이지 로직
│   └── outfit.js          ← 옷차림페이지 로직
│
└── 📁 assets/
    └── 📁 icons/
```

---

## 💬 문의

설정 중 막히는 부분이 있으면 팀 카카오톡 단체방에 남겨주세요!
