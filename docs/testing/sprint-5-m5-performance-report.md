
# SPRINT 5 - M5 API PERFORMANCE & RELIABILITY TEST REPORT

**Project:** Smart Heritage  
**Sprint:** Sprint 5  
**Task ID:** S5-M5-02  
**Task Name:** API Performance & Reliability Testing  
**Role:** M5 - QA / Analytics / Reliability  
**Test Date:** November 12, 2026  
**Test Environment:** Local Docker QA Environment  
**Testing Tools:** Grafana k6, Docker Stats, PostgreSQL

---

## 1. Overview

### 1.1 Objective

The objective of S5-M5-02 is to evaluate the performance and reliability of the Smart Heritage backend APIs under controlled workloads.

The testing process measures response times, request throughput, error rates, concurrent request handling, and CPU/RAM resource utilization.

The results are used to establish a reproducible backend performance baseline and identify potential reliability issues.

### 1.2 Testing Scope

| ID | Component | Testing Scope |
|---|---|---|
| 1 | Backend Health | Verify API availability and response time |
| 2 | Heritage Sites | Evaluate heritage site retrieval performance |
| 3 | Artifacts | Evaluate artifact listing and detail retrieval |
| 4 | Beacon Resolution | Evaluate beacon identification performance |
| 5 | Analytics | Evaluate authenticated analytics retrieval |
| 6 | PostgreSQL | Observe database resource utilization |
| 7 | Backend Container | Measure CPU and RAM usage under load |

### 1.3 Expected Outcomes

| ID | Expected Outcome |
|---|---|
| EO-01 | Critical API endpoints respond successfully |
| EO-02 | HTTP request failure rate remains below 1% |
| EO-03 | Response validation checks achieve 100% success |
| EO-04 | The p95 response time remains below 500 ms where configured |
| EO-05 | The backend remains responsive during the tested concurrency levels |
| EO-06 | CPU and RAM usage are recorded during controlled load testing |

---

## 2. Test Environment

### 2.1 System Configuration

| Component | Configuration |
|---|---|
| Application | Smart Heritage |
| Backend Framework | Spring Boot |
| Database | PostgreSQL |
| Backend QA Container | `smart-heritage-backend-qa` |
| Database Container | `smart-heritage-db` |
| Backend QA Port | `8081` |
| Backend Internal Port | `8080` |
| Backend QA URL | `http://localhost:8081` |
| Docker Internal URL | `http://smart-heritage-backend-qa:8080` |
| QA Database | `smart_heritage_test` |
| Performance Tool | Grafana k6 v2.4.0 |
| Monitoring Tool | Docker Stats |
| Test Execution | Docker-based |
| Maximum Tested Virtual Users | 10 |

### 2.2 Test Isolation

All performance tests targeted the dedicated QA backend connected to the PostgreSQL test database.

| Environment | Configuration | Purpose |
|---|---|---|
| Development Backend | `localhost:8080` | Development activities |
| QA Backend | `localhost:8081` | Performance and reliability testing |
| Development Database | `smart_heritage` | Development data |
| QA Database | `smart_heritage_test` | Test data |

The performance scripts used HTTP GET requests and did not intentionally modify the development database.

### 2.3 Tested API Endpoints

| ID | Method | Endpoint | Authentication |
|---|---|---|---|
| API-01 | GET | `/api/health` | Public |
| API-02 | GET | `/api/heritage-sites` | Public |
| API-03 | GET | `/api/artifacts` | Public |
| API-04 | GET | `/api/artifacts/48` | Public |
| API-05 | GET | `/api/beacons/resolve` | Public |
| API-06 | GET | `/api/analytics/interactions/summary` | ADMIN |

---

## 3. Testing Methodology

### 3.1 Performance Testing Approach

Grafana k6 was used to generate simulated HTTP requests against the QA backend.

The workload was executed using controlled numbers of Virtual Users (VUs), allowing response times, throughput, and request failures to be measured.

### 3.2 Test Scenarios

