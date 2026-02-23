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
  tasks:view_all
  tasks:update
  tasks:delete
  users:view
  users:create
  reports:view
  reports:export
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
| `tasks:create` | Create new tasks |
| `tasks:view` | View own/assigned tasks |
| `tasks:view_all` | View all tasks across departments |
| `tasks:update` | Update task details |
| `tasks:delete` | Delete/archive tasks |
| `tasks:assign` | Assign tasks to staff |
| `tasks:reassign` | Reassign tasks to different staff |
| `tasks:approve` | Approve task completion |
| `users:create` | Create new users |
| `users:view` | View user profiles |
| `users:update` | Update user details |
| `users:delete` | Deactivate users |
| `users:import` | Bulk import users via CSV |
| `roles:create` | Create roles |
| `roles:view` | View roles and permissions |
| `roles:update` | Update roles |
| `roles:delete` | Delete custom roles |
| `roles:clone` | Clone existing roles |
| `departments:create` | Create departments |
| `departments:view` | View departments |
| `departments:update` | Update departments |
| `departments:delete` | Delete departments |
| `workflow:configure` | Configure task statuses and transitions |
| `reports:view` | View reports and analytics |
| `reports:export` | Export reports to PDF/Excel/CSV |
| `activity_logs:view` | View activity and audit logs |
| `notifications:manage_rules` | Configure notification rules |
| `visit_logs:create` | Submit new visit logs |
| `visit_logs:view` | View own visit logs |
| `visit_logs:view_all` | View all users' visit logs |
| `visit_logs:delete` | Delete visit log entries |
| `dashboard:admin` | Access admin dashboard |
| `dashboard:manager` | Access manager dashboard |
| `dashboard:staff` | Access staff dashboard |
| `crm:view` | View CRM leads, clients, and deals |
| `crm:create` | Create CRM leads, clients, and deals |
| `crm:update` | Update CRM records |
| `crm:delete` | Delete CRM records |
| `performance:view` | View performance targets and summaries |
| `performance:manage` | Set and manage performance targets |
| `proof_of_work:view` | View proof of work submissions and locations |
| `proof_of_work:submit` | Submit proof of work entries |
| `proof_of_work:manage` | Review/delete submissions and manage locations |
| `settings:manage` | Manage system settings and billing configuration |
| `subscriptions:manage` | Manage account subscription (owner only) |

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
