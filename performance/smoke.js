import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    vus: 1,
    iterations: 5,
    thresholds: {
        http_req_failed: ["rate==0"],
        checks: ["rate==1"]
    }
};

const BASE_URL = __ENV.BASE_URL || "http://smart-heritage-backend-qa:8080";

export default function () {
    const endpoints = [
        "/api/health",
        "/api/heritage-sites",
        "/api/artifacts",
        "/api/artifacts/48"
    ];

    for (const endpoint of endpoints) {
        const response = http.get(`${BASE_URL}${endpoint}`);

        check(response, {
            [`${endpoint} returns HTTP 200`]: (r) => r.status === 200
        });
    }

    sleep(1);
}