| Test Case | Scenario | Virtual Users | Duration | Objective |
|---|---|---|---|---|
| PERF-01 | Smoke Test | 1 | 5 iterations | Verify basic API availability |
| PERF-02 | Baseline Test 1 | 5 | 30 seconds | Establish initial response time baseline |
| PERF-03 | Reliability Test | Up to 10 | 60 seconds | Evaluate stability under gradual load |
| PERF-04 | Beacon Performance | 5 | 30 seconds | Measure Beacon Resolution API |
| PERF-05 | Analytics Performance | 5 | 30 seconds | Measure authenticated Analytics API |
| PERF-06 | Baseline Test 2 | 5 | 30 seconds | Repeat baseline measurements |
| PERF-07 | Baseline Under Load Monitoring | 5 | 30 seconds | Measure performance with resource monitoring |

### 3.3 Performance Metrics

| Metric | Description |
|---|---|
| HTTP Requests | Total HTTP requests executed |
| HTTP Request Failure Rate | Percentage of requests reported as failed |
| Checks | Response validation success rate |
| Average Response Time | Mean HTTP request duration |
| Median (p50) | Response duration at the 50th percentile |
| p90 | Response duration at the 90th percentile |
| p95 | Response duration at the 95th percentile |
| p99 | Response duration at the 99th percentile |
| Maximum Response Time | Highest recorded request duration |
| Throughput | Number of HTTP requests processed per second |
| Virtual Users | Number of simulated concurrent users |
| CPU Usage | Observed Docker container CPU utilization |
| Memory Usage | Observed Docker container RAM consumption |

### 3.4 Acceptance Criteria

| Metric | Acceptance Criteria | Evaluation |
|---|---|---|
| HTTP Request Failure Rate | Less than 1% | PASS if threshold is satisfied |
| Response Validation Checks | 100% successful | PASS if all checks succeed |
| p95 Response Time | Less than 500 ms where configured | PASS if threshold is satisfied |
| Reliability | No request failures during the tested workload | Evaluate recorded results |
| Resource Monitoring | CPU/RAM measurements successfully collected | Confirm monitoring evidence |

These values are QA testing thresholds and do not represent verified production service-level agreements.

---

## 4. Performance Test Execution Results

### 4.1 Overall Test Results

| Test Case | HTTP Requests | Average (ms) | p95 (ms) | p99 (ms) | Error Rate | Status |
|---|---:|---:|---:|---:|---:|---|
| PERF-01 Smoke | 20 | 25.88 | 45.71 | N/A | 0% | PASS |
| PERF-02 Baseline 1 | 580 | 16.27 | 44.88 | 69.01 | 0% | PASS |
| PERF-03 Reliability | 1,048 | 6.02 | 13.14 | 25.02 | 0% | PASS |
| PERF-04 Beacon | 150 | 14.64 | 31.94 | 43.09 | 0% | PASS |
| PERF-05 Analytics | 145 | 38.37 | 82.05 | 144.19 | 0% | PASS |
| PERF-06 Baseline 2 | 600 | 5.99 | 14.87 | 43.46 | 0% | PASS |
| PERF-07 Under Load | 600 | 7.27 | 20.77 | 51.13 | 0% | PASS |
| **TOTAL** | **3,143** | **N/A** | **N/A** | **N/A** | **0%** | **PASS** |

All 3,143 recorded HTTP requests completed successfully across seven independent test executions.

Percentile values cannot be directly combined because the scenarios used different workload configurations.

### 4.2 Throughput Comparison

| Test Case | Throughput (requests/second) |
|---|---:|
| PERF-01 Smoke | 3.61 |
| PERF-02 Baseline 1 | 18.70 |
| PERF-03 Reliability | 17.27 |
| PERF-04 Beacon | 4.92 |
| PERF-05 Analytics | 4.81 |
| PERF-06 Baseline 2 | 19.47 |
| PERF-07 Under Load | 19.37 |

The throughput differences are influenced by workload configuration, request mix, and the one-second delay included in the testing scripts.

---

## 5. Detailed Test Case Results

### 5.1 PERF-01 - Smoke Testing

**Objective:** Verify that the primary public APIs are available and return successful responses.

| Item | Description |
|---|---|
| Test Procedure | Execute the k6 smoke script with one Virtual User and five iterations |
| Expected Result | All tested API endpoints return HTTP 200 |
| Actual Result | 20 out of 20 HTTP requests completed successfully |
| Average Response Time | 25.88 ms |
| p95 Response Time | 45.71 ms |
| HTTP Error Rate | 0% |
| Status | PASS |
| Evidence | `performance/smoke.js` and k6 execution summary |

