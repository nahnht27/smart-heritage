# Smart Heritage — Java Backend Defense Guide / Hướng dẫn bảo vệ

Tài liệu này dành cho phần bảo vệ đồ án, tập trung vào **Java/Spring Boot
backend** của Smart Heritage. Nội dung bám sát code tại `main` (`6e11c0b`);
thuật ngữ kỹ thuật giữ tiếng Anh để khớp với code và tài liệu.

> Nguyên tắc khi trả lời: chỉ mô tả điều code thực sự làm. Nếu được hỏi về
> production, BLE thật, iOS, multilingual content hoặc feedback, trả lời rõ
> **PENDING / PLACEHOLDER / NOT IMPLEMENTED** theo
> [requirements-traceability.md](requirements-traceability.md).

## 1. Câu chuyện kiến trúc trong 60 giây

Smart Heritage là **client–server system** với **modular monolith**:

- `mobile/`: React Native + Expo, dành cho visitor; quét iBeacon bằng
  `react-native-beacon-kit`.
- `frontend/`: React + Vite, dành cho admin; build static và serve bằng Nginx.
- `backend/`: Java 17 + Spring Boot 3.2.5, REST API tại prefix `/api`.
- `PostgreSQL 16`: system of record; schema do **Flyway** quản lý.
- Docker Compose đóng gói dev và production-like stack; production thật chưa
  deploy.

Backend chia package theo layer:

```text
controller → service → repository → entity
                ↓
             dto / exception
security: filter + token provider + user details service
```

Điểm nhấn để bảo vệ:

1. **Separation of concerns**: controller chỉ HTTP, service chứa business rule
   và transaction, repository chứa query.
2. **Schema ownership**: Flyway, không để Hibernate tự sửa schema.
3. **Stateless security**: JWT + RBAC, không session.
4. **Idempotency**: `eventId` unique ở database.
5. **Analytics bằng SQL**: aggregate trong PostgreSQL, không load hết row.
6. **Trung thực phạm vi**: placeholder được ghi rõ, không claim quá.

## 2. Vì sao chọn modular monolith?

**Trả lời mẫu:**

> Domain của Smart Heritage nhỏ và có quan hệ chặt: site → artifact → multimedia,
> beacon → artifact, interaction → artifact/user/beacon. Một Spring Boot
> application cho phép dùng transaction và join trực tiếp, giảm độ phức tạp
> deploy. Team nhỏ nên microservices sẽ tạo thêm chi phí vận hành mà không có
> lợi ích tương xứng. Boundary giữa các module là package và quy tắc phụ thuộc,
> nên vẫn có thể tách service sau này nếu cần.

**Nếu hỏi "sao không microservices?"**

> Vì chưa có nhu cầu scale độc lập, chưa có team vận hành riêng và dữ liệu cần
> transaction nhất quán. Microservices sẽ kéo theo service discovery, network
> contract, distributed tracing, eventual consistency — không phù hợp deadline
> và quy mô hiện tại.

## 3. Luồng request và các layer

**Câu hỏi: Một request đi qua những đâu?**

> Request → `JwtAuthenticationFilter` (nếu có Bearer token) →
> `SecurityConfig` kiểm tra route rule → controller (`@Valid` request DTO) →
> service (`@Transactional` + business rule) → repository (Spring Data JPA) →
> PostgreSQL. Kết quả quay lại controller, được bọc trong `ApiResponse<T>`.
> Lỗi được `GlobalExceptionHandler` map sang envelope `success=false`. Riêng
> 401/403 phát sinh trong filter chain do `SecurityErrorHandler` ghi response.

**Câu hỏi: Vì sao controller không gọi repository trực tiếp?**

> Vì business rule và transaction boundary thuộc service. Ví dụ xoá artifact
> phải kiểm tra multimedia, interaction history và beacon trước khi xoá; nếu để
> controller gọi repository thì rule sẽ phân tán và khó test. Controller cũng
> không nên biết cách persist entity.

**Câu hỏi: `@Transactional` đặt ở đâu?**

> Ở service. Read method dùng `@Transactional(readOnly = true)`; write method
> dùng `@Transactional`. Controller không mở transaction. Nhờ vậy một nghiệp vụ
> nhiều bước (ví dụ tạo interaction: kiểm tra eventId, resolve user/artifact/
> beacon, save) nằm trong một unit of work.

