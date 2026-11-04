# CI/CD — GitHub Actions

Pipeline chất lượng tự động cho Smart Heritage, chạy trước khi merge Pull
Request. Workflow duy nhất: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## 1. Kiến trúc

```
pull_request (main) ─┐
push (main, LTJ-*)  ─┼─> CI workflow
workflow_dispatch   ─┘
                        ├── backend-test               (required)
                        ├── frontend-checks            (required)
                        ├── mobile-tests               (required)
                        ├── mobile-static-analysis     (advisory)
                        ├── docker-build               (required)
                        └── integration-smoke          (required sau khi ổn định)
```

Các job chạy song song trên `ubuntu-latest` và độc lập với nhau, trừ
`integration-smoke` tự dựng stack riêng.

### Trigger

| Sự kiện | Điều kiện |
|---------|-----------|
| `pull_request` | Target `main` |
| `push` | `main` và các branch `LTJ-*` |
| `workflow_dispatch` | Chạy thủ công từ tab Actions |

### Cấu hình chung

- `permissions: contents: read` — pipeline chỉ đọc repository.
- `concurrency` theo workflow + ref; PR cũ bị huỷ khi có commit mới.
- Mỗi job có `timeout-minutes` riêng.
- Cache Maven (`actions/setup-java`) và npm (`actions/setup-node`).
- Không có secret, token hay credentials thật trong workflow.

## 2. Jobs

| Job | Gate | Lệnh chính | Ghi chú |
|-----|------|------------|---------|
| `backend-test` | **Required** | `cd backend && ./mvnw -B test` | Java 17 (Temurin), Maven Wrapper; upload Surefire reports |
| `frontend-checks` | **Required** | `npm ci`, `npm run lint`, `npm run build` | `build` chạy `tsc -b && vite build` |
| `mobile-tests` | **Required** | `npm ci`, `npm test -- --ci --coverage` | Upload coverage artifact |
| `mobile-static-analysis` | **Advisory** | `npx tsc --noEmit`, `npm run lint` | `continue-on-error: true`; technical debt có sẵn |
| `docker-build` | **Required** | `docker compose config --quiet`, `docker compose build` | Compose V2; chỉ build image backend (Compose hiện chỉ có backend) |
| `integration-smoke` | **Required sau khi ổn định** | `docker compose up -d --build --wait`, smoke public-only | Stack ephemeral, teardown `down -v` |

### Backend

- Dùng Maven Wrapper (`./mvnw`) với wrapper 3.2.0; runner được setup JDK 17.
- `mvn test` không bị skip. Test fail → job fail.
- Report: artifact `backend-surefire-reports` (giữ 7 ngày).

### Frontend Admin

- Cài đúng lockfile bằng `npm ci`.
- `npm run lint` và `npm run build` là lỗi thật → job fail.
- Không thêm compiler flag hay bỏ qua lỗi để làm xanh pipeline.

### Mobile

- Cài dependency bằng `npm ci --legacy-peer-deps`. Lý do: lockfile hiện có xung
  đột peer dependency có sẵn giữa `@babel/preset-env@8` (yêu cầu
  `@babel/core@8`) và `babel-preset-expo` (dùng `@babel/core@7`). Flag này vẫn
  cài đúng lockfile, không sửa app dependency và không bỏ qua test.
- `npm test` chạy Jest; baseline gần nhất 18 test (không hardcode).
- Coverage và output được lưu ở artifact `mobile-coverage`.
- `mobile-static-analysis` chạy typecheck + lint nhưng **không chặn PR** trong
  giai đoạn xử lý technical debt. Job này hiển thị cảnh báo, không phải bằng
  chứng chất lượng PASS.

### Docker

- `docker compose config --quiet` kiểm tra cú pháp Compose với biến môi trường
  placeholder an toàn.
- `docker compose build` build image backend và kiểm tra Dockerfile/dependency.
- Không push registry, không deploy trong Task 3.
- Frontend chưa có Dockerfile/Compose service — thuộc phạm vi Task 4, không tự
  thêm ở đây.

### Integration smoke

- Stack PostgreSQL + backend ephemeral ngay trên runner.
- Chỉ chạy **public-only** (health, public content, invalid login); không truyền
  credentials, không bật `ENABLE_INTERACTION_WRITE`.
