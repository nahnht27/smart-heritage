# 4. Testing Strategy

| Testing Type | Testing Scope |
| --- | --- |
| Unit Test | Test individual functions such as calculating the number of visitors, interaction frequency, engagement duration, popular artifacts, and processing visitor feedback. |
| Integration Test | Test the connections and data exchange between modules such as Mobile App – Backend – Database, Visitor Interaction – Analytics API, and Analytics – Dashboard. |
| System Test | Test the complete system workflow from Visitor → iBeacon → Artifact → Visitor Interaction → Database → Analytics → Admin Dashboard → Report. |

## 4.1 Main Modules to Test

| Module | Testing Scope |
| --- | --- |
| Authentication | Test login, logout, account authentication, and authorization for Visitor/Admin. |
| Visitor Management | Test visitor information, user profile, preferred language, and visit history management. |
| Artifact Management | Test creating, updating, deleting, and viewing artifact information; verify that artifact data is stored correctly. |
| iBeacon Detection | Test iBeacon detection, correct beacon identification, and correct artifact identification. |
| Visitor Interaction | Test recording visitor interactions, including visitor ID, artifact ID, interaction type, language, start time, and end time. Verify that interaction records are stored correctly and that engagement duration is calculated correctly from valid timestamps. |
| Content Management | Test the display of artifact information, images, videos/audio, and content according to the selected language. |
| Analytics | Test whether Number of Visitors, Popular Artifacts, Interaction Frequency, Language Preferences, and Engagement Duration are calculated and displayed correctly. |
| Feedback | Test whether visitors can submit ratings and comments, and verify that feedback is stored and displayed correctly. |
| Reporting | Test the generation and export of statistical reports. |
| Admin Dashboard | Test whether the dashboard correctly displays Analytics data, charts, KPIs, and the feedback table. |

## 4.2 Basic Pass/Fail Criteria

| Test Case | Pass Criteria | Fail Criteria |
| --- | --- | --- |
| Visitor Interaction | Interaction data is recorded and stored correctly with the required fields. | Interaction data is missing or contains incorrect values. |
| Unique Visitors | Each visitor is counted only once within the selected time period. | The same visitor is counted multiple times within the same period. |
| Analytics | Analytics values match the expected results for the selected time period. | Analytics values are incorrect or include data outside the selected period. |
| Report Export | The report is generated and contains the expected data. | The report cannot be generated or contains incorrect data. |

## 5. Deployment Plan

