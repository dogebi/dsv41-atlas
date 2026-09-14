# dsv41-atlas — DeepSeek-V4.1-Flash 3D 가중치 지도

## 무엇인가
`https://nisten.github.io/LLMViz-DeepSeek-V4.1-Flash/` 와 **동일한 렌더/스타일**(픽셀 동일)의
단일 정적 HTML. 각 레이어/텐서를 3D 도형으로 그리고 **부피 = 디스크상 비트 크기**(양자화 오버헤드 포함).
레이어를 클릭하면 가중치가 확장되고 교육 정보가 뜬다. 회전·팬·줌 지원.

## 출처 / 라이선스 (필수 고지)
- 원본: **nisten/LLMViz-DeepSeek-V4.1-Flash** — MIT License, Copyright (c) 2026 netsin
- MIT 고지 전문은 `index.html` 내 크레딧 모달(임베드 `MIT_LICENSE`) + 동봉 `LICENSE` 에 포함.
- 이 저장소 사본은 **원본 렌더/스타일을 일절 수정하지 않고**(픽셀 동일 유지), HF 라이브 데이터
  로더 스크립트만 파일 끝에 **추가**했다. 최상단에 출처 주석을 달았다.
- 재배포 시 위 MIT 고지를 반드시 유지해야 한다.

## 데이터 출처 (2026-09-11 실측, xray 프록시 경유)
| 저장소 | 총 용량 | safetensors 샤드 | 파일 수 |
|---|---|---|---|
| deepseek-ai/DeepSeek-V4.1-Flash | 510.3 GB | 48 | 95 |
| s-zaizen/DeepSeek-V4.1-Flash-NVFP4 | 527.3 GB | 48 | 89 |

- 위 수치는 `hf-data.json` 에 원문(config.json 전체 + repo tree + 샤드 크기)으로 저장됨.
- 실측 config: 40 layers · hidden 5120 · heads 64 · kv_head 1 · **384 routed experts**(+1 shared) ·
  vocab 129280 · MLA(q_lora 1280/o_lora 1024/head_dim 512) · Engram(2 layers) · Vision 32-layer ViT ·
  fp8(block 32×32, expert fp4) 양자화.
- 원본 파일의 내장 데이터는 이 실측 config와 **일치함을 확인**(nisten은 HF 스냅샷을 하드코딩한 것).

## 런타임 라이브 fetch
- 파일 끝 스크립트가 `huggingface.co` API에서 두 저장소의 파일 목록을 조회한다.
- 성공 시 탭 제목이 `… · 510.3 GB · 48 shards · LIVE` 로 바뀌고 `window.__HF_LIVE` 에 담긴다.
- **차단 환경(GFW)에서는 조용히 실패**하고 내장 데이터를 그대로 쓴다(렌더 영향 없음).
  → 폐하 환경은 huggingface.co 직접 접속이 막혀 있어(프록시 필요) 대개 내장 데이터로 뜬다.

## 사용
- 그냥 `index.html` 을 브라우저에서 열면 된다(도구·빌드·CDN 불필요, 완전 자립형).
- 웹 배포 시 이 폴더를 그대로 정적 호스팅하면 된다.
