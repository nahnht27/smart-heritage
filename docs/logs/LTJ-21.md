# Log: Branch LTJ-21

## Thông tin chung
- **Branch:** `LTJ-21`
- **Task:** Implement Core JPA Entities and Repositories
- **Sprint:** M2 — Sprint 2: Database & Backend Data Foundation
- **Goal:** Xây dựng các JPA Entity và Spring Data JPA Repository cho nhóm dữ liệu cốt lõi, bảo đảm ánh xạ phù hợp với thiết kế cơ sở dữ liệu đã thống nhất.

## Các công việc đã hoàn thành
### 1. Xây dựng các JPA Entity cốt lõi
Tạo 3 Entity trong package `com.university.backend.entity`:
- **`HeritageSite.java`:** Ánh xạ bảng `heritage_site`, gồm các trường `site_id`, `name`, `description`, `address`, `latitude` và `longitude`.
- **`Artifact.java`:** Ánh xạ bảng `artifact`, gồm các trường `artifact_id`, `name`, `description` và quan hệ với `HeritageSite`.
- **`Multimedia.java`:** Ánh xạ bảng `multimedia`, gồm các trường `multimedia_id`, `type`, `title`, `url` và quan hệ với `Artifact`.

### 2. Thiết lập ánh xạ và ràng buộc dữ liệu
- Sử dụng các annotation thuộc `jakarta.persistence` phù hợp với Spring Boot hiện tại.
- Khai báo khóa chính tự tăng bằng `@Id` và `@GeneratedValue`.
- Thiết lập quan hệ **Many-to-One** giữa `Artifact` và `HeritageSite`, sử dụng khóa ngoại `site_id`.
- Thiết lập quan hệ **Many-to-One** giữa `Multimedia` và `Artifact`, sử dụng khóa ngoại `artifact_id`.
- Sử dụng `FetchType.LAZY` cho các quan hệ nhằm tránh tải dữ liệu liên quan không cần thiết.
- Khai báo các kiểu dữ liệu và ràng buộc như `nullable`, `length`, `precision` và `scale` phù hợp với các trường tương ứng.

### 3. Xây dựng Spring Data JPA Repository
Tạo 3 Repository trong package `com.university.backend.repository`:
- `HeritageSiteRepository.java`
- `ArtifactRepository.java`
- `MultimediaRepository.java`

*Các Repository kế thừa `JpaRepository` với kiểu khóa chính `Integer`, cho phép sử dụng các thao tác truy vấn và quản lý dữ liệu cơ bản mà không cần viết lại các phương thức CRUD thông thường.*
