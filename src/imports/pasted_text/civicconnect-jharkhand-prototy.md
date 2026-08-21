# Design a Complete Working UI/UX Prototype for SIH25031 – Crowdsourced Civic Issue Reporting and Resolution System

## Project Context

Design a modern, clean, professional and highly usable web application prototype for the Smart India Hackathon problem statement:

**Government of Jharkhand – SIH25031 – Crowdsourced Civic Issue Reporting and Resolution System**

This is a **college-level SIH internal hackathon prototype**, not a production-ready government platform.

The prototype should demonstrate the core workflow clearly:

**Citizen Reports Issue → System Verifies → Duplicate Issues Identified → Priority Calculated → Department Assigned → Admin/Officer Processes Issue → Resolution Proof Uploaded → Citizen Verifies Resolution → Issue Closed or Reopened**

The website should be visually impressive for judges but extremely simple for normal citizens to understand.

---

# 1. Design Goals

Create a UI that is:

* Clean
* Modern
* Government-tech / Smart City inspired
* Professional
* Beautiful but not over-designed
* Highly readable
* Responsive
* Accessible
* Easy for non-technical citizens
* Suitable for a live hackathon demonstration
* Dashboard-oriented for administrators
* Minimal unnecessary animations
* Clear visual hierarchy
* Strong use of cards, status badges, maps and statistics

Avoid making it look like a generic social media app.

The visual language should communicate:

**Trust + Transparency + Smart Governance + Simplicity**

Use a professional light theme with subtle colors.

Suggested visual direction:

* Primary: deep blue / government-tech blue
* Secondary: green for successful resolution
* Orange for warnings
* Red for critical issues
* Neutral white/light gray backgrounds
* Dark charcoal text

Do not make the interface excessively colorful.

---

# 2. Application Name

Use the product name:

**CivicConnect Jharkhand**

Subtitle:

**Crowdsourced Civic Issue Reporting & Resolution System**

Logo concept:

A simple combination of:

* Location pin
* City/building
* Check mark

The logo should communicate:

**Report → Resolve → Improve**

---

# 3. Main User Roles

The prototype should support two main roles:

### Citizen

Citizen can:

* Report civic issues
* Add photo
* Use current location
* Select issue category
* Describe the problem
* View submitted complaints
* Track complaint status
* Support/confirm an existing issue
* See issue priority
* Verify whether an issue was actually resolved
* Reopen an issue if it is not properly resolved

### Admin

Admin can:

* View all complaints
* View complaint statistics
* View issues on a map
* Filter issues
* View issue details
* See duplicate reports
* See affected citizen count
* See priority score
* Assign department
* Assign officer/worker
* Update status
* Upload/attach resolution proof
* Mark issue as resolved
* Monitor SLA
* See escalated complaints
* View resolution performance

---

# 4. Navigation Structure

Create a simple top navigation/sidebar.

Citizen navigation:

* Home
* Report Issue
* Explore Issues
* My Complaints
* Notifications
* Profile

Admin navigation:

* Dashboard
* All Issues
* Map / Heatmap
* Departments
* Workers
* SLA & Escalations
* Analytics

Provide a clear:

**Citizen / Admin**

role switch for the prototype.

Since this is a prototype, authentication can be simulated.

---

# 5. Landing / Home Page

Create a beautiful homepage.

Hero section:

### Heading:

**Report a Problem. Improve Your City.**

Subheading:

**Help Jharkhand build cleaner, safer and smarter communities by reporting civic issues around you.**

Primary CTA:

**Report an Issue**

Secondary CTA:

**Track My Complaint**

Show a small city/map visual on the right.

Below the hero, show four quick statistics:

* Issues Reported
* Issues Resolved
* Active Issues
* Citizens Participating

Example prototype data:

**1,284 Issues Reported**

**962 Issues Resolved**

**284 Active Issues**

**3,842 Citizens Participating**

Add a section:

### How It Works

Use four simple steps:

1. **Report**
2. **Verify**
3. **Resolve**
4. **Confirm**

Use simple icons.

---

# 6. Report Issue Page

This is one of the most important screens.

Make the form extremely simple.

Heading:

**Report a Civic Issue**

Subheading:

**Tell us what is wrong and where it is.**

Form fields:

### Upload Photo