### 5.2 PERF-02 - Baseline Testing

**Objective:** Establish the initial performance baseline with five concurrent Virtual Users.

| Item | Description |
|---|---|
| Test Procedure | Execute the baseline script with 5 VUs for 30 seconds |
| Expected Result | APIs remain responsive with successful HTTP checks |
| Actual Result | 580/580 requests successful |
| Average Response Time | 16.27 ms |
| Median Response Time | 11.64 ms |
| p95 Response Time | 44.88 ms |
| p99 Response Time | 69.01 ms |
| Throughput | 18.70 requests/second |
| HTTP Error Rate | 0% |
| Status | PASS |
| Evidence | `performance/baseline.js` and k6 execution summary |

### 5.3 PERF-03 - Reliability Testing

**Objective:** Evaluate API stability under a gradual increase in concurrent Virtual Users.

#### Load Configuration

| Stage | Duration | Target Virtual Users |
|---|---|---:|
| Stage 1 | 10 seconds | 2 |
| Stage 2 | 20 seconds | 5 |
| Stage 3 | 20 seconds | 10 |
| Stage 4 | 10 seconds | 0 |

#### Execution Results

| Metric | Actual Result |
|---|---:|
| Total HTTP Requests | 1,048 |
| Successful Checks | 1,048/1,048 |
| Failed Checks | 0 |
| Average Response Time | 6.02 ms |
| Median Response Time | 4.93 ms |
| p90 Response Time | 9.97 ms |
| p95 Response Time | 13.14 ms |
| p99 Response Time | 25.02 ms |
| Maximum Response Time | 75.44 ms |
| Throughput | 17.27 requests/second |
| Maximum Virtual Users | 10 |
| HTTP Error Rate | 0% |
| Status | PASS |

**Observation:** All tested endpoints remained responsive under the configured gradual load. No HTTP request failures occurred.

The k6 execution emitted a configuration warning about the placement of `gracefulRampDown`. The test still completed, but the exact ramp-down behavior followed the effective executor configuration rather than the intended top-level setting.

### 5.4 PERF-04 - Beacon Resolution Performance

**Objective:** Evaluate the response time and correctness of the Beacon Resolution API under concurrent requests.

| Item | Description |
|---|---|
| Endpoint | `GET /api/beacons/resolve` |
| Virtual Users | 5 |
| Duration | 30 seconds |
| Expected HTTP Status | 200 |
| Expected Beacon ID | 1 |
| Expected Artifact ID | 48 |
| Total HTTP Requests | 150 |
| Successful Requests | 150 |
| Successful Checks | 300/300 |
| Average Response Time | 14.64 ms |
| p95 Response Time | 31.94 ms |
| p99 Response Time | 43.09 ms |
| Throughput | 4.92 requests/second |
| Error Rate | 0% |
| Status | PASS |
| Evidence | `performance/beacon-performance.js` and k6 execution summary |

**Observation:** The Beacon Resolution API returned successful responses and correctly resolved the expected Beacon and Artifact identifiers throughout the test.

### 5.5 PERF-05 - Analytics Performance

**Objective:** Evaluate the response time of an authenticated Analytics Summary API.

| Item | Description |
|---|---|
| Endpoint | `GET /api/analytics/interactions/summary` |
| Authentication | ADMIN Bearer Token |
| Virtual Users | 5 |
| Duration | 30 seconds |
| Expected HTTP Status | 200 |
| Expected Total Interactions | 1 |
| Total HTTP Requests | 145 |
| Successful Requests | 145 |
| Successful Checks | 290/290 |
| Average Response Time | 38.37 ms |
| Median Response Time | 30.77 ms |
| p95 Response Time | 82.05 ms |
| p99 Response Time | 144.19 ms |
| Maximum Response Time | 144.93 ms |
| Throughput | 4.81 requests/second |
| Error Rate | 0% |
| Status | PASS |
| Evidence | `performance/analytics-performance.js` and k6 execution summary |

**Observation:** All requests returned HTTP 200 and the expected Analytics Summary value.

The ADMIN authentication token was used only for test execution and must not be included in shared reports or evidence files.

### 5.6 PERF-06 - Repeated Baseline Test

**Objective:** Repeat the baseline scenario and compare the results with the initial execution.

