# Permissions & Access Control

This document explains how permissions and access control work in the system, so team members and administrators understand what access each role has.

---

## Overview

The system uses **Role-Based Access Control (RBAC)**. Access to features and data is granted based on the roles assigned to each user. Permissions are defined as `resource:action` pairs (e.g., `tasks:create`, `users:view`).

---

## Permission Structure

```
Permission = resource : action

Examples:
  tasks:create
  tasks:view
  tasks:edit
  tasks:delete
  users:view
  users:create
  reports:view
  analytics:view
```

---

## Roles & Their Access Levels

| Module                | Business Ops | Customer Success | Finance & Legal | Marketing | Sales | SP Onboarding | Tech & Product | Academy |
|-----------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard             | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Tasks (View)          | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Tasks (Create)        | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Tasks (Delete)        | ✅  |     |     |     |     |     | ✅  |     |
| Users (View)          | ✅  | ✅  |     |     |     | ✅  | ✅  |     |
| Users (Manage)        | ✅  |     |     |     |     |     | ✅  |     |
| Reports               | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  | ✅  |
| Analytics             | ✅  |     | ✅  | ✅  | ✅  |     | ✅  |     |
| CRM                   | ✅  | ✅  |     | ✅  | ✅  |     |     |     |
| Finance Module        |     |     | ✅  |     |     |     |     |     |
| Field Monitoring      | ✅  |     |     |     | ✅  | ✅  |     |     |
| Workflow Management   | ✅  |     |     |     |     |     | ✅  |     |
| Roles & Permissions   |     |     |     |     |     |     | ✅  |     |
| Training/Academy      |     |     |     |     |     |     |     | ✅  |

---

## How Permissions Are Applied

1. **Roles** are assigned to users by an administrator.
2. **Roles** contain a list of **permissions**.
3. Every API action and UI element checks the user's permissions before allowing access.
4. Users with multiple roles inherit the union of all permissions.

---

## Requesting Access

If you need access to a feature not currently enabled for your role:
1. Submit a request to your department head.
2. The department head forwards the request to the administrator or Tech & Product team.
3. Access is reviewed and granted as appropriate.
4. Changes are logged in the activity log for auditability.

---

## Administrator Responsibilities
- Assign and review roles regularly
- Audit permissions for security and compliance
- Revoke access promptly when staff members change roles or leave
- Maintain the principle of **least privilege** — grant only what is needed

---

## Full Permission Reference

| Permission | Description |
|-----------|-------------|
| `tasks:view` | View tasks |
| `tasks:create` | Create new tasks |
| `tasks:edit` | Edit existing tasks |
| `tasks:delete` | Delete tasks |
| `tasks:assign` | Assign tasks to users |
| `users:view` | View user profiles |
| `users:create` | Create new users |
| `users:edit` | Edit user details |
| `users:delete` | Delete users |
| `roles:view` | View roles |
| `roles:create` | Create roles |
| `roles:edit` | Edit roles and permissions |
| `roles:delete` | Delete roles |
| `reports:view` | View reports |
| `reports:export` | Export reports |
| `analytics:view` | View analytics dashboards |
| `crm:view` | View CRM records |
| `crm:create` | Create CRM leads/clients/deals |
| `crm:edit` | Edit CRM records |
| `crm:delete` | Delete CRM records |
| `notifications:view` | View notifications |
| `notifications:manage` | Manage notification rules |
| `workflow:view` | View workflow statuses |
| `workflow:manage` | Manage workflow transitions |
| `field:view` | View field sessions |
| `field:manage` | Manage field monitoring |
| `performance:view` | View performance targets |
| `performance:manage` | Set and manage performance KPIs |
| `departments:view` | View departments |
| `departments:manage` | Create and manage departments |
| `activity:view` | View activity logs |

---

## Permission Audit Process

To maintain security and compliance, permissions should be audited regularly:

1. **Monthly:** Review recently onboarded or offboarded users.
2. **Quarterly:** Audit all roles and their assigned permissions.
3. **Immediately:** Revoke access when a staff member changes roles or leaves.
4. Log all changes in the Activity Log for traceability.

---

## Security Best Practices

- Apply the **principle of least privilege** — grant only what is needed for the role.
- Never share login credentials.
- Report any suspicious access or unauthorized actions immediately.
- Use strong, unique passwords and change them regularly.
- Admins should review inactive accounts and disable them promptly.

---

## Related Documents

- [Roles & Responsibilities](./roles-and-responsibilities.md)
- [Onboarding Guide](./onboarding-guide.md)
- [Escalation Policy](./escalation-policy.md)
- [FAQs](./faqs.md)

---

> Last Updated: February 2026