Large drag-and-drop/upload area.

Text:

**Upload a photo of the issue**

Button:

**Take Photo / Upload**

### Issue Category

Dropdown/cards:

* 🗑 Garbage
* 🕳 Pothole / Road Damage
* 💡 Street Light
* 💧 Water Leakage
* 🚰 Water Supply
* 🌊 Drainage / Waterlogging
* 🚽 Public Toilet
* 🌳 Fallen Tree
* 🏗 Illegal Dumping
* Other

### Description

Text area:

**Describe the problem...**

### Location

Show a map.

Button:

**Use My Current Location**

Display:

* Latitude
* Longitude
* Area/Ward

But keep technical information visually secondary.

Show:

**📍 Location detected**

### Submit Button

Large primary button:

**Submit Issue**

---

# 7. Smart Verification Screen

After submitting, show a short verification state.

Example:

**Analyzing your report...**

Display three processing steps:

✓ Image received

✓ Location detected

✓ Checking for similar reports

Then show:

### Issue Verified

Category:

**Pothole**

Location:

**Ward 12, Ranchi**

Priority:

**HIGH**

Affected Citizens:

**18**

Similar Reports:

**7**

Button:

**View Issue**

This demonstrates the intelligent system without requiring a real AI backend.

---

# 8. Duplicate Issue Detection

Create a UI for duplicate detection.

Example:

### Similar Issue Found

**We found an existing issue near your location.**

Show an issue card:

**Large pothole near Main Road**

📍 Ward 12

Reported by 7 citizens

18 citizens affected

Status: **In Progress**

Buttons:

**I'm Also Affected**

**Report Separately**

The important UX idea is:

Multiple citizen reports should become one **Master Issue** instead of creating unnecessary duplicate complaints.

---

# 9. Explore Issues Page

Create a public civic issue discovery page.

Top section:

Search bar:

**Search issues near you...**

Filters:

* Category
* Status
* Priority
* Ward
* Distance

Display issue cards.

Example:

### Large Pothole – Main Road

📍 Ward 12

🔴 High Priority

👥 27 citizens affected

Status:

**In Progress**

Button:

**View Details**

---

# 10. Issue Details Page

Create a detailed issue page.

Top:

### Issue #CIV-1024

**Large Pothole on Main Road**

Show:

* Issue photo
* Location map
* Category
* Date reported
* Priority
* Department
* Current status
* Affected citizen count

Status timeline:

**Reported**
↓
**Verified**
↓
**Assigned**
↓
**In Progress**
↓
**Resolved**
↓
**Citizen Verified**

Show current stage prominently.

---

# 11. Crowd Confirmation

Add a large card:

### Are you also affected by this issue?

**27 citizens have confirmed this issue.**

Button:

**I am also affected**

After clicking:

**✓ Your confirmation has been added**

This should increase the affected citizen count in the prototype.

This feature is important because crowdsourcing should be represented as **community validation**, not just multiple duplicate complaints.

---

# 12. My Complaints Page

Create a simple dashboard.

Heading:

**My Complaints**

Tabs:

* All
* Pending
* In Progress
* Resolved
* Reopened

Complaint card:

### CIV-1024

Pothole – Main Road

📅 Reported: 20 Aug 2026

📍 Ward 12

Status:

🟠 **In Progress**

Progress bar:

**3 / 5 stages completed**

Button:

**Track Issue**

---

# 13. Resolution Verification

This is one of the most important unique features.

When admin marks an issue resolved, citizen should see:

### Issue Marked as Resolved

Show:

**Before**

[Before issue photo]

**After**

[Resolution photo]

Text:

**The department has marked this issue as resolved. Is the problem actually fixed?**

Buttons:

### ✅ Yes, Issue Resolved

### ❌ No, Issue Still Exists

If user selects Yes:

Show:

**Issue Successfully Closed**

If user selects No:

Show:

**Issue Reopened**

and:

**The issue has been sent back to the department for further action.**

---

# 14. Admin Dashboard

Create a highly professional government command-center dashboard.

Header:

**Municipal Command Center**

Subtitle:

**Civic Issue Monitoring & Resolution**

Top statistics cards:

### Total Issues

1,284

### Pending

284

### In Progress

320

### Resolved

680

### Critical

42

### SLA Breached

18

