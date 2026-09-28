export const IMPLEMENTATION_PLAN_MARKDOWN = `# 🎮 BEAT ARCADE (비트 아케이드)
## 3D 원근감 세로형 리듬 액션 게임 종합 기획 및 개발 명세서

---

## 1. 프로젝트 개요 (Overview)

* **프로젝트명**: BEAT ARCADE (비트 아케이드)
* **장르**: 3D 원근감 하이웨이 4레인 아케이드 리듬 액션
* **타깃 플랫폼**: 반응형 웹 (모바일/태블릿 화면 터치 & PC 키보드 완벽 대응)
* **핵심 컨셉**:
  * 소실점을 향해 뻗어 나가는 **3D 원근 투영 하이웨이 트랙**과 코스믹 워프 연출
  * **광택 네온 캡슐 노트**와 하향 셰브론(\`v\`) 디자인
  * 타격 시 터져 나오는 **5각 회전 별빛 파동(Star Ring Burst)** 이펙트
  * **13곡의 풀버전 사운드트랙** 및 고난도(Hard / Expert / Master) 중심의 아케이드 채보
  * **FEVER 1.5배 부스터**, 슬랜티드 HP 미터, 실시간 콤보 & 판정 HUD

---

## 2. 조작 및 입력 시스템 (Controls & Customization)

### (1) 듀얼 입력 모드 지원
| 입력 방식 | 지원 기기 | 세부 동작 방식 |
| :--- | :--- | :--- |
| **화면 터치 (Touch)** | 스마트폰, 태블릿, 터치스크린 PC | • 화면 하단 4분할 타깃 직접 터치<br>• 한 손으로 롱노트를 누르면서 다른 손으로 단타 노트를 입력할 수 있는 **멀티터치(Multi-touch)** 완벽 지원 |
| **키보드 (Keyboard)** | PC, 노트북 | • 기본 키: **\`D\`**, **\`F\`**, **\`J\`**, **\`K\`** (방향키 \`←, ↓, ↑, →\` 동시 지원)<br>• 시스템 키: \`Space\` / \`ESC\` (일시정지 및 설정) |

### (2) 1:1 자유 키 바인딩 & 프리셋 시스템
* **레인별 실시간 키 변경**: 설정 화면에서 변경할 레인을 클릭 후 원하는 키를 누르면 즉시 1:1 매핑 및 자동 스왑(Swap)
* **원클릭 인기 프리셋 제공**:
  1. \`D · F · J · K\` (표준 기본 배치)
  2. \`A · S · K · L\` (DJMAX / 오투잼 와이드 배치)
  3. \`Z · X · C · V\` (하단 4열 배치)
  4. \`Q · W · E · R\` (MOBA 스타일 배치)
  5. \`← · ↓ · ↑ · →\` (방향키 4버튼)
  6. \`1 · 2 · 3 · 4\` (숫자키 배치)
* **인게임 실시간 키 테스트 존**: 설정 창 안에서 키를 누르면 즉시 사운드와 함께 \`PRESS! ✨\` 반응을 확인 가능

---

## 3. 인게임 UI/UX 및 비주얼 연출 사양 (Visual & HUD)

### (1) 3D 하이웨이 트랙 & 코스믹 워프
* **소실점(Vanishing Point) 원근 투영**:
  * 상단 지평선(Y=8%)에서 판정선(Y=83%)으로 갈수록 노트가 3D 원근 곡선(depth^1.25)을 따라 가속되며 확대
  * 양옆 오렌지 & 마젠타 톤의 워프 스피드 라인과 70개의 스트리밍 스타 파티클
* **레인별 입체 라이트 빔**:
  * 노트를 입력하면 해당 레인 전체에 네온 빔 기둥이 지평선까지 뻗어 나가는 타격 피드백

### (2) 광택 캡슐 노트 & 롱노트 디자인
* **컬러 테마**: 핑크(\`#f43f5e\`)와 시안(\`#06b6d4\`)이 교차하는 네온 비비드 컬러
* **디테일**:
  * 둥근 캡슐 형태 + 상단 유리 반사 하이라이트 + 내부 화이트 글로우 하향 셰브론(\`v\`) 심볼
  * **롱노트(Hold Note)**: 듀얼 네온 레일 + 끝점의 발광 구체(Orb) + 유지 시 지속 스파크 방출

### (3) 아케이드 상단 & 사이드 HUD
* **좌측 상단**:
  * **\`FEVER\` 게이지 바**: 콤보가 쌓일수록 충전, 100% 도달 시 7초간 **x1.5 점수 부스터 & 레인보우 발광**
  * **\`HP\` 사선 세그먼트 미터**: 24개 대각선 셀로 구성된 아케이드 생명력 게이지
  * **\`LINE 4 | MODE [E/N/H/EX/MAS] | SPEED\`** 메탈릭 상태 뱃지
* **우측 상단**:
  * **\`RECORD▶\`** 로컬 최고 기록 점수 표시
  * **\`SCORE▶\`** 메탈릭 이탤릭 폰트 실시간 누적 점수
  * 트랙 명세 및 아케이드 일시정지(\`||\`) 버튼
* **중앙 상단**: 대형 네온 텍스트 **\`PERFECT\`**, **\`GREAT\`**, **\`GOOD\`**, **\`MISS\`**
* **우측 중앙**: 선명한 핑크 글로우의 **\`COMBO\` 카운터 (예: 84)**
* **하단 타깃**: 네온 테두리 알약 슬롯 + 별 심볼 + 지정된 조작 키 라벨 표기

---

## 4. 정밀 판정 및 통계 산출 시스템 (Logic & Scoring)

### (1) 판정 타이밍 윈도우
* \`AudioContext.currentTime\` 하드웨어 타이머 기준 오차(ms) 계산:
  * **PERFECT** (±55ms 이내): 1,000점 + 콤보 보너스(최대 +450) + 체력 회복 + FEVER 게이지 충전
  * **GREAT** (±100ms 이내): 700점 + 콤보 보너스(최대 +200) + 체력 소폭 회복
  * **GOOD** (±160ms 이내): 400점 + 콤보 유지
  * **MISS** (>160ms 초과 또는 미입력): 0점 + 콤보 리셋 + HP 감소 (-8)

### (2) 수학적으로 일치하는 실시간 통계 추적 (\`statsRef\`)
* **React Stale Closure 원천 차단**:
  * 렌더링 사이클 지연 없이 \`statsRef.current\`에 100% 동기식으로 데이터 갱신
* **정확도 공식**:
  정확도(%) = (PERFECT*100 + GREAT*75 + GOOD*40 + MISS*0) / (총 노트 수 * 100) * 100%
* **종료 시 미처리 노트 자동 정산**:
  * 곡 종료 시 아직 판정선을 지나가지 못했거나 놓친 모든 노트를 빠짐없이 \`MISS\`로 집계하여 정확도 왜곡 방지
* **결과 화면(Result Screen) 달성 뱃지**:
  * **ALL PERFECT**: 모든 노트를 퍼펙트로 클리어한 경우 황금 뱃지 부여
  * **FULL COMBO**: 미스 없이 전 구간 콤보 유지 시 네온 시안 뱃지 부여
  * 랭크 부여: SSS (98% 이상 & 풀콤보), SS (95% 이상), S (90% 이상), A, B, C

---

## 5. 수록곡 및 채보(Beatmap) 라인업 (13 Tracks)

각 곡은 인트로, 빌드업, 드롭(클라이맥스), 아웃트로로 구성된 풀버전 패턴과 **Web Audio API 절차적 신디사이저(킥, 스네어, 16분 롤링 하이햇, 어시드 베이스, 아르페지오 리드)**를 포함합니다.

| # | 트랙명 (Title) | 아티스트 | BPM | 길이 | 난이도 | 채보 특징 및 핵심 패턴 |
| :-: | :--- | :--- | :-: | :-: | :---: | :--- |
| **1** | **Godspeed Smile** | Omega Sound Unit | **235** | 68s | **MASTER (Boss)** | 익스트라톤 하이퍼팝, 극한의 16분 계단 폭타 & 더블 코드 연타 |
| **2** | **Quantum Chaos** | Subatomic | **220** | 64s | **MASTER** | 스피드코어 더블 킥, 고속 롤링 16분 스트림 및 트릴 |
| **3** | **Apocalypse 2099** | Dark Core Project | **205** | 65s | **MASTER** | 프렌치코어 인더스트리얼 난타, 엇박 롱노트 교차 |
| **4** | **Final Resonance** | Psychedelic Mind | **195** | 60s | **MASTER** | 싸이트랜스 3연타 질주, 크로스 레인 계단 패턴 |
| **5** | **Chrono Paradox** | Time Breaker | **210** | 62s | **EXPERT** | 아트코어 & 글리치, 변박 및 폴리리듬 동시치기 |
| **6** | **Inferno Eclipse** | Hellfire FX | **200** | 60s | **EXPERT** | 하드스타일 킥 & 신코페이션 버스트, 연속 계단 |
| **7** | **Valkyrie Protocol** | Cyber Valkyrie | **190** | 58s | **EXPERT** | 하이테크 트랜스, 고속 트릴(0-1-0-1, 2-3-2-3) 및 홀드 탭 |
| **8** | **Cyber Samurai** | Ronin Sound | **188** | 56s | **EXPERT** | 오리엔탈 펜타토닉 리드, 복합 롱노트 유지 중 반대편 타격 |
| **9** | **Tokyo Overdrive** | Drift Horizon | **182** | 56s | **EXPERT** | 유로비트 개더링, 16분 연타 및 좌우 왕복 패턴 |
| **10** | **Supernova Blitz** | Astral Drive | **175** | 54s | **HARD** | 드럼앤베이스 고속 브레이크, 빠른 8분음표 계단 |
| **11** | **Galactic Rush** | Nova Bass | **155** | 52s | **HARD** | 일렉트로 하우스 4-on-the-floor, 엇박 동타 훈련 |
| **12** | **Cyber Blossom** | Pixel Pulse | **138** | 46s | **NORMAL** | 퓨처베이스 8분음표 및 기본 롱노트 해제 훈련 |
| **13** | **Neon Smile** | Smile Crew | **124** | 42s | **EASY** | 초보자용 정박 4분음표 입문곡 |

---

## 6. 개발 완료 기술 스택 요약 (Tech Stack)

* **Core Framework**: React 19 + TypeScript + Vite
* **Rendering Engine**: HTML5 Canvas 2D Context (60FPS 정밀 하드웨어 가속, 3D 원근 투영 변환)
* **Audio Engine**: Web Audio API (\`AudioContext\`, 절차적 신디사이저, 고정밀 레이턴시 싱크)
* **Styling & FX**: Tailwind CSS v4 + Canvas Confetti (클리어 축하 연출)
* **Storage**: LocalStorage (사용자 키 매핑, 음향/속도/오프셋 설정, 곡별 최고 기록 저장)
`;

// Helper to download the plan as file
export const downloadPlanFile = (format: 'markdown' | 'txt' = 'markdown') => {
  const isMd = format === 'markdown';
  const filename = isMd ? 'BEAT_ARCADE_구현계획서.md' : 'BEAT_ARCADE_구현계획서.txt';
  const mimeType = isMd ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';

  const blob = new Blob([IMPLEMENTATION_PLAN_MARKDOWN], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