| Item | Description |
|---|---|
| Virtual Users | 5 |
| Duration | 30 seconds |
| Total HTTP Requests | 600 |
| Successful Requests | 600 |
| Successful Checks | 600/600 |
| Average Response Time | 5.99 ms |
| Median Response Time | 4.13 ms |
| p95 Response Time | 14.87 ms |
| p99 Response Time | 43.46 ms |
| Maximum Response Time | 126.27 ms |
| Throughput | 19.47 requests/second |
| Error Rate | 0% |
| Status | PASS |

The repeated baseline produced lower observed average and p95 response times than the initial baseline. However, the results alone do not establish a permanent performance improvement because environmental conditions can vary between executions.

### 5.7 PERF-07 - Performance Under Resource Monitoring

**Objective:** Monitor Backend and PostgreSQL resource utilization while executing the baseline workload.

| Item | Description |
|---|---|
| Virtual Users | 5 |
| Duration | 30 seconds |
| Total HTTP Requests | 600 |
| Successful Requests | 600 |
| Successful Checks | 600/600 |
| Average Response Time | 7.27 ms |
| Median Response Time | 4.54 ms |
| p95 Response Time | 20.77 ms |
| p99 Response Time | 51.13 ms |
| Maximum Response Time | 81.26 ms |
| Throughput | 19.37 requests/second |
| HTTP Error Rate | 0% |
| Status | PASS |
| Evidence | k6 execution summary and Docker Stats CSV |

---

## 6. CPU/RAM Resource Monitoring

### 6.1 Monitoring Methodology

Docker Stats was used to record CPU and memory utilization for the QA backend and PostgreSQL containers.

Monitoring data was periodically saved into a CSV file while the baseline workload was executed.

**Evidence file:** `performance/results/docker-stats-under-load.csv`

### 6.2 Resource Utilization Results

| Resource Metric | Backend QA | PostgreSQL |
|---|---:|---:|
| Maximum Observed CPU Usage | 18.43% | 7.56% |
| Maximum Observed RAM Usage | 486.4 MiB | 81.25 MiB |
| Maximum Observed Memory Percentage | 6.27% | 1.05% |

### 6.3 Resource Monitoring Analysis

| Observation | Analysis |
|---|---|
| Backend CPU | Maximum observed value of 18.43% during the monitoring interval |
| PostgreSQL CPU | Maximum observed value of 7.56% |
| Backend Memory | Maximum observed usage of 486.4 MiB |
| PostgreSQL Memory | Maximum observed usage of 81.25 MiB |
| HTTP Reliability | No request failures during the concurrent monitoring run |
| Response Time | p95 latency of 20.77 ms |
| Resource Stability | No unusually high memory consumption was observed in the collected samples |

The recorded resource maxima represent the full CSV monitoring interval, which may contain samples immediately before or after the k6 workload.

Docker CPU percentages are based on Docker's accounting and should not be interpreted as percentages of a single fixed CPU core.

### 6.4 Resource Monitoring Conclusion

The backend and PostgreSQL database remained responsive during the controlled five-VU workload.

Observed memory consumption remained low relative to the configured Docker memory limit.

The results provide useful resource-usage evidence for the QA baseline, but do not establish maximum server capacity.

---

## 7. Reliability Analysis

### 7.1 API Reliability Results

| Reliability Metric | Actual Result | Status |
|---|---|---|
| Total HTTP Requests | 3,143 | PASS |
| Failed HTTP Requests | 0 | PASS |
| Overall Observed HTTP Error Rate | 0% | PASS |
| Maximum Tested Concurrency | 10 VUs | Completed |
| Beacon Response Validation | 300/300 checks | PASS |
| Analytics Response Validation | 290/290 checks | PASS |
| Public API Availability | All tested checks successful | PASS |

### 7.2 Performance Evaluation

| Evaluation Area | Finding |
|---|---|
| Public API Performance | Response times remained below configured QA thresholds |
| Beacon API Performance | All resolution requests returned expected responses |
| Analytics API Performance | Authenticated requests returned valid data |
| Reliability | No HTTP request failures were recorded |
| Resource Utilization | CPU/RAM usage was recorded during controlled load |
| Stability | Tested endpoints remained responsive at the evaluated load levels |
| Scalability | Maximum production scalability was not established |

---

## 8. Test Evidence and Reproducibility

### 8.1 Test Scripts

