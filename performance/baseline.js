import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 5,
    duration: "30s",
    summaryTrendStats: [
        "avg", "min", "med", "max",
        "p(90)", "p(95)", "p(99)"
    ],
    thresholds: {
        http_req_failed: ["rate<0.01"],
        checks: ["rate==1"]
    }
};

const BASE_URL = __ENV.BASE_URL || "http://smart-heritage-backend-qa:8080";

const endpoints = [
    "/api/health",
    "/api/heritage-sites",
    "/api/artifacts",
    "/api/artifacts/48"
];

export default function () {
    for (const endpoint of endpoints) {
        const response = http.get(`${BASE_URL}${endpoint}`);

        check(response, {
            [`${endpoint} HTTP 200`]: (r) => r.status === 200
        });
    }

    sleep(1);
}