## 4. Spring Boot và dependency injection

**Câu hỏi: Vì sao dùng constructor injection?**

> Constructor injection làm dependency rõ ràng, hỗ trợ `final`, dễ test bằng
> mock và tránh lỗi field injection/null. Các service và controller trong dự án
> đều nhận dependency qua constructor.

**Câu hỏi: `@Service`, `@Repository`, `@RestController` khác nhau thế nào?**

> Cả ba đều là Spring stereotype để component scan tạo bean. `@Service` đánh
> dấu business layer; `@Repository` đánh dấu persistence layer và có cơ chế
> translate exception; `@RestController` kết hợp `@Controller` + `@ResponseBody`
> để trả JSON. Về mặt runtime chúng đều là bean, khác nhau ở ngữ nghĩa và cách
> Spring xử lý.

**Câu hỏi: `@Configuration` + `@Bean` dùng ở đâu?**

> `SecurityConfig` tạo `SecurityFilterChain`, `PasswordEncoder` (BCrypt),
> `AuthenticationManager` và `CorsConfigurationSource`. Đây là nơi cấu hình
> cross-cutting security thay vì rải annotation khắp controller.

## 5. JPA, Hibernate và N+1

**Câu hỏi: `ddl-auto=validate` nghĩa là gì?**

> Hibernate chỉ kiểm tra schema database khớp với entity mapping, không tạo/sửa
> bảng. Nếu lệch, application fail-fast khi start. Điều này bảo vệ production
> khỏi việc Hibernate âm thầm đổi schema. Schema do Flyway quản lý.

**Câu hỏi: Entity quan hệ thế nào?**

> `Artifact` nhiều-một `HeritageSite`; `Multimedia` nhiều-một `Artifact`;
> `Beacon` nhiều-một `Artifact` (nullable); `VisitorInteraction` nhiều-một
> `Artifact` (bắt buộc), nhiều-một `User` (nullable) và nhiều-một `Beacon`
> (nullable). Không map collection hai chiều để tránh cascade ngoài ý muốn.

**Câu hỏi: N+1 là gì và dự án xử lý thế nào?**

> N+1 xảy ra khi load N entity rồi mỗi entity lazy-load thêm một quan hệ, tạo
> N+1 query. Dự án dùng `@EntityGraph` cho `ArtifactRepository` (fetch
> `heritageSite`) và `MultimediaRepository` (fetch `artifact`), và
> `LEFT JOIN FETCH` trong `BeaconRepository.findForResolutionByIdentity`. Nhờ
> vậy list response đọc được `siteName`/`artifactName` mà không phát sinh query
> phụ. Không dùng batch fetch toàn cục vì fetch graph rõ ràng và đủ cho các
> endpoint hiện tại.

**Câu hỏi: Vì sao dùng Specification?**

> Để filter động theo `siteId` và `keyword` mà không viết nhiều method query
> tổ hợp. `ArtifactSpecification.filter` và
> `HeritageSiteSpecification.hasKeyword` tạo predicate bằng Criteria API; service
> kiểm soát sort field bằng allow-list để tránh injection property.

**Câu hỏi: Sort an toàn thế nào?**

> Service chỉ cho phép `name`, `artifactId` (artifact) hoặc `name`, `siteId`
> (site), và `direction` chỉ `asc`/`desc`. Field lạ trả `400`. Luôn thêm
> tie-breaker để kết quả ổn định khi trùng giá trị sort.

**Câu hỏi: Vì sao dùng `Instant`?**

> `Instant` là thời điểm tuyệt đối, map với `timestamptz`. Tránh ambiguity múi
> giờ. Analytics bucket theo UTC bằng `AT TIME ZONE 'UTC'`, nên mọi client thấy
> cùng một cách chia ngày.

## 6. Transaction, concurrency và idempotency

**Câu hỏi: Làm sao chống ghi trùng interaction khi mobile retry?**

