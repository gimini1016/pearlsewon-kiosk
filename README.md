# 펄세권 키오스크 프로토타입

실제 AI 채팅을 쓰려면 `run.command`를 실행하거나 터미널에서 이 폴더로 이동해 `python3 server.py --open`을 실행합니다. 브라우저에서 `http://127.0.0.1:8765`를 열면 됩니다. 별도 패키지 설치 없이 Python 3로 실행합니다.

서버는 현재 환경에서 `/Users/yangjimin/Documents/생성형ai/펄세권/.env`의 `OPENAI_API_KEY`를 읽습니다. 키를 HTML이나 소스 ZIP에 복사하지 않습니다. 다른 기기에서는 이 폴더에 `.env`를 만들거나 `PEARL_ENV_FILE`에 사용할 설정 파일 경로를 지정합니다. 기본 모델은 `gpt-4.1-mini`이고 `OPENAI_MODEL`로 변경할 수 있습니다.

`dist/index.html`을 파일로 직접 열면 기존 버튼·규칙 기반 시연을 사용할 수 있습니다. 실제 AI 채팅은 위의 서버 주소에서 사용합니다. 글꼴을 불러오지 못하면 기기의 기본 글꼴로 표시됩니다.

## 반영 내용

- 기존 주문 흐름, 맛 지도, 추천 메뉴 3개, 전체 메뉴
- 뒤로가기와 주문 상태 유지, 장바구니 중복 추가 방지
- 전체 옵션과 선택 상태 표시, 중 사이즈 기본 선택
- 사용자 메시지와 응답 기록, 라이트·다크 전환
- 메뉴별 음료색, 토핑 6종, 추가 옵션 6종의 컵 표현
- 품절·당도·온도·얼음·추가 옵션 제한 및 실제 데이터 기준 가격 계산
- 결제 뒤 번호 입력, 주문 번호, 알림 미리보기

## 데이터와 시연 범위

제공된 26개 메뉴, 옵션 규칙, 표현 사전, RAG 문서 및 매장 데이터를 사용했습니다. `data/`에는 제공된 원본 자료를 보관했습니다. `requirements.md`는 구현팀 전달 문서입니다.

제공 데이터에는 소 사이즈 가격이 없습니다. 소 버튼은 ‘미제공’으로 표시하고 비활성화합니다. 중·대 또는 중만 제공하는 메뉴의 가격과 규칙을 그대로 사용합니다.

서버 주소에서는 실제 OpenAI 모델이 자유로운 표현을 해석합니다. 제공된 `rag_docs.jsonl`에서 관련 문서를 로컬 문자 단위 검색으로 찾아 현재 주문과 함께 모델에 전달합니다. 벡터 DB나 외부 파일 업로드는 사용하지 않습니다. 응답은 정해진 주문 동작 형식으로 받아 서버가 메뉴·품절·옵션·가격을 다시 확인합니다. 변경할 수 없는 옵션은 안내하고 주문 값을 유지합니다.

모델 연결은 [OpenAI Docs의 Responses API 및 Structured Outputs 안내](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)를 참고했습니다. 대화는 최근 10개 메시지까지 요청에 포함하며 전화번호 입력 상태는 보내지 않습니다. API 응답 저장 옵션은 `store: false`로 설정했습니다. 호출 실패 시 규칙 응답을 실제 AI 응답처럼 대신 표시하지 않고 오류를 안내합니다.

실제 결제, 직원 호출, 문자·알림톡 발송은 하지 않습니다. 전화번호는 입력 중 메모리에만 두고 완료 화면에서는 마지막 네 자리만 남기며, 새 주문 시 초기화합니다.

## 확인한 흐름

매장/포장 → 맛 선택 → 추천 후보 → 메뉴·옵션 → 장바구니 → 결제 시연 → 알림 번호(선택) → 완료

Chrome에서 메뉴 선택, 3개 후보, 기본 사이즈, 채팅 변경, 설명 질문, 뒤로가기, 테마, 품절, 복수 주문, 결제·알림 및 전체 메뉴 화면을 확인했습니다. 기존 UI 검사 결과는 로컬 `verification.json`에 있습니다. 서버 규칙은 `python3 -m unittest test_server.py`로 검사합니다. 실제 모델로 자연어 주문, 사이즈·당도·치즈폼 변경, 펄 설명을 확인한 결과는 `ai-verification.json`에 있습니다.

## 소스

`enhancements.js`, `enhancements.css`가 화면과 기존 시연을, `ai-client.js`와 `server.py`가 실제 AI 연결을 담당합니다. `python3 build.py`는 저장소의 `templates/`와 `data/`에서 실행 가능한 HTML을 생성합니다. 다른 기기에서도 같은 명령으로 재빌드할 수 있습니다.

## Vercel 배포

`vercel.json`에 정적 화면 빌드와 Python API 함수 설정이 들어 있습니다. 프레임워크는 Other로, 빌드 명령은 `python3 build.py`, 결과 폴더는 `dist`로 설정합니다. `/api/chat`은 실제 AI 요청을, `/api/health`는 키 설정 여부를 처리합니다. Vercel의 [Python 함수 안내](https://vercel.com/docs/functions/runtimes/python/api-directory)를 기준으로 구성했습니다.

Vercel 프로젝트 환경변수에 `OPENAI_API_KEY`를 등록합니다. 필요하면 `OPENAI_MODEL`도 지정합니다. 기본 모델은 `gpt-4.1-mini`입니다. `.env`, Vercel 연결 정보, API 키는 GitHub에 커밋하지 않습니다.

GitHub 저장소와 Vercel 프로젝트를 연결하면 `main` 브랜치의 변경을 자동 배포할 수 있습니다. 결제와 알림은 배포 후에도 시연으로 동작합니다.
