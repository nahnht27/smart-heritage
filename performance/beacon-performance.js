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

const BASE_URL = __ENV.BASE_URL || "http://smart-heritage-backend-qa:8080";

export default function () {
    const url = `${BASE_URL}/api/beacons/resolve?uuid=11111111-2222-4333-8444-555555555555&major=100&minor=1`;

    const response = http.get(url);

    check(response, {
        "Beacon HTTP 200": (r) => r.status === 200,
        "Beacon resolves successfully": (r) => {
            try {
                const body = r.json();
                return body.success === true &&
                       body.data.artifactId === 48 &&
                       body.data.beaconId === 1;
            } catch {
                return false;
            }
        }
    });

    sleep(1);
}