> Mobile tạo `eventId` UUID cho một logical event và giữ nguyên khi retry.
> Service gọi `findByEventId` để xử lý đường thường:
>
> - cùng event + cùng identity → trả `200`, không insert;
> - cùng event + khác identity → `409`;
> - chưa có → insert.
>
> Database có unique constraint `uk_visitor_interaction_event_id`. Nếu hai
> request đồng thời cùng vượt qua pre-check, request thứ hai bị database chặn;
> `GlobalExceptionHandler` nhận `DataIntegrityViolationException`, so tên
> constraint và trả `409` với message an toàn.

**Câu hỏi: Identity là gì?**

> Với event authenticated: cùng username (visitor ID có thể đổi sau khi cài
> lại app). Với event anonymous: không có user và cùng `visitorId`. Đây là quy
> tắc trong `VisitorInteractionService.isSameIdentity`.

**Câu hỏi: Vì sao không dùng pessimistic lock?**

> Vì unique constraint đã là guard đủ mạnh và rẻ hơn lock. Không cần khoá row
> khi insert; transaction + unique index xử lý race. Với CRUD admin hiện tại,
> dự án chấp nhận last-write-wins và chưa có `@Version` optimistic locking —
> đây là giới hạn đã ghi nhận.

**Câu hỏi: Nếu transaction fail giữa chừng?**

> Spring rollback toàn bộ unit of work. Ví dụ tạo interaction resolve beacon
> lỗi thì không có row nào được ghi. Không có distributed transaction vì chỉ
> một database.

## 7. Security: JWT và RBAC

**Câu hỏi: JWT flow?**

> `POST /api/auth/login` xác thực username/password bằng BCrypt. Nếu đúng,
> `JwtTokenProvider.generateToken(username, role)` tạo token ký HMAC với
> `app.jwt.secret`, subject là username, claim `role`, expiry
> `JWT_EXPIRATION_MS`. Client gửi `Authorization: Bearer <token>`.
> `JwtAuthenticationFilter` verify chữ ký/hạn, load `UserDetails` từ database
> và set `SecurityContext`.

**Câu hỏi: Vì sao filter load lại user từ DB?**

> Để role hiện tại trong database có hiệu lực ngay, không chỉ tin claim trong
> token. Đổi role sẽ có tác dụng ở request kế tiếp (trừ khi token bị chặn bởi
> expiry). Đánh đổi là một query mỗi request có token.

**Câu hỏi: RBAC hoạt động thế nào?**

> `CustomUserDetailsService` map role name thành authority `ROLE_<NAME>`.
> `SecurityConfig` quy định route public/protected; method security dùng
> `@PreAuthorize("hasRole('ADMIN')")` cho write và analytics. `hasRole('ADMIN')`
> thực chất kiểm tra authority `ROLE_ADMIN`. Frontend cũng chặn route nếu
> role không phải ADMIN, nhưng đó chỉ là UX — backend mới là enforcement.

**Câu hỏi: Vì sao CSRF disabled?**

> API dùng Bearer token, không dùng cookie/session. CSRF là tấn công lợi dụng
> cookie tự gửi; không có cookie auth thì bề mặt này không áp dụng. Session
> policy là `STATELESS`.

**Câu hỏi: CORS cấu hình ra sao?**

> Chỉ origin trong `CORS_ALLOWED_ORIGINS`, methods GET/POST/PUT/PATCH/DELETE/
> OPTIONS, headers `Authorization`, `Content-Type`, `Accept`; credentials false.
> Native mobile không bị CORS; Expo Web và Admin Web thì có.

**Câu hỏi: Điểm yếu security còn lại?**

> Không có rate limit/lockout cho login, không có refresh token/revocation,
> logout chỉ xoá token phía client, chưa có CSP/HSTS trong container, và
> production chưa deploy TLS thật. Đã ghi trong release readiness và
> traceability; không được nói là đã hoàn thiện.

## 8. Validation và xử lý lỗi

**Câu hỏi: Validation ở đâu?**

> Hai lớp: Bean Validation trên DTO (`@NotBlank`, `@Size`, `@Email`, `@Positive`,
> `@Min/@Max`, `@Pattern`) và business validation trong service (pagination,
> sort allow-list, tồn tại FK, delete guard, beacon mapping, time ordering,
> analytics range ≤90 ngày). Lý do: có rule cần query database hoặc phụ thuộc
> nhiều entity, không thể biểu diễn bằng annotation.

