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

## 사용
- 그냥 `index.html` 을 브라우저에서 열면 된다(도구·빌드·CDN 불필요, 완전 자립형).
- 웹 배포 시 이 폴더를 그대로 정적 호스팅하면 된다.

## WebMCP (AI 에이전트용 도구 노출, 2026-09-16 추가)
**index.html 끝에 인라인으로** 들어 있는 스크립트가 페이지의 기존 상태만 읽어 도구 8개를 등록한다.
별도 파일이 없고 **원본 CSP(`script-src 'unsafe-inline'`)를 그대로 유지**한다. 미지원 브라우저에서는 즉시 종료.

| 도구 | 종류 | 설명 |
|---|---|---|
| `get_model_overview` | read | model_type·architectures·dtype·총 파라미터·정밀도별 총량·레이어/카테고리 요약 |
| `list_categories` | read | 8개 카테고리별 텐서 수·파라미터 총량 |
| `search_tensors` | read | 이름/카테고리/포맷/모듈로 텐서 검색 |
| `get_tensor_detail` | read | 텐서 상세(shape·format·count·params·inspector 설명문) |
| `focus_tensor` | 조작 | 해당 텐서로 뷰 이동·하이라이트(페이지 자체 선택 로직 호출) |
| `get_view_state` | read | 현재 보고 있는 view/precision/layout/선택 상태 |
| `list_benchmarks` | read | 모델카드 벤치마크 전체 목록 + 모델별 점수·순위 (분류 필터 선택) |
| `compare_models` | read | 특정 벤치마크에서 모델 비교 → 점수·순위·최고점 대비 델타·1:1 격차 |

데이터 출처는 페이지가 이미 노출하는 `window.ATLAS_DEBUG` 뿐이다(중복 상태 없음).
벤치마크 표를 도구에 노출하려고 그 객체에 `BENCH, BENCH_MODELS` 두 식별자를 **추가**했다(원본 로직 변경 없음, 디버그 노출 목록 확장).

### 확인 방법
1. Chrome 149+ 에서 `chrome://flags/#enable-webmcp-testing` → Enabled → 브라우저 재시작
   (운영 배포로 일반 방문자에게 열려면 WebMCP **origin trial** 등록 후 `<meta http-equiv="origin-trial">` 삽입)
2. DevTools → **Application → WebMCP** 패널에서 도구 8개 확인, 또는 "Model Context Tool Inspector" 확장
3. 콘솔: `window.__WEBMCP_STATUS` → `"registered (8 tools)"`
4. 확장 없이 로직만 확인: `await window.__WEBMCP_ATLAS.call('compare_models', {benchmark:'DeepSWE v1.1', models:['DS V4.1 Flash (this atlas)','GLM-5.3']})`

### 실 API 표면 주의 (실측)
- Chrome 149(플래그 활성) 에서는 **`navigator.modelContext`** 로 노출된다 (`document.modelContext` 는 아직 undefined).
  스크립트는 둘 다 감지하므로 이후 Chrome 버전의 표면 이동에도 대응한다.
- 도구 실행 경로: `navigator.modelContext.getTools()` 로 등록본을 읽고
  `navigator.modelContext.executeTool(tool, JSON.stringify(args))` 로 호출(둘째 인자는 JSON **문자열**).
  테스트 인터페이스는 `navigator.modelContextTesting`(listTools/executeTool).
- 검증 실측(2026-09-16): 플래그 켠 Chrome 149 헤드리스에서 `compare_models('DeepSWE v1.1')` 실행 →
  DS V4.1 Flash 74.2(1위) / GLM-5.3 66.9(5위), 격차 +7.3 (+10.9%) 반환.

### 전제조건 / 한계
- WebMCP는 **origin-isolated 문서**에서만 동작한다 → `document.domain` 을 쓰면 안 된다(현재 미사용).
- Permissions Policy `tools`(기본 `self`) 적용 — top-level 문서는 그대로 동작.
- Chrome/Edge 전용(실험 단계), Firefox·Safari 미지원. 도구는 그 페이지를 직접 방문한 브라우저에서만 발견된다.
- `focus_tensor` 는 화면 상태를 바꾸지만 되돌리기 쉬운 탐색 동작이라 `consequentialHint:false` 로 둔다.
  상태를 실제로 파괴하는 도구를 추가할 경우 `consequentialHint:true` 로 사용자 확인을 유도할 것.
