# PNetLab Permanent Session & Never-Logout Guide

**Complete Operational Guide for Session Timeouts, Cookie Expiry, and Sliding Authentication | PNetLab v8 (`6.8.93resolute1`)**  
*Platform: Ubuntu 26.04 LTS ("Resolute") & Ubuntu 24.04 LTS ("Noble") • Master Controller*

---

## 1. Executive Summary & Root Cause Analysis

By default, strict idle and session timeout mechanisms in standard web stacks cause frequent logouts during lab construction. In dedicated network engineering and enterprise lab environments, PNetLab eliminates unwanted logouts through a multi-tier permanent session architecture.

| Layer / Component | Default Constraint | Applied Permanent Fix |
| :--- | :--- | :--- |
| **PHP Backend (`init.php`)** | `SESSION = 3600` (1 hour timeout) | Overridden to `315360000` (10 years) in `config.php` |
| **MySQL Database (`pnetlab_db` / `azambasha_db`)** | `ctrl_session_timeout` (1 - 24 hrs max) | Database value set to 10 years; accounts set to never expire |
| **Browser Token Cookie** | Fixed expiry stamped only once at login | Extended to 10 years + dynamic sliding renewal on each request |
| **PHP Engine Configuration** | `session.gc_maxlifetime = 1440` (24m) | Updated to 10 years across all installed PHP versions |
| **Frontend Client (UI)** | 412/401 triggers instant redirect to `/login/` | Background heartbeat ping keeps sessions alive indefinitely |

---

## 2. Native Integration in PNetLab v8

In PNetLab v8 (`6.8.93resolute1`), this permanent sliding session engine is pre-baked directly into the base deployment:
- Installed in `/opt/unetlab/html/includes/config.php`
- Enforced in `/opt/unetlab/html/includes/functions.php`
- Injected via `/opt/unetlab/html/themes/default/js/azamlabs-keepalive.js` into `/opt/unetlab/html/main/index.html`

### Manual Re-application & Verification Script
If you ever migrate databases or rebuild the web server stack, run:
```bash
sudo bash scripts/azambasha-disable-logout.sh
```

> [!NOTE]
> The script is completely idempotent and safe to re-run anytime. It automatically creates timestamped backups (`*.bak.TIMESTAMP`) for every configuration file it modifies.

---

## 3. Detailed Actions Performed by the Permanent Session Engine

1. **`config.php` Override**: Defines `SESSION = 315360000` (10 years) and configures session garbage collection and cookie lifetime to 10 years.
2. **Database Session & Expiration Update**: Inserts `ctrl_session_timeout = 315360000` into table `control` and updates table `users` to set account expiration to `-1` (never expires).
3. **`status/api.php` Patching**: Modifies the `$seconds > 86400` constraint to allow extended session checks.
4. **`functions.php` Sliding Cookie Renewal**: Modifies `updateUserCookie()` to stamp a 10-year sliding cookie on every active API request.
5. **PHP INI Configuration**: Updates `session.gc_maxlifetime`, `session.cookie_lifetime`, and `session.cache_expire` across `/etc/php/*/apache2/`, `/etc/php/*/fpm/`, and `/etc/php/*/cli/`.
6. **Background Keepalive Heartbeat**: Injects `/opt/unetlab/html/themes/default/js/azamlabs-keepalive.js` into `/opt/unetlab/html/main/index.html` to ping `/api/auth` every 3 minutes.
7. **Service Reloads**: Restarts Apache and all running PHP-FPM daemons.

---

## 4. Verification & Validation Steps

1. **Log into PNetLab Web Interface**: Open your browser, navigate to `https://<azamlabs-ip>/` and log in.
2. **Check Cookie Expiry**:
   - Press `F12` to open Developer Tools.
   - Navigate to **Application** (Chrome/Edge) or **Storage** (Firefox) &rarr; **Cookies** &rarr; `https://<azamlabs-ip>`.
   - Inspect the `token` cookie. Its **Expires / Max-Age** timestamp will now show a date **10 years in the future**.
3. **Check Database Values**: Run this terminal command on the Master VM to verify:
   ```bash
   mysql -u root -pazam -e "SELECT control_name, control_value FROM pnetlab_db.control WHERE control_name='ctrl_session_timeout'; SELECT username, FROM_UNIXTIME(session) AS session_expiry FROM pnetlab_db.users WHERE username='admin';" 2>/dev/null || \
   mysql -u root -pazam -e "SELECT control_name, control_value FROM azambasha_db.control WHERE control_name='ctrl_session_timeout'; SELECT username, FROM_UNIXTIME(session) AS session_expiry FROM azambasha_db.users WHERE username='admin';"
   ```
4. **Long Inactivity Test**: Leave the browser tab open overnight or sleep your laptop. On resume, refresh or click any lab node—you will remain authenticated with zero interruptions.

---

## 5. Important Note on Single-Session Concurrency

PNetLab stores a single active authentication token per user account in the `users.cookie` database column. If you log into the **same user account** (e.g. `admin`) from a different computer or private window, the previous device's token is rotated.

> [!TIP]
> **Best Practice**: To keep multiple browser windows or devices open simultaneously without conflict, create separate sub-accounts in **System &rarr; User Management** (e.g. `admin2`, `laptop`, `desktop`) and grant them Admin roles.

