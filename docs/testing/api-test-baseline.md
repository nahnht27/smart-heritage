
## 1. Objective
The purpose of this task is to establish a baseline for testing the Smart Heritage backend APIs. The baseline focuses on checking the health endpoint, database connectivity, authentication APIs, request validation, and authentication failure handling.
The existing Spring Boot and Maven test framework is used to run the backend tests.
## 2. Testing Environment
Project: Smart Heritage
Backend Framework: Spring Boot 3.2.5
Programming Language: Java 17
Build and Test Tool: Maven
Database: PostgreSQL 16
Backend Port: 8080
Testing Framework: JUnit and Spring Boot Test
API Testing: MockMvc for controller tests
## 3. Test Execution Summary

The backend tests were executed using Maven on October 16, 2026.

| Item | Result |
|---|---|
| Total Tests | 19 |
| Tests Passed | 19 |
| Failures | 0 |
| Errors | 0 |
| Skipped | 0 |
| Build Result | BUILD SUCCESS |
| Total Execution Time | 13.046 seconds |

The `AuthControllerTest` class executed 18 tests successfully. The overall Maven test execution reported 19 tests, with no failures, errors, or skipped tests.
## 4. Test Cases

### TC01 — Backend Test Execution

- **Objective:** Verify that the existing backend test suite can run successfully.

| Item | Description |
|---|---|
| Test Procedure | 1. Navigate to the backend directory.<br>2. Execute the Maven test command.<br>3. Check the test summary and build result. |
| Expected Result | The tests complete without failures or errors, and Maven reports a successful build. |
| Actual Result | Maven reported 19 tests, 0 failures, 0 errors, and 0 skipped tests. |
| Status | PASS |
| Evidence | Maven test execution on October 16, 2026, with `BUILD SUCCESS`. |

### TC02 — PostgreSQL Container Startup

- **Objective:** Verify that the PostgreSQL database container starts successfully in the Docker environment.

| Item | Description |
|---|---|
| Test Procedure | 1. Start the project services using Docker Compose.<br>2. Check running containers using `docker ps`.<br>3. Verify the PostgreSQL container health status. |
| Expected Result | The PostgreSQL container is running, reports a healthy status, and has the correct port mapping. |
| Actual Result | The `smart-heritage-db` container was observed running with a healthy status. The database port was mapped to port 5432. |
| Status | PASS |
| Evidence | Docker container status observed during the environment check. |

### TC03 — Backend–PostgreSQL Connection

- **Objective:** Verify that the Spring Boot backend can establish a connection to PostgreSQL.

| Item | Description |
|---|---|
| Test Procedure | 1. Start the backend service.<br>2. Inspect the backend startup logs.<br>3. Check the database connection pool and JPA initialization messages. |
| Expected Result | The backend establishes a database connection, the connection pool starts successfully, and the JPA persistence layer initializes without errors. |
| Actual Result | The backend logs showed a PostgreSQL JDBC connection being added to HikariCP, the connection pool starting successfully, and the JPA EntityManagerFactory being initialized. |
| Status | PASS |
| Evidence | Backend startup logs showed `HikariPool-1 - Start completed` and successful JPA initialization. |

### TC04 — Health Endpoint

- **Objective:** Verify that the backend health endpoint responds successfully.
- **Endpoint:** `GET /api/health`

| Item | Description |
|---|---|
| Test Procedure | 1. Start the backend service.<br>2. Send a GET request to `/api/health`.<br>3. Check the HTTP status code and response body. |
| Expected Result | HTTP 200 OK, and the response indicates that the backend is running. |
| Actual Result | The endpoint returned HTTP 200 with the following response: `{"status":"UP","timestamp":"2026-10-15T16:01:30.722107192"}` |
| Status | PASS |
| Evidence | Successful health endpoint response observed during the environment check. |

### TC05 — Authentication API Contract

- **Objective:** Verify that the authentication APIs follow the agreed request and response contract.
- **Test Cases:** `register_valid`, `login_valid`, `envelope`

