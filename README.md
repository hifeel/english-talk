# English Talk

상황별 영어 회화 학습용 정적 웹사이트. 한국어 사용자를 대상으로 하며, 대화문마다 원어민 음성이 붙어 있습니다.

빌드 도구도 의존성도 없습니다. HTML/CSS/ES5 JavaScript만 사용합니다.

| | |
|---|---|
| 카테고리 | 8개 (호텔·쇼핑·공항·레스토랑·교통·병원·여행·스몰토크) |
| 시나리오 | 156개 |
| 대화 문장 | 1,332개 |
| 오디오 | mp3 1,332개 (약 26MB, 저장소에 직접 커밋) |

## 실행

**로컬 서버가 필요합니다.** `index.html`을 파일로 직접 열면 동작하지 않습니다 — `data/*.json`을 읽는 `fetch`가 `file://` 출처에서 CORS로 차단되어 화면이 비어 있게 됩니다.

```sh
python -m http.server 8777
# http://127.0.0.1:8777/
```

> `python -m http.server`는 HTTP Range 요청을 지원하지 않습니다. 이 서버로 열면 **오디오 재생은 되지만 중간으로 시크할 수 없습니다** (모든 시크가 0으로 되돌아감). 앱 버그가 아니며, Range를 지원하는 정적 호스팅(GitHub Pages 등)에서는 정상 동작합니다. 시크까지 확인하려면 `npx serve` 같은 Range 지원 서버를 쓰세요.

## 구조

화면은 3개뿐이고, 전부 `data/`의 JSON을 읽어 렌더링합니다.

```
data/index.json         카테고리 메타데이터 (1.4KB, 대화문 없음)
data/<카테고리>.json      해당 카테고리의 시나리오와 대화문 (29~61KB)

index.html    + js/index.js      카테고리 카드 그리드
category.html + js/category.js   ?cat=hotel            시나리오 목록
scenario.html + js/scenario.js   ?cat=&name=           대화문 본문
marks.html    + js/marks.js      북마크한 문장 모아보기

js/data.js    데이터 로더, 조회 헬퍼, 진도 관리 (모든 페이지 공용)
toggle.js     영어/한국어/화자 표시 토글, 반복, 문장 클릭 재생, 구글 검색 버튼
play-all.js   전체 재생, 진행 표시, 현재 문장 하이라이트
styles.css    공통 스타일 / toggle.css  대화 화면 전용 스타일

manifest.json PWA 설치 정보 / icons/  앱 아이콘
sw.js         서비스워커 / js/pwa.js  서비스워커 등록
js/offline.js 카테고리별 오디오 다운로드 (category.html 전용)
js/media-session.js  잠금화면 재생 제어 (scenario.html 전용)
```

나머지 최상위 `*.html` 99개는 **전부 리다이렉트 스텁**입니다. 내용 없이 `scenario.html?cat=…&name=…`(또는 카테고리는 `category.html?cat=…`)로 넘깁니다.

페이지마다 정적 HTML을 두던 예전 구조에서 JSON 기반으로 옮기면서, 기존 링크와 북마크를 살리려고 남긴 것입니다. **새 콘텐츠를 추가할 때 스텁을 만들 필요는 없습니다** — 없어도 `scenario.html?cat=…&name=…`으로 정상 접근됩니다. 스텁은 옛 URL 호환용일 뿐입니다.

## 데이터 스키마

데이터는 두 종류로 나뉘어 있습니다. **둘 사이에 중복되는 내용은 없습니다** — 그래서 빌드 단계도, 동기화할 것도 없습니다.

`data/index.json` — 카테고리 메타데이터만. 모든 화면이 읽습니다.

```jsonc
{
  "categories": [
    {
      "key": "hotel",                          // URL의 ?cat= 값, 파일명과 동일
      "icon": "🏨",
      "title": "호텔 (Hotel)",                  // 이모지 없이
      "subtitle": "호텔에서 필요한 영어 회화",     // category.html 부제
      "summary": "체크인, 체크아웃, 요청, 문제 해결" // index.html 카드 설명
    }
  ]
}
```

`data/hotel.json` — 그 카테고리의 내용만.

```jsonc
{
  "key": "hotel",
  "scenarios": [
    {
      "key": "hotel_checkin",                  // URL의 ?name= 값, 진도 저장 키
      "icon": "🔑",
      "title": "체크인 (Check-in)",
      "subtitle": "예약 확인, 체크인 절차",
      "dialogues": [
        {
          "speaker": "Guest",
          "en": "Hi, I have a reservation under Kim.",
          "ko": "안녕하세요, 김으로 예약했습니다.",
          "audio": "audio/checkin_1.mp3"       // 저장소 기준 상대 경로
        }
      ]
    }
  ]
}
```

카테고리와 시나리오는 같은 형태(`key` / `icon` / `title` / `subtitle`)를 씁니다. JS에 하드코딩된 카테고리 목록은 없습니다.

**로딩 방식.** `js/data.js`가 세 가지 진입점을 제공합니다.