| File | Purpose |
|---|---|
| `performance/smoke.js` | Smoke testing |
| `performance/baseline.js` | Baseline testing |
| `performance/reliability.js` | Gradual load reliability testing |
| `performance/beacon-performance.js` | Beacon Resolution performance |
| `performance/analytics-performance.js` | Analytics Summary performance |

### 8.2 Evidence Files

| Evidence | Location | Description |
|---|---|---|
| k6 Smoke Results | Terminal output | 20 requests, 0 failures |
| k6 Baseline Results | Terminal output | 580 requests, 0 failures |
| k6 Reliability Results | Terminal output | 1,048 requests, 0 failures |
| k6 Beacon Results | Terminal output | 150 requests, 0 failures |
| k6 Analytics Results | Terminal output | 145 requests, 0 failures |
| k6 Baseline Repeat Results | Terminal output | 600 requests, 0 failures |
| k6 Under Load Results | Terminal output | 600 requests, 0 failures |
| CPU/RAM Monitoring | `performance/results/docker-stats-under-load.csv` | Docker resource utilization samples |

The original k6 terminal summaries should be retained as screenshots or exported logs when preparing the final evidence package.

### 8.3 Test Reproduction

The tests can be reproduced by running the corresponding k6 scripts inside the Docker network containing the QA backend.

| Configuration | Value |
|---|---|
| Docker Network | `smart-heritage_default` |
| Backend Base URL | `http://smart-heritage-backend-qa:8080` |
| Mounted Script Directory | `performance/` |
| Execution Image | `grafana/k6` |
| Analytics Authentication | ADMIN token supplied at runtime |
| Test Database | `smart_heritage_test` |

No passwords, authentication tokens, or sensitive environment variables should be committed to Git.

---

## 9. Testing Limitations

| ID | Limitation | Impact |
|---|---|---|
| LIM-01 | Maximum tested load was 10 Virtual Users | Production capacity remains unknown |
| LIM-02 | Tests were performed in local Docker QA | Production performance may differ |
| LIM-03 | Most workloads used GET requests | Write-heavy performance was not measured |
| LIM-04 | One-second sleep was configured | Throughput was deliberately limited |
| LIM-05 | Long-duration soak testing was not performed | Long-term degradation was not evaluated |
| LIM-06 | Failure recovery under infrastructure outages was not tested | Recovery behavior remains unverified |
| LIM-07 | Resource monitoring samples included a wider collection interval | Peaks may include periods outside active load |
| LIM-08 | Native Mobile UI E2E was not part of the performance workload | Device-level performance remains unverified |

---

## 10. Final Test Summary

### 10.1 Test Case Summary

| Test Case | Test Name | Status |
|---|---|---|
| PERF-01 | Smoke Test | PASS |
| PERF-02 | Baseline Test | PASS |
| PERF-03 | Reliability Test | PASS |
| PERF-04 | Beacon Resolution Performance | PASS |
| PERF-05 | Analytics Performance | PASS |
| PERF-06 | Repeated Baseline Test | PASS |
| PERF-07 | CPU/RAM Under Load Test | PASS |

### 10.2 Overall Results

| Metric | Final Result |
|---|---|
| Total Performance Scenarios | 7 |
| Passed Scenarios | 7 |
| Failed Scenarios | 0 |
| Total HTTP Requests | 3,143 |
| Successful HTTP Requests | 3,143 |
| Failed HTTP Requests | 0 |
| Observed HTTP Error Rate | 0% |
| Maximum Tested Virtual Users | 10 |
| CPU/RAM Monitoring | Completed |
| Overall S5-M5-02 Status | PASS for executed QA scenarios |

## 11. Conclusion

The S5-M5-02 API Performance & Reliability Testing task successfully established an initial performance baseline for the Smart Heritage backend.

Seven performance test scenarios were executed using Grafana k6, producing a total of 3,143 successful HTTP requests with no recorded HTTP failures.

The Beacon Resolution and Analytics Summary APIs returned correct responses during their respective load tests.

CPU and RAM monitoring was also conducted during baseline testing, providing resource utilization measurements for the backend and PostgreSQL containers.

**Final Assessment: S5-M5-02 — PASS for the configured and executed QA performance scenarios.**

The results demonstrate reliability under the evaluated workloads. Further high-concurrency, long-duration, and production-like testing would be required before making conclusions about maximum system capacity.