| Item | Description |
|---|---|
| Test Procedure | 1. Submit a valid registration request.<br>2. Verify the registration response fields.<br>3. Log in with valid credentials.<br>4. Verify the access token and user information.<br>5. Verify the standard response envelope.<br>6. Confirm the API formats against the contract agreed upon with the M1 team. |
| Expected Result | Registration returns user information; login returns an access token and user information; sensitive information such as the password hash is not exposed; request and response formats follow the agreed API contract. |
| Actual Result | Existing tests cover successful registration, successful login, and the standard response envelope. The Maven test execution completed with 19 tests, 0 failures, 0 errors, and 0 skipped tests. The API contract was discussed and agreed upon with the M1 team. |
| Status | PASS |
| Evidence | Successful Maven test execution on October 16, 2026, and confirmation of the API contract with the M1 team. |

### TC06 — Invalid Request Validation

- **Objective:** Verify that invalid requests and malformed JSON are rejected appropriately.
- **Test Cases:** `register_missing`, `register_badEmail`, `validationFormat`, `malformed`

| Item | Description |
|---|---|
| Test Procedure | 1. Submit a registration request with required fields missing.<br>2. Submit a registration request with an invalid email address.<br>3. Submit a request that triggers validation errors.<br>4. Submit malformed JSON.<br>5. Check the HTTP status code and error response. |
| Expected Result | Invalid requests return HTTP 400 Bad Request; validation errors are reported where expected; malformed JSON is rejected with an appropriate error response. |
| Actual Result | The relevant validation tests are present in `AuthControllerTest`. The Maven test execution completed with 19 tests, 0 failures, 0 errors, and 0 skipped tests. |
| Status | PASS |
| Evidence | Successful Maven test execution on October 16, 2026. |

### TC07 — Authentication Failure

- **Objective:** Verify that invalid credentials and unauthenticated requests are rejected.
- **Test Cases:** `login_wrongPw`, `login_noUser`, `profile_noToken`

| Item | Description |
|---|---|
| Test Procedure | 1. Attempt to log in with an incorrect password.<br>2. Attempt to log in with a nonexistent username.<br>3. Access the protected profile endpoint without an access token.<br>4. Check the HTTP status codes and error responses. |
| Expected Result | Invalid login credentials return HTTP 401 Unauthorized; nonexistent users cannot log in; requests to protected endpoints without a valid token are rejected; sensitive user information is not exposed. |
| Actual Result | The relevant authentication failure tests are present in `AuthControllerTest`. The Maven test execution completed with 19 tests, 0 failures, 0 errors, and 0 skipped tests. |
| Status | PASS |
| Evidence | Successful Maven test execution on October 16, 2026.
## 5. Test Result Summary

| Test ID | Test Case | Status |
|---|---|---|
| TC01 | Backend Test Execution | PASS |
| TC02 | PostgreSQL Container Startup | PASS |
| TC03 | Backend–PostgreSQL Connection | PASS |
| TC04 | Health Endpoint | PASS |
| TC05 | Authentication API Contract | PASS |
| TC06 | Invalid Request Validation | PASS |
| TC07 | Authentication Failure | PASS |

All seven test cases are marked as PASS based on the recorded test results and environment checks. The authentication API contract was also discussed and agreed upon with the M1 team.
## 6. Conclusion
The API test baseline records the results of the existing backend test suite and the available environment checks.
The Maven test execution on October 16, 2026, completed successfully with 19 tests, 0 failures, 0 errors, and 0 skipped tests.
The available evidence also indicates that the PostgreSQL container started successfully, the backend initialized its database connection, and the health endpoint returned a successful response.
The authentication tests cover successful registration and login, response structure, invalid request validation, and authentication failure scenarios. The authentication API contract has also been discussed and agreed upon with the M1 team.
These results establish the current testing baseline for the Smart Heritage backend. Additional test cases should be added when new APIs or requirements are implemented.


