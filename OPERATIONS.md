# 혼산노트 홈페이지 — 운영 대장 (OPERATIONS)

> 목적: 홈페이지를 «찾아보지 않아도» 문제가 먼저 알려오게 한다.
> 알림 도달처(사장님 선택 A): **이메일 honsannote@gmail.com + 폰**.
> 이 문서는 공개 사이트에 노출되지 않음(`.vercelignore` 제외).

## 0. 기본 정보
- 공개 주소: https://honsannote.vercel.app
- 소스: GitHub `hiwonhyung-sketch/honsan-note-home` (main)
- 호스팅: Vercel (원본 저장소 Import · push 시 자동 재배포)
- 배포 방식: 클로드가 수정 → `git push` → Vercel 자동 배포

## 1. 모니터링 3중 그물
| # | 잡는 것 | 도달처 | 도구 | 누가 |
|---|---|---|---|---|
| 1 | 즉시 장애(다운) | 폰 푸시·이메일 | UptimeRobot(무료·5분) | ✅설정 완료(2026-09-20) |
| 2 | 서비스 경고(배포실패·사용량·결제·만료) | honsannote@gmail.com | 각 서비스 이메일 알림 | 사장님 토글(§5) |
| 3 | 한도 임박·만료 D-30·이상 | 폰 캘린더 + 클로드 보고 | Google Calendar + 정기 점검 | 클로드 |

## 2. 클로드 정기 점검(내가 하는 것)
- 매 수정: 배포 후 라이브 렌더 + 콘솔 오류 확인.
- 정기(월 1회, 캘린더 알림에 맞춰): 아래 «만료/한도 대장» 전수 점검 → 이상 시 보고.
- 만료 D-30 / 한도 80% 도달 시 사전 경고.

## 3. 서비스·계정 만료/한도 대장
> 날짜 미확정은 «확인要». 결제·갱신은 사장님만 가능(클로드는 «알림»까지).

| 서비스 | 용도 | 비용·주기 | 다음 갱신/한도 | 상태 |
|---|---|---|---|---|
| Vercel(Hobby) | 홈페이지 호스팅 | 무료 | 대역폭 100GB/월 · 상업화 시 Pro 검토 | 운영중 |
| GitHub | 소스 | 무료 | — | 운영중 |
| Supabase(Free) | 앱 백엔드 | 무료 | ⚠7일 무접속 시 정지 · 출시 후 Pro($25/월) | 운영중 |
| Apple Developer | iOS 배포 | 연 $99 | 미개설(개설일+1년) | 미개설 |
| Google Play | 안드 배포 | $25 1회 | 갱신 없음 · 정책양식 주기 | 미개설 |
| MapTiler(pro) | 지도 | 유료 구독 | 결제일 확인要 | 운영중 |
| data.go.kr(기상청 등 8종) | 데이터 | 무료 | 활용기간·일한도 확인要 | 운영중 |
| YouTube API | 이 산 영상 | 무료 | 일 쿼터 10,000 | 운영중 |
| komount/Kakao/KMA | 등산로·지도·날씨 | 무료 | 일 한도 | 운영중 |
| 도메인 | — | 구매 안 함 | 없음(vercel.app) | — |
| SSL | https | Vercel 자동 | 자동 갱신 | 자동 |

## 4. UptimeRobot 설정(24/7 다운→폰) — ✅완료(2026-09-20)
> 모니터 `honsannote.vercel.app` 등록·정상 «Up» 확인. 알림 honsannote@gmail.com. 다운/복구 시에만.
> 남은 선택: 폰에 UptimeRobot 앱 설치 → 푸시 / Alert Contacts에서 «Test notification»으로 도달 검증.

1. uptimerobot.com 가입(무료).
2. Add New Monitor → HTTP(s) → URL `https://honsannote.vercel.app` → 5분 간격.
3. Alert Contacts: 이메일 `honsannote@gmail.com` 추가 + **UptimeRobot 폰 앱** 설치(푸시).
4. 저장. 이후 사이트가 죽으면 몇 분 내 폰/메일로 알림.

## 5. 서비스별 이메일 알림 켜는 곳 — 사장님 확인
- Vercel: Account Settings → Notifications → 배포 실패/사용량 → honsannote@gmail.com.
- Supabase: Project → Settings → 알림/사용량 경고 이메일.
- MapTiler / Apple / Google Play / data.go.kr: 각 콘솔의 결제·알림 이메일을 honsannote@gmail.com 으로.

## 6. 사고/갱신 대응
- 다운: UptimeRobot 알림 → 클로드에게 «사이트 다운» → 원인(배포/호스팅) 확인·복구.
- 배포 실패: Vercel 메일 → 클로드가 롤백 또는 수정 후 재배포.
- 만료 임박: 캘린더/클로드 경고 → 사장님이 콘솔에서 결제·갱신.

---
*갱신: 세션에서 이 파일을 수정하며 최신화. 정본 = 이 저장소 main.*