Use clean cards with icons.

---

# 15. Admin Live Issue Map

Create a large map section.

Display issue markers using priority:

🔴 Critical

🟠 High

🟡 Medium

🟢 Low

Add heatmap-style areas showing civic issue concentration.

Example:

**Ward 12 – High Issue Density**

**Ward 5 – Garbage Hotspot**

**Ward 8 – Road Damage Hotspot**

The map should be visually prominent but not overwhelm the dashboard.

---

# 16. Admin Issue Table

Create a professional data table.

Columns:

* Issue ID
* Issue
* Category
* Location
* Priority
* Affected Citizens
* Department
* Assigned Officer
* SLA
* Status
* Action

Example:

| ID       | Issue               | Category   | Priority | Crowd | Status      |
| -------- | ------------------- | ---------- | -------- | ----- | ----------- |
| CIV-1024 | Main Road Pothole   | Road       | High     | 27    | In Progress |
| CIV-1025 | Garbage Dump        | Sanitation | Critical | 42    | Pending     |
| CIV-1026 | Broken Street Light | Electrical | Medium   | 8     | Assigned    |

Use status badges.

---

# 17. Admin Issue Detail

When admin clicks an issue, open a detailed panel/page.

Show:

### Issue CIV-1024

Photo

Location map

Description

Category

Priority Score

Affected Citizens

Similar Reports

Reported Date

Department

Assigned Officer

SLA Deadline

Current Status

Resolution History

---

# 18. Priority Score

Create a visual priority breakdown.

Example:

### Priority Score: 24 / 30

Factors:

Severity: 8/10

Public Impact: 7/10

Location Importance: 9/10

Duration: 5/10

Safety Risk: 8/10

Show this using progress bars or compact visual indicators.

Label:

**HIGH PRIORITY**

---

# 19. Department Assignment

Admin should be able to select:

### Department

Dropdown:

* Sanitation
* Roads & Infrastructure
* Water Supply
* Electrical
* Public Health
* Parks & Environment

### Assigned Officer

Dropdown:

* Officer Rahul
* Officer Amit
* Officer Priya

Button:

**Assign Issue**

After assignment:

Status becomes:

**Assigned**

---

# 20. SLA Monitoring

Create an SLA card.

Example:

### Resolution SLA

Target:

**48 Hours**

Elapsed:

**37 Hours**

Remaining:

**11 Hours**

Progress bar.

If deadline is crossed:

Show:

🔴 **SLA BREACHED**

Button:

**Escalate Issue**

---

# 21. Escalation Workflow

Show visually:

Worker

↓

Supervisor

↓

Ward Officer

↓

Municipal Authority

This should demonstrate automatic escalation when an issue remains unresolved beyond its SLA.

---

# 22. Resolution Proof

Admin/worker should have a resolution section.

### Complete Issue

Upload:

**Before Photo**

**After Photo**

Add resolution note:

**Describe the work completed...**

Button:

**Submit Resolution**

After submission:

Status becomes:

**Awaiting Citizen Verification**

---

# 23. Analytics Page

Create simple but beautiful charts.

Charts:

### Issues by Category

* Garbage
* Road
* Water
* Streetlight
* Drainage

### Issues by Status

* Pending
* Assigned
* In Progress
* Resolved
* Reopened

### Ward-wise Issues

Bar chart.

### Resolution Performance

Show:

Average Resolution Time

Citizen Verification Rate

SLA Compliance

Reopened Issues

Do not overload the dashboard with too many charts.

---

# 24. Prototype Data Architecture

Since this is only a college-level prototype, do not design complex backend screens.

All prototype data should conceptually be stored in:

**Browser LocalStorage**

The UI should behave like a working application.

Example data objects:

```text
users
issues
departments
workers
notifications
```

When a citizen submits an issue:

**Create issue → Save to LocalStorage → Show in My Complaints → Show in Admin Dashboard**

When admin updates status:

**Update LocalStorage → Citizen sees updated status**

When citizen confirms resolution:

**Update LocalStorage → Issue becomes Closed**

When citizen rejects resolution:

**Update LocalStorage → Issue becomes Reopened**

---

# 25. Prototype Interaction Flow

The complete demo should work like this:

### Step 1

Citizen opens website.

### Step 2

Clicks:

**Report an Issue**