**Câu hỏi: Vì sao trả cùng một envelope cho lỗi?**

> Để client xử lý thống nhất: luôn có `success`, `message`; lỗi validation có
> thêm `errors`; lỗi runtime có `path`. `GlobalExceptionHandler` map
> `MethodArgumentNotValidException` → 400, `ResourceNotFoundException` → 404,
> duplicate/conflict → 409, `BadCredentialsException` → 401, unexpected → 500.
> Message 500 là generic để không lộ stack trace/SQL.

**Câu hỏi: `DataIntegrityViolationException` xử lý thế nào?**

> Chỉ map thành 409 khi message chứa tên constraint đã biết
> (`uk_visitor_interaction_event_id` hoặc `uk_beacon_identity`). Các vi phạm
> khác được log đầy đủ phía server và trả 500 generic. Đây là cách tránh vừa
> leak schema vừa biến lỗi không xác định thành 409 sai.

## 9. Database và Flyway

**Câu hỏi: Vì sao Flyway thay vì `ddl-auto=update`?**

> `ddl-auto=update` không có version history, không reproducible và có thể làm
> mất/đổi dữ liệu ngoài ý muốn. Flyway cho migration tuần tự, checksum,
> validate, và fail-fast nếu schema lệch. V1–V4 là forward-only; V4 idempotent
> để chuẩn hoá database do Hibernate tạo.

**Câu hỏi: Tại sao `baseline-on-migrate=false`?**

> Vì auto-baseline có thể chấp nhận một schema thiếu invariant mà không ai
> review. Database đang có dữ liệu phải được phân loại bằng script detection,
> backup, rồi baseline tường minh. Đây là quy trình trong
> `docs/database/schema-baseline.md`.

**Câu hỏi: V4 làm gì?**

> Chuẩn hoá index, default `enabled=true`, check range major/minor và FK
> `visitor_interaction.beacon_id → beacon.beacon_id ON DELETE SET NULL`. Nó
> kiểm tra constraint trùng tên có đúng biểu thức không; nếu sai thì fail rõ
> ràng thay vì tự drop. FK được so khớp `conkey`/`confkey`, không chỉ tên.

**Câu hỏi: Xoá beacon có mất analytics không?**

> Không. FK dùng `ON DELETE SET NULL`; interaction giữ lại và `beacon_id`
> thành NULL. Đây là quyết định có chủ đích để bảo toàn lịch sử.

**Câu hỏi: Vì sao xoá site/artifact bị chặn?**

> Vì service kiểm tra dependent rows và trả `409` với message thân thiện. DB
> FK cũng ngăn mất toàn vẹn, nhưng message sẽ khó hiểu; service guard cho UX
> tốt hơn và test được.

## 10. Analytics

**Câu hỏi: Analytics tính ở đâu?**

> Trong PostgreSQL. `VisitorInteractionRepository` có JPQL aggregate cho count,
> unique visitors, type, popular artifacts, language; một native query cho
> daily series. Service zero-fill ngày thiếu. Không load toàn bộ interaction
> vào JVM.

**Câu hỏi: Vì sao dùng `UNBOUNDED_FROM/TO` thay vì null?**

> Vì PostgreSQL không suy luận được kiểu của JDBC parameter `NULL` trong biểu
> thức `(:param IS NULL OR ...)`. Dùng bound cụ thể (`1970` đến `9999`) cho
> trường hợp không filter, trong khi response vẫn trả `from/to` gốc là null.

**Câu hỏi: Tại sao giới hạn 90 ngày?**

> Để bound chi phí query và tránh dashboard quét bảng quá lớn. UI cũng validate
> cùng giới hạn. Đây là business rule ở cả `VisitorInteractionController` và
> `DashboardPage` (client-side UX).

**Câu hỏi: Unique visitors tính thế nào?**

> `COUNT(DISTINCT visitor_id)` trong khoảng `[from,to)`. Vì `visitor_id` là
> UUID ổn định theo installation, không phải user ID.

## 11. Testing

**Câu hỏi: Test gồm những gì?**

