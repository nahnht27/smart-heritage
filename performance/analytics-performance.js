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
        http_req_duration: ["p(95)<500"],
        checks: ["rate==1"]
    }
};

const BASE_URL = __ENV.BASE_URL ||
    "http://smart-heritage-backend-qa:8080";

export default function () {
    const response = http.get(
        `${BASE_URL}/api/analytics/interactions/summary?from=2026-11-12T00:00:00Z&to=2026-11-13T00:00:00Z`,
        {
            headers: {
                Authorization: `Bearer ${__ENV.ADMIN_TOKEN}`
            }
        }
    );

    check(response, {
        "Analytics HTTP 200": (r) => r.status === 200,
        "Analytics response valid": (r) => {
            try {
                const body = r.json();
                return body.success === true &&
                       body.data.totalInteractions === 1;
            } catch {
                return false;
            }
        }
    });

    sleep(1);
}