### Step 3

Uploads photo.

### Step 4

Selects:

**Pothole**

### Step 5

Uses current location / simulated location.

### Step 6

Adds description.

### Step 7

Clicks:

**Submit Issue**

### Step 8

System shows:

**Issue Verified**

### Step 9

System detects:

**Similar issue found**

### Step 10

Citizen confirms:

**I'm Also Affected**

### Step 11

Issue appears in:

**My Complaints**

### Step 12

Admin opens dashboard.

### Step 13

Admin sees new issue.

### Step 14

Admin assigns:

**Roads & Infrastructure Department**

### Step 15

Admin changes:

**Pending → Assigned → In Progress**

### Step 16

Admin uploads simulated resolution proof.

### Step 17

Issue becomes:

**Awaiting Citizen Verification**

### Step 18

Citizen opens complaint.

### Step 19

Citizen sees:

Before Photo + After Photo

### Step 20

Citizen clicks:

**Yes, Issue Resolved**

### Step 21

Final status:

**CLOSED**

This entire workflow should be visually demonstrable during the hackathon presentation.

---

# 26. Notifications

Create a notification dropdown.

Examples:

**Issue CIV-1024 assigned to Roads Department**

**Issue CIV-1024 is now In Progress**

**Your issue has been marked as Resolved**

**Please verify the resolution**

**Issue CIV-1024 has been reopened**

---

# 27. Empty States

Design clean empty states.

Example:

### No Complaints Yet

**You haven't reported any civic issues yet.**

Button:

**Report Your First Issue**

Do not leave empty white screens.

---

# 28. Responsive Design

Design for:

* Desktop
* Laptop
* Tablet
* Mobile

Desktop is the primary target because this will be demonstrated on a laptop/projector.

Mobile citizen experience should still be clean.

Admin dashboard should prioritize desktop.

---

# 29. Accessibility

Make the UI easy for all citizens.

Use:

* Large readable text
* High contrast
* Clear buttons
* Simple language
* Icons + text together
* Avoid icon-only important actions
* Clearly distinguish statuses
* Do not depend only on colors to communicate status

Example:

Instead of only:

🔴

show:

**🔴 Critical**

---

# 30. Visual Design System

Create a reusable design system.

### Typography

Use a modern font such as:

**Inter**

or

**Poppins**

Headings should be bold and clear.

Body text should be highly readable.

### Components

Design reusable:

* Buttons
* Input fields
* Dropdowns
* Cards
* Status badges
* Statistic cards
* Tables
* Modals
* Toast notifications
* Map markers
* Progress bars
* Timeline
* Tabs
* Navigation
* Sidebar
* Upload component

Maintain consistent spacing, border radius and shadows throughout the application.

---

# 31. Important UI Principle

Do NOT make the citizen side look like an administrative dashboard.

Citizen UI:

**Simple + Friendly + Minimal**

Admin UI:

**Data-rich + Professional + Analytical**

Both should use the same overall design system.

---

# 32. Prototype Screens Required

Create high-fidelity UI designs for these screens:

### Citizen

1. Landing/Home
2. Report Issue
3. Verification
4. Duplicate Issue Detection
5. Explore Issues
6. Issue Details
7. My Complaints
8. Complaint Tracking
9. Resolution Verification
10. Notifications
11. Profile

### Admin

12. Admin Dashboard
13. All Issues
14. Issue Map
15. Issue Details
16. Department Assignment
17. SLA Monitoring
18. Resolution Proof
19. Analytics

---

# 33. Final Design Requirement

The final Figma prototype should feel like a **real Smart City civic governance platform**, not a college assignment.

The UI should immediately communicate:

**"A citizen can report a problem in seconds, and the government can track that problem from reporting to verified resolution."**

The most important visual story is:

**REPORT → VERIFY → PRIORITIZE → ASSIGN → RESOLVE → CITIZEN VERIFY → CLOSE**

Make this workflow visually obvious throughout the application.

Prioritize the following five differentiating features:

1. **Crowd-based issue confirmation**
2. **Duplicate issue detection**
3. **Smart priority scoring**
4. **SLA-based escalation**
5. **Citizen-verified resolution**

Keep all screens consistent, polished, responsive, accessible and presentation-ready for a Smart India Hackathon internal college-level demonstration.
