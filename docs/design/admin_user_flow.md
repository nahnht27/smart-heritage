# 9. Admin User Flow

## 9.1 Overview

The Admin User Flow describes how the Heritage Site Administrator logs in, accesses administration functions, returns to the Admin Menu after completing a function, and logs out of the Smart Heritage system.

The administrator must log in successfully before accessing the administration functions.

## 9.2 Admin User Flow

The administrator follows these steps:

1. The system displays the Login Page.
2. The administrator enters login credentials and submits the login form.
3. If login fails, the system displays a login error and allows the administrator to enter and submit the credentials again.
4. If login succeeds, the system directs the administrator to the Dashboard.
5. While the administrator is logged in, the administrator can select functions from the Admin Menu.
6. After completing a function, the administrator automatically returns to the Admin Menu.
7. When Logout is selected, the system logs the administrator out, redirects to the Login Page, and ends the flow.

The Admin Menu provides access to the following functions, in the same order as the UML:

1. Dashboard
2. Heritage Site Management
3. Artifact Management
4. Multimedia Management
5. Beacon Management
6. Beacon Deployment Location Management
7. Translation Management
8. Feedback Management
9. Analytics Dashboard
10. Report Overview
11. Logout

## 9.3 Main Flow

### 9.3.1 Admin Login

- The system displays the Login Page.
- The administrator enters login credentials and submits the login form.
- The system validates the submitted credentials.
- If login fails, the system displays a login error and allows the administrator to try again.
- If login succeeds, the system directs the administrator to the Dashboard.

### 9.3.2 Dashboard

The administrator can view the Dashboard after a successful login. The Dashboard is also available as a function in the Admin Menu.

### 9.3.3 Heritage Site Management

The administrator can view and search heritage sites, and create, update, or delete site records.

### 9.3.4 Artifact Management

The administrator can view and search historical artifacts, and create, update, or delete artifact records.

### 9.3.5 Multimedia Management

The administrator can view multimedia resources associated with heritage content, and upload, update, or delete multimedia resources.

Supported multimedia resources include:

- Images
- Videos
- Audio guides

### 9.3.6 Beacon Management

The administrator can view and search iBeacon devices, register new beacons, update or delete beacon records, configure beacons, and assign beacons to heritage sites or artifacts.

### 9.3.7 Beacon Deployment Location Management

The administrator can view and update beacon deployment locations on an interactive map.

### 9.3.8 Translation Management

The administrator can view translations and create, update, or delete translation records for supported languages.

### 9.3.9 Feedback Management

The administrator can view visitor feedback and moderate feedback entries.

### 9.3.10 Analytics Dashboard

The administrator can view the Analytics Dashboard and review the following statistics:

- Visitor statistics
- Artifact popularity
- Interaction frequency
- Language statistics
- Engagement statistics
- Feedback statistics

### 9.3.11 Report Overview

The administrator can view the Report Overview to review summary reporting data.

From the Report Overview, the administrator selects a date range and export format, then exports a statistical report.

Supported report formats include:

- PDF
- Excel

### 9.3.12 Logout

When the administrator selects Logout from the Admin Menu, the system logs the administrator out and redirects to the Login Page. This action ends the user flow. The administrator must log in again to access administration functions.

## 9.4 Flow Summary

```text
Display Login Page
    |
Enter Login Credentials
    |
Submit Login
    |
    +-- Login Failed --> Display Login Error
    |                         |
    |                  Enter Credentials and Submit Again
    |
    +-- Login Successful --> Dashboard
                                  |
                             Admin is logged in
                                  |
                              Admin Menu
                                  |
                          Select Admin Function
                                  |
          +-----------------------+-----------------------+
          |                       |                       |
   Management /             Analytics /                Logout
   Dashboard functions      Report functions              |
          |                       |                 Admin Logout
          +----------- Return to Admin Menu --------      |
                                                    Redirect to Login Page
                                                           |
                                                       End Flow
```

While the administrator remains logged in, completing any function returns the administrator to the Admin Menu. Selecting Logout ends the flow.