| 함수 | 받아오는 것 | 쓰는 곳 |
|---|---|---|
| `etLoadIndex()` | `index.json`만 | 내부용 |
| `etLoadCategory(key)` | 인덱스 + 그 카테고리 1개 | category.html, scenario.html |
| `etLoadAllCategories()` | 인덱스 + 전체 7개 | index.html (문장 수·진도 집계에 전부 필요) |

`etLoadCategory()`가 돌려주는 "로드된 카테고리"는 메타데이터에 `scenarios`가 붙은 형태입니다. 결과는 캐시되고, 같은 키로 동시에 호출해도 요청은 한 번만 나갑니다.

대화문 페이지는 이제 전체가 아니라 필요한 카테고리 하나만 받습니다 (약 302KB → 30~61KB).

## 콘텐츠 추가하기

1. `data/<카테고리>.json`의 `scenarios[]`에 항목을 추가합니다.
2. 문장별 mp3를 만들어 `audio/`에 넣고, 각 대화의 `audio` 경로를 채웁니다.
3. 끝입니다. 목록·진도·이전/다음 네비게이션은 자동으로 나옵니다.

카테고리를 새로 추가하려면 두 가지가 필요합니다.

1. `data/index.json`에 항목 추가 — `key`/`icon`/`title`/`subtitle`/`summary` 다섯 필드 모두.
2. `data/<key>.json` 생성 — `{"key": "...", "scenarios": [...]}`.
3. **`sw.js`의 `PRECACHE`에 `data/<key>.json`을 추가하고 `CACHE` 값을 올립니다.**

파일명은 반드시 `key`와 같아야 합니다. 로더가 `data/<key>.json`으로 경로를 만듭니다.

3번을 빼먹으면 화면은 정상이지만 **오프라인에서 그 카테고리만 열리지 않습니다.** PRECACHE가 데이터 파일을 하나씩 이름으로 나열하기 때문입니다.

## 오디오

파일명 규칙이 **한 가지가 아닙니다.** 세 세대가 섞여 있습니다.

| 형태 | 예시 | 비고 |
|---|---|---|
| 시나리오별 (현재 규칙) | `hotel_breakfast_1.mp3` | 대부분. 새 콘텐츠는 이걸 따르세요 |
| 공유 번호 풀 (초기) | `airport_1.mp3` ~ `airport_14.mp3` | 한 묶음을 여러 시나리오가 나눠 씀 |
| 하위 그룹 (travel) | `travel_booking_1_2.mp3` | `<키>_<그룹>_<문장>` |

예를 들어 `airport_checkin`·`airport_security`·`airport_boarding`·`airport_dutyfree`는 `airport_N` 번호를 공유하고, `hotel_checkin`은 `checkin_N`을 씁니다.

**따라서 시나리오 키로 파일명을 유추하지 마세요.** JSON의 `audio` 필드가 유일한 기준입니다.

음성은 화자에 따라 나눕니다 — `Guest`/`Customer`/`Traveler`/`Receptionist`는 여성 음성, 나머지는 남성 음성.

> **오디오 파일 내용을 바꾸면 `sw.js`와 `js/offline.js`의 `AUDIO_CACHE` 값을 올리세요.** URL이 그대로라, 올리지 않으면 오프라인 저장한 사용자에게 옛 음성이 영영 남습니다.

## PWA (설치 & 오프라인)

홈 화면에 설치할 수 있고, 설치 후에는 오프라인에서도 열립니다. `manifest.json`과 `sw.js` 두 파일이 전부이며 빌드 단계는 여전히 없습니다.

**설치 시 캐시하는 것** — 앱 셸(HTML·CSS·JS)과 `data/*.json` 전부. 합쳐서 약 337KB입니다.

**오디오는 설치 때 받지 않습니다.** mp3 1,332개 26MB를 한 번에 받게 할 수 없어서, 카테고리 페이지의 **"오프라인 저장" 버튼**으로 필요한 것만 받습니다(`js/offline.js`). 저장하지 않은 카테고리의 mp3는 네트워크로 직행하므로, 오프라인에서는 화면만 뜨고 소리는 나지 않습니다.

캐시는 두 개로 나뉩니다. 셸은 `english-talk-v8`, 오디오는 `english-talk-audio-v2`입니다. **셸 버전을 올려도 오디오 캐시는 지워지지 않아야** 하므로 activate 핸들러가 두 이름을 모두 예외 처리합니다.

바꿔 말하면 **오디오 캐시는 오디오 파일 내용이 바뀔 때만 올립니다.** URL이 그대로라 올리지 않으면 저장해 둔 사용자에게 옛 음성이 계속 재생됩니다. 올리면 옛 캐시가 정리되므로 사용자는 다시 저장해야 합니다.

**저장 여부는 캐시 자체에서 읽습니다.** 별도 플래그를 두지 않으므로 상태가 어긋날 일이 없습니다 — 해당 카테고리의 mp3가 전부 캐시에 있으면 "저장됨"입니다.