> - Unit/slice tests trên H2: controller, service, security, CORS, exception
>   handler.
> - PostgreSQL integration tests (Failsafe): interaction persistence/idempotency,
>   migration, schema detector, artifact query optimization, beacon integrity.
> - Frontend Vitest/lint/build; mobile Jest.
> - CI thêm backup/restore disposable, Docker build, public smoke và production
>   packaging smoke.
>
> H2 không phải bằng chứng cho migration; migration được test trên PostgreSQL
> thật và có minimum test count trong CI.

**Câu hỏi: Test idempotency thế nào?**

> `VisitorInteractionServiceTest` kiểm tra replay cùng identity trả
> `created=false`; `VisitorInteractionPostgresIT` kiểm tra unique constraint/
> race path trên PostgreSQL thật.

## 12. Các câu hỏi "khó" và cách trả lời trung thực

**"Hệ thống có multilingual không?"**

> Chưa. Backend chỉ lưu `language_code` trên interaction và
> `preferred_language_id` trên user; không có bảng translation, không có
> language catalogue, không có logic chọn nội dung theo ngôn ngữ. Đây là
> `NOT IMPLEMENTED` trong traceability.

**"Feedback và favorite đã xong chưa?"**

> Chưa. Mobile feedback chỉ hiện alert local; favorite/history dùng mock data.
> Không có bảng/API tương ứng. Admin feedback/translation là placeholder page.

**"Bản đồ di sản?"**

> Là placeholder `map.tsx`, chưa tích hợp map SDK. Beacon deployment map cũng
> chưa có.

**"Đã test BLE thật chưa?"**

> Code quét, debounce, resolve và ghi interaction đã có và có unit test, nhưng
> chưa có bằng chứng trên thiết bị BLE thật/iOS thật. Trạng thái là
> `PENDING VERIFICATION`, không phải đã xác nhận.

**"Đã deploy production chưa?"**

> Chưa. Có production Compose, Nginx, health check, backup/restore và CI
> production-smoke trên môi trường ephemeral. Domain, TLS, server, registry và
> credentials production vẫn pending.

**"Tại sao không có OpenAPI/Swagger?"**

> Đó là NFR-M02 và hiện chưa implement; không có springdoc dependency hay file
> spec generated. API overview trong repo là tài liệu viết tay từ controller/DTO.

**"Nếu admin sửa cùng lúc thì sao?"**

> Hiện là last-write-wins, không có `@Version` hay `If-Match`. Đây là giới hạn
> đã biết; nếu cần có thể thêm optimistic locking và trả 409/412.

## 13. Kịch bản demo gợi ý (5–7 phút)

1. Mở Swagger? **Không có** — thay bằng `curl /api/health` hoặc Postman.
2. Đăng nhập admin, chỉ ra JWT được lưu và route `/dashboard` được bảo vệ.
3. Tạo/sửa artifact, chỉ ra response envelope và validation lỗi.
4. Tạo beacon, resolve bằng UUID/major/minor, thử beacon disabled → 404.
5. Mở dashboard, đổi range, export CSV.
6. Gửi interaction lần 1 → 201; gửi lại cùng `eventId` → 200; đổi visitor →
   409.
7. Nói rõ phần placeholder (map/feedback/favorite) và phần pending (BLE thật,
   production).

## 14. Từ vựng nhanh

| Term | Nghĩa trong dự án |
|---|---|
| Modular monolith | Một app Spring Boot, module theo package |
| DTO | Object cho request/response, tách khỏi entity |
| Entity | JPA mapping với bảng |
| Repository | Spring Data interface cho query |
| Specification | Criteria API filter động |
| EntityGraph | Fetch join để tránh N+1 |
| Idempotency | Cùng `eventId` retry không tạo row mới |
| RBAC | Phân quyền theo `ADMIN`/`VISITOR` |
| Flyway | Versioned migration, forward-only |
| Graceful shutdown | Hoàn tất request trong timeout trước khi tắt |
| Envelope | `ApiResponse<T>` bọc mọi kết quả |

## 15. Tài liệu liên quan

- [System architecture](system-architecture.md)
- [Java backend architecture](java-backend-architecture.md)
- [Database ERD](database-erd.md)
- [API overview](api-overview.md)
- [Sequence diagrams](sequence-diagrams.md)
- [Architecture decisions](architecture-decisions.md)
- [Requirements traceability](requirements-traceability.md)
