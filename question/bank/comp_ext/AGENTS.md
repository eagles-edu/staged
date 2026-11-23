# Mandatory Versioning & SSH Deployment Directive

> ⚠️ **STRICT USER DIRECTIVE**: For every single edit, update, bug fix, or feature addition made in any project or plugin in this workspace, you MUST ALWAYS automatically execute the following 4-step workflow without being asked:

---

## 1. 📋 Document Changelog & Bump Version
- Document the update in `README.md` under the `## 📋 Changelog` section with current date and version.
- Increment the version number in `version.php` and update the version badge in `README.md`.

---

## 2. 🔀 Git Push (Master Branch)
- Push changes to GitHub:
  ```bash
  git add .
  git commit -m "<type>(<scope>): <version> <description>"
  git push origin master
  ```

---

## 3. 📦 Package ZIP Artifacts
- Run the packaging PowerShell script to update ZIP files in `packaged_plugins/`:
  ```powershell
  powershell -ExecutionPolicy Bypass -File "c:\Users\mahmo\OneDrive - Energy & Water Academy\Work\Repo\package_moodle_plugins.ps1"
  ```

---

## 4. 🚀 Direct SSH Deployment to Production LMS Server (`150.230.241.37`)
- **Host:** `ubuntu@150.230.241.37`
- **SSH Key:** `C:\Users\mahmo\Documents\ssh-key-2026-07-10 (production lms).key`
- **Plugin Paths on Host:**
  - `competency-report` → `/home/ubuntu/moodle-project/local/comp_report_ext/`
  - `block_competency_report` → `/home/ubuntu/moodle-project/blocks/comp_report_ext/`
  - `competency` → `/home/ubuntu/moodle-project/question/bank/comp_ext/`
  - `failgrade` → `/home/ubuntu/moodle-project/mod/quiz/accessrule/failgrade_ext/`
  - `attemptpassword` → `/home/ubuntu/moodle-project/mod/quiz/accessrule/attemptpassword/`
- **Full PowerShell Deploy Command (run from PowerShell):**
  ```powershell
  $sshKey    = "C:\Users\mahmo\Documents\ssh-key-2026-07-10 (production lms).key"
  $remote    = "ubuntu@150.230.241.37"
  $localPath = "c:\Users\mahmo\OneDrive - Energy & Water Academy\Work\Repo\<plugin-folder>"
  $remotePath = "/home/ubuntu/moodle-project/<plugin-remote-path>/"

  cmd /c "tar -czf - -C `"$localPath`" . | ssh -i `"$sshKey`" -o StrictHostKeyChecking=no $remote `"sudo tar -xzf - -C $remotePath`""
  ssh -i $sshKey -o StrictHostKeyChecking=no $remote "sudo docker exec -u www-data moodle-app php /var/www/html/admin/cli/upgrade.php --non-interactive && sudo docker exec -u www-data moodle-app php /var/www/html/admin/cli/purge_caches.php"
  ```

---

## 🗂️ Plugin → Path Mapping Reference

| Plugin (local folder) | Production Path |
|---|---|
| `competency-report` | `/home/ubuntu/moodle-project/local/comp_report_ext/` |
| `block_competency_report` | `/home/ubuntu/moodle-project/blocks/comp_report_ext/` |
| `competency` | `/home/ubuntu/moodle-project/question/bank/comp_ext/` |
| `failgrade` | `/home/ubuntu/moodle-project/mod/quiz/accessrule/failgrade_ext/` |
| `attemptpassword` | `/home/ubuntu/moodle-project/mod/quiz/accessrule/attemptpassword/` |

## 🐳 Docker Container Name
| Environment | Container Name |
|---|---|
| Production | `moodle-app` |


---

## 🛡️ Cloudflare Security Audit Protocol (Adversarial Hunter vs. Verifier)

This project integrates the **Cloudflare Security Audit Framework** (from `skills/security-audit`):

1. **Phase 1: Reconnaissance & Trust Boundaries**: Map attack surfaces, inputs, and security controls into `coverage-ledger.json`.
2. **Phase 2: Hunter Node (`nemotron-3.5-lightning`)**: Deeply traces potential vulnerabilities across source-to-sink paths.
3. **Phase 3: Adversarial Verifier Node (`inkling-small` / `qwen3.8-27b`)**: An isolated agent whose sole directive is to **disprove** candidate vulnerabilities and eliminate false positives.
4. **Phase 4: Structured Machine-Readable Findings**: Validated via `validate-findings.cjs` and `validate-coverage-ledger.cjs` into `confirmed`, `needs_validation`, and `rejected`.
5. **Skill Location**: `C:\Users\mahmo\.gemini\config\skills\security-audit` (available globally across all IDE projects).

---

# 📜 Release & Optimization Changelog (`qbank_comp_ext`)

### 🌟 v2.4.3 (Build `2026100902`) — 2026-10-09
- **CI / Moodle CodeChecker 100% Green Matrix Pass:**
  - Added dedicated member variable docblock for `$stoparmap` in `classes/auto_mapper.php` (`moodle.Commenting.VariableComment.Missing`).
  - **GitHub Actions Verification:** [Run #37929210954](https://github.com/engfeda-ui/competency/actions/runs/37929210954) — **PASSED (100% Green)** across PHP 8.1, 8.2, 8.3 on `MOODLE_405_STABLE`.
  - **Production LMS Deployment:** Deployed via direct SSH to `150.230.241.37` with automated CLI upgrade & cache purge.

### 🌟 v2.4.2 (Build `2026100901`) — 2026-10-09
- **Moodle Coding Standards Alignment:**
  - Standardized all variable and property names in `classes/auto_mapper.php` (`$stopen`, `$stopar`, `$stopenmap`, `$stoparmap`, `$compkwcache`, `$scoresum`) removing underscores.
  - Wrapped long boolean expressions in `classes/column/competency_column.php` to remain strictly within the 132-character limit.
  - Added required space after closure function keyword.

### ⚡ v2.4.1 — 2026-10-08
- **Hardening & Performance Optimization:**
  - Static memoization of stop-word lookup tables and competency keyword token sets ($O(M)$ instead of $O(N \times M)$).
  - Unicode Arabic property class regexes (`\p{Mn}` and `\p{Arabic}`).
  - Psychometric Auto-Mapping Engine with threshold `0.20`.

