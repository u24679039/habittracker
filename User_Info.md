# Seeded User Credentials

Below are the user accounts, emails, and passwords defined in `seed.js` script.

---

## 1. Demo Team Users

These accounts are created with raw string placeholders for their password hashes.

| Name | Role | Email | Password | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Demo Student** | `USER` | `demo@habitforge.test` | `demo1` | Primary demo user (`userId = 1`) |
| **Alex Rivera** | `USER` | `alex@habitforge.test` | `demo2` | Member of Alpha Squad |
| **Jordan Kim** | `USER` | `jordan@habitforge.test` | `demo3` | Member of Alpha Squad |



---

## 2. Test User

Account created for habit tracking test data.

| Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Test User** | `USER` | `test@example.com` | `password` |

---

## 3. Demo Admin User

The credentials for the admin account are loaded dynamically from environment variables defined in your `.env` file.

| Attribute | Source Variable |
| :--- | :--- |
| **Name** | `DEMO_ADMIN_NAME` |            HabitTracker Admin
| **Email** | `DEMO_ADMIN_EMAIL` |          admin@habittracker.co.za
| **Password** | `DEMO_ADMIN_PASSWORD` |    AdminDemo123

---

## Direct Login Tip
As mentioned in the seed script logs:
> *"Point the frontend/backend at `userId=1` (Demo Student) for the demo."*