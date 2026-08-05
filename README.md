# English Talk

상황별 영어 회화 학습용 정적 웹사이트. 한국어 사용자를 대상으로 하며, 대화문마다 원어민 음성이 붙어 있습니다.

빌드 도구도 의존성도 없습니다. HTML/CSS/ES5 JavaScript만 사용합니다.

| | |
|---|---|
| 카테고리 | 7개 (호텔·쇼핑·공항·레스토랑·교통·병원·여행) |
| 시나리오 | 89개 |
| 대화 문장 | 1,108개 |
| 오디오 | mp3 1,108개 (약 33MB, 저장소에 직접 커밋) |

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

js/data.js    데이터 로더, 조회 헬퍼, 진도 관리 (모든 페이지 공용)
toggle.js     영어/한국어/화자 표시 토글, 반복, 문장 클릭 재생, 구글 검색 버튼
play-all.js   전체 재생, 진행 표시, 현재 문장 하이라이트
styles.css    공통 스타일 / toggle.css  대화 화면 전용 스타일
```

나머지 최상위 `*.html` 96개는 **전부 리다이렉트 스텁**입니다. 내용 없이 `scenario.html?cat=…&name=…`(또는 카테고리는 `category.html?cat=…`)로 넘깁니다.

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

파일명은 반드시 `key`와 같아야 합니다. 로더가 `data/<key>.json`으로 경로를 만듭니다.

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

오디오 생성 스크립트는 이 저장소에 없습니다. 로컬에서 TTS로 만들어 커밋하는 방식입니다. (예전에는 각 문장에 🔄 재생성 버튼이 있었지만, 브라우저에서 인증 없는 TTS 엔드포인트를 호출해 그 주소가 공개되는 문제 때문에 제거했습니다 — `dbf9668`. 그 주소는 여기 적지 않습니다.)

## 학습 진도

`localStorage`에 저장하며 서버나 계정은 없습니다.

| 키 | 내용 |
|---|---|
| `englishTalk_done` | 완료 표시한 시나리오 `{ "hotel_checkin": true, ... }` |
| `englishTalk_states` | 영어/한국어/화자 표시 여부, 반복 모드 |

뒤로가기(bfcache) 복귀 시 `pageshow` 이벤트로 다시 렌더링해 진도가 즉시 반영됩니다.

## 알아둘 점

- **`toggle.js`와 `play-all.js`는 서로를 필요로 하지만, 계약이 각 파일 맨 위에 적혀 있습니다.** `play-all.js`는 `etRepeatEnabled()`를, `toggle.js`는 `etStopPlayAll()`을 상대에게서 씁니다. 양쪽 다 `typeof` 가드가 있어 한쪽만 로드해도 죽지 않고, 함수 선언은 호이스팅되며 실제 호출은 클릭 시점에 일어나므로 **로드 순서는 상관없습니다.** 내부 상태(`repeatMode`, `isPlaying`, `showEnglish` 등)는 파일 밖에서 건드리지 마세요.
- `js/scenario.js`는 대화문을 그린 뒤 `initEnglishTalk()`를 다시 호출합니다. 동적으로 만든 요소에 클릭 재생과 구글 버튼을 붙이기 위해서입니다.
- 외부 요청이 없습니다. 구글 로고는 인라인 SVG이며, 오프라인에서도 그대로 동작합니다.
- 렌더링은 문자열 연결 + `innerHTML` 방식이고, JSON에서 온 텍스트는 `etEsc()`로 이스케이프합니다. 마크업을 추가할 때 이 처리를 빠뜨리지 마세요.
