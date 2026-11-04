## Summary

<!-- Mô tả ngắn gọn thay đổi và lý do. -->

## Related task

- Jira / task:
- Branch:
- Related PR/issue:

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] CI/CD or tooling
- [ ] Documentation
- [ ] Breaking change

## Test evidence

<!-- Điền kết quả thực tế, không chỉ đánh dấu. Ghi rõ lệnh và số test. -->

| Check | Command | Result |
|-------|---------|--------|
| Backend | `cd backend && ./mvnw -B test` | |
| Frontend | `cd frontend && npm run lint && npm run build` | |
| Mobile Jest | `cd mobile && npm ci --legacy-peer-deps && npm test -- --ci` | |
| Docker | `docker compose config --quiet && docker compose build` | |
| Smoke (public) | `python3 scripts/integration/smoke-test.py` | |

- CI run URL:
- Ghi chú test bị skip / không chạy được:

## API compatibility

- [ ] Không thay đổi API contract
- [ ] Có thay đổi API contract và đã cập nhật `docs/integration/api-contract.md`
- [ ] Không áp dụng

## Secret / environment safety

- [ ] Không commit `.env`, credentials, token, JWT secret hoặc private key
- [ ] Không log secret/token trong code, test hoặc CI
- [ ] Chỉ dùng placeholder/an toàn cho biến môi trường trong CI
- [ ] Không commit file untracked dùng riêng trên máy dev

## Review checklist

- [ ] Đã self-review `git diff`
- [ ] `git diff --check` sạch
- [ ] Không có generated files không cần thiết
- [ ] Tài liệu liên quan đã cập nhật
- [ ] Không ảnh hưởng Task 1–2 hoặc module ngoài phạm vi

## CI notes

- Required checks: `backend-test`, `frontend-checks`, `mobile-tests`, `docker-build`.
- `integration-smoke` chỉ chạy public-only, không có credentials.
- `mobile-static-analysis` là **advisory**, không phải required check (technical
  debt TypeScript/ESLint có sẵn).
