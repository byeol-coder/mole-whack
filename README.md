# 닷 두더지 잡기 (mole-whack)

DotPad 촉각 디스플레이용 두더지 잡기 반응 게임. Dot Games 플랫폼(`dot-games-host`) 배포 규격을 따르는 단일 `index.html`.

## 핵심 특징

- **기본 모드**: 시간 제한 없이 촉각 신호를 충분히 읽고 방향을 선택.
- **도전 모드**: 촉각을 다 읽은 뒤 **준비 완료**를 누른 순간부터만 반응 속도를 측정 — 촉각 인지 시간과 반응 실행 시간을 분리해 시각장애 사용자가 불리하지 않도록 설계.
- 실제 `DotPadSDK-3.0.0.js` 동적 import 연동 (F1 위 · F2 아래 · F3 왼쪽 · F4 오른쪽 · PanningLeft 가운데 · PanningRight 다시 듣기 · PanningAll 튜토리얼 · LPF1 다시 하기).
- 인코딩 불변식(`EA` · `encodeFrame`, 600hex) 준수 + 라운드 번호 점자 보조 표시.
- 화면 핀 미리보기(`?preview=1`) — 하드웨어 없이 촉각 패턴 확인.
- 음성 튜토리얼 자동 재생(첫 게임) + `H`/`?`/PanningAll로 언제든 재생.
- 키보드: 방향키 + `Space`(가운데) + `Enter`(준비 완료) · `R` 다시 듣기 · `C` 현황 · `H` 도움말 · `N` 다시 하기 · `Esc` 일시정지.

## 폴더 구조

```
index.html
dotpad-sdk/DotPadSDK-3.0.0.js
assets/backgrounds/mole-garden-desktop.webp (1920×1080)
assets/backgrounds/mole-garden-mobile.webp  (1080×1350)
assets/characters/mole-default.webp         (1200×1200, 투명 배경)
test.mjs   (jsdom 회귀 테스트)
```

## 테스트

```bash
npm install
npm test
```

## 로컬 확인

`index.html`을 브라우저로 직접 열거나, 정적 서버로 서빙:

```bash
npx serve .
```

- `?preview=1` — 핀 미리보기 오버레이 표시
- `?embed=1` — 임베드 모드(투명 배경, 축소 UI)