> **`sw.js`가 Range 요청에 206을 직접 만들어 응답합니다.** Cache API는 전체 파일을 200으로만 돌려주는데, 미디어 요소는 스크러버를 끌 때 Range를 요청합니다. 그대로 내주면 **시크가 먹지 않습니다** — Range를 지원하지 않는 서버에서와 같은 증상입니다. 그래서 캐시된 본문을 잘라 `Content-Range`를 붙인 206을 만듭니다. 파일이 10~50KB라 비용은 무시할 수준입니다. **오디오 캐시 로직을 건드릴 때 이 부분을 깨뜨리지 마세요.**

**전략은 stale-while-revalidate입니다.** 캐시본을 즉시 내주고 뒤에서 새 파일을 받아 둡니다. `skipWaiting` + `clients.claim`과 함께 쓰므로, 배포한 내용은 **그다음 방문**에 반영됩니다. 바로 확인하려면 새로고침을 한 번 더 하세요.

**페이지는 쿼리를 뗀 경로로 캐시합니다.** `scenario.html?cat=hotel&name=…`은 시나리오 156개가 전부 같은 `scenario.html`을 쓰므로, 쿼리째 저장하면 오프라인에서 매번 캐시 미스가 나고 사본만 쌓입니다.

> **precache 목록을 바꾸면 `sw.js`의 `CACHE` 값을 올리세요.** activate 핸들러가 이름이 다른 캐시를 전부 지웁니다. 올리지 않으면 옛 캐시가 그대로 남습니다.

**잠금화면 제어** — `js/media-session.js`가 Media Session API를 붙여, 화면을 끈 상태에서도 알림창·잠금화면·이어폰 버튼으로 재생/일시정지와 문장 이동이 됩니다. 표시되는 정보는 영어 문장(제목), 화자(아티스트), 시나리오 이름(앨범)입니다.

오디오 이벤트는 버블링되지 않으므로 리스너를 **document에 캡처 단계로** 붙입니다. 그래야 `js/scenario.js`가 나중에 만드는 대화문까지 재초기화 훅 없이 잡힙니다.

이전/다음은 전체 재생 중이면 `etPlayAllSkip()`으로 넘겨 재생 순서의 주인을 하나로 유지하고, 아니면 인접 문장을 직접 재생합니다.

로컬에서 시험한 뒤에는 브라우저에 등록된 워커를 지우는 편이 좋습니다. `localhost`의 같은 포트로 다른 프로젝트를 띄우면 이 앱의 캐시가 응답할 수 있습니다 — DevTools > Application > Service workers > Unregister.

## 학습 진도

`localStorage`에 저장하며 서버나 계정은 없습니다.

| 키 | 내용 |
|---|---|
| `englishTalk_done` | 완료 표시한 시나리오 `{ "hotel_checkin": true, ... }` |
| `englishTalk_states` | 영어/한국어/화자 표시 여부, 반복 모드 |
| `englishTalk_marks` | 북마크한 **문장** 배열 |

**북마크는 문장 단위입니다.** 대화문마다 ☆ 버튼이 있고, 모은 문장은 `marks.html`에서 카테고리를 가로질러 한 번에 봅니다. 메인 화면의 진입 링크는 북마크가 하나라도 있을 때만 나옵니다.

항목에는 시나리오 키와 순번뿐 아니라 **영어 문장 자체를 함께 저장합니다.** 이 저장소는 시나리오를 쪼개고 오디오 번호를 재정렬한 이력이 여러 번 있어서, 순번만 믿으면 북마크가 엉뚱한 문장을 가리키게 됩니다. `etResolveMarks()`가 읽을 때마다 저장된 위치의 문장이 일치하는지 확인하고, 어긋나면 **문장으로 다시 찾아 위치를 교정**합니다. 문장 자체가 사라졌으면 조용히 버립니다.

뒤로가기(bfcache) 복귀 시 `pageshow` 이벤트로 다시 렌더링해 진도가 즉시 반영됩니다.

## 알아둘 점

- **`toggle.js`와 `play-all.js`는 서로를 필요로 하지만, 계약이 각 파일 맨 위에 적혀 있습니다.** `play-all.js`는 `etRepeatEnabled()`를, `toggle.js`는 `etStopPlayAll()`을 상대에게서 씁니다. 양쪽 다 `typeof` 가드가 있어 한쪽만 로드해도 죽지 않고, 함수 선언은 호이스팅되며 실제 호출은 클릭 시점에 일어나므로 **로드 순서는 상관없습니다.** 내부 상태(`repeatMode`, `isPlaying`, `showEnglish` 등)는 파일 밖에서 건드리지 마세요.
- `js/scenario.js`는 대화문을 그린 뒤 `initEnglishTalk()`를 다시 호출합니다. 동적으로 만든 요소에 클릭 재생과 구글 버튼을 붙이기 위해서입니다.
- 외부 요청이 없습니다. 구글 로고는 인라인 SVG이며, 오프라인에서도 그대로 동작합니다.
- 렌더링은 문자열 연결 + `innerHTML` 방식이고, JSON에서 온 텍스트는 `etEsc()`로 이스케이프합니다. 마크업을 추가할 때 이 처리를 빠뜨리지 마세요.
