# 1. Analytics Definition

| Analytics | Meaning | Purpose |
| --- | --- | --- |
| Number of visitors | The system records the number of visitors by day, week, and month. | The system uses this data to monitor visitor volume and identify visitation trends. |
| Popular artifacts | The system records the number of views and interactions for each artifact. | The system uses this data to identify the artifacts that attract the most visitor attention. |
| Interaction frequency | The system records the number of times visitors interact with artifacts or the system. | The system uses this data to evaluate the level of visitor interaction. |
| Language preference | The system records the number of visitors using each supported language. | The system uses this data to identify visitors' language preferences and support language planning. |
| Visitor feedback | The system records visitor feedback, ratings, and comments. | The system uses this data to evaluate visitor experiences and improve services. |

## 1.1 Unique Visitor Calculation

- Each identified visitor is associated with a unique `visitor_id`.
- The number of unique visitors is calculated by counting distinct `visitor_id` values within the selected time period.
- If the same visitor visits multiple times during the same period, they are counted only once for that period.
- The same visitor may be counted again in a different reporting period.

## 1.2 Time Filter

The system supports the following time filters:

- Daily: Records from a selected day.
- Weekly: Records from a selected week.
- Monthly: Records from a selected month.
- Custom Date Range: Records between a selected start date and end date.

Only records within the selected time period are included in the analytics results. The system should use consistent timezone and date-boundary rules when filtering data.