- Authenticated/write scenarios hiển thị `SKIP` đúng thiết kế.
- `docker compose down -v --remove-orphans` luôn chạy ở cuối job.
- Full authenticated/write smoke vẫn chạy thủ công theo
  [`scripts/integration/README.md`](../../scripts/integration/README.md).

## 3. Required checks và branch protection

Required checks đề xuất cho `main`:

- `backend-test`
- `frontend-checks`
- `mobile-tests`
- `docker-build`
- `integration-smoke` (sau khi job này chạy ổn định)

**Không** đặt `mobile-static-analysis` làm required cho tới khi technical debt
TypeScript/ESLint được xử lý.

Cấu hình (cần quyền admin repository):

1. GitHub → **Settings** → **Branches** → **Add branch protection rule** (hoặc
   sửa rule cho `main`).
2. Bật **Require a pull request before merging**.
3. Bật **Require status checks to pass before merging**.
4. Thêm các check ở trên (GitHub chỉ gợi ý check đã từng chạy ít nhất một lần).
5. Không thêm `mobile-static-analysis (advisory)`.

Pipeline không tự bật branch protection. Nếu tài khoản hiện tại không có quyền
admin, nhờ maintainer cấu hình theo các bước trên.

## 4. Xem và xử lý kết quả

```bash
# Danh sách run gần nhất
gh run list --branch <branch> --limit 10

# Xem chi tiết một run
gh run view <run-id>

# Xem log job bị fail
gh run view <run-id> --log-failed

# Re-run sau khi sửa
gh run rerun <run-id>
```

Trên GitHub: tab **Actions** → chọn run → chọn job để xem log/artifact.

Khi job fail:

1. Đọc log đúng job, đối chiếu lệnh local tương ứng.
2. Sửa nguyên nhân gốc; không dùng `|| true`, không skip test.
3. Chạy lại lệnh local trước khi push.
4. Nếu fail do hạ tầng runner (network/cache), re-run job.

## 5. Chạy lại local

```bash
# Backend (cần Java 17 + Maven Wrapper; hoặc chạy trong Docker)
cd backend && ./mvnw -B test

# Frontend
cd frontend && npm ci && npm run lint && npm run build

# Mobile (required)
cd mobile && npm ci --legacy-peer-deps && npm test -- --ci --coverage

# Mobile static analysis (advisory)
cd mobile && npx tsc --noEmit && npm run lint

# Docker
docker compose config --quiet && docker compose build

# Smoke public-only
docker compose up -d --build --wait
python3 scripts/integration/smoke-test.py
docker compose down -v
```

Máy chỉ có Compose legacy dùng `docker-compose` tương đương; ưu tiên Compose V2.

## 6. Technical debt đã biết (mobile static analysis)

Các lỗi sau có từ trước Sprint 4 và là lý do job tĩnh chỉ advisory:

- Thiếu type declaration cho `*.module.css` (ví dụ
  `src/components/animated-icon.web.tsx`).
- Thiếu typing cho side-effect import `@/global.css`.
- ESLint `react-hooks/set-state-in-effect` trong
  `src/hooks/use-color-scheme.web.ts`.
- Xung đột peer dependency Babel 7/8 trong `package.json`/lockfile khiến
  `npm ci` thuần fail; pipeline dùng `--legacy-peer-deps` như biện pháp tạm
  thời. Nên xử lý gốc (thống nhất Babel 7 hoặc 8) rồi bỏ flag.

Không được tắt ESLint/TypeScript strict hoặc dùng `|| true` để che các lỗi này.
Khi debt được xử lý, chuyển `mobile-static-analysis` thành required.

`mobile/eslint.config.js` trên máy dev là file untracked, **không** được commit.
CI chạy đúng trạng thái repository; vì vậy lint mobile có thể báo thiếu config
cho tới khi config được đưa vào Git một cách chủ động.

## 7. Giới hạn hiện tại

- Chưa deploy, chưa push image registry.
- Chưa có frontend Dockerfile/Compose service (Task 4).
- Smoke CI chỉ public-only; full write smoke cần fixture an toàn và chạy thủ công.
- Mobile static analysis chưa phải quality gate.
- Branch protection phải cấu hình thủ công bởi maintainer.
