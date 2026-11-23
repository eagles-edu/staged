// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @module     block_mwa_dashboard/grades
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Note: This module generates HTML markup directly in JavaScript strings for
 * performance reasons — the dashboard renders large dynamic datasets (student lists,
 * heatmaps, charts) that require frequent partial updates. All user-supplied data is
 * escaped via the esc() helper before insertion into the DOM.
 * See: https://docs.moodle.org/dev/JavaScript_Modules#HTML_generation
 */
define(['block_mwa_dashboard/dashboardstore', 'core/chartjs'], function(Store, Chart) {

    'use strict';

    var window = Store.windowFacade();

    (function () {
      function icon(name) {
        return '<svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-' + name + '"></use></svg>';
      }
      'use strict';
    
      function tr(key) {
        var S = Store.getStrings() || {};
        var v = Object.prototype.hasOwnProperty.call(S, key) ? S[key] : '';
        if (typeof v === 'string' && v && !/^\[\[.*\]\]$/.test(v)) return v;
        return key;
      }
      function esc(v) {
        return String(v === undefined || v === null ? '' : v)
          .replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
          });
      }
      function tip(key, extraClass) {
        var text = esc(tr(key).replace(/\{approval\}/g, approvalGrade()));
        var classes = 'mwa-help-tip' + (extraClass ? ' ' + extraClass : '');
        return '<span class="' + classes + '" tabindex="0" role="img" aria-label="' + text + '" title="' + text + '" data-tooltip="' + text + '">?</span>';
      }
      function gradeCourseKey() {
        var cfg = Store.getConfig ? (Store.getConfig() || {}) : {};
        return String(cfg.courseid || cfg.course || '0');
      }
      function approvalGrade() {
        var cfg = Store.getConfig ? (Store.getConfig() || {}) : {};
        var value = Number(cfg.approvalgrade);
        return value >= 1 && value <= 100 ? value : 60;
      }
      function hasEffectiveActivityGrade(g, key) {
        var value = g && g.actGrades ? g.actGrades[String(key)] : null;
        if (value === null || value === undefined || isNaN(Number(value))) return false;
        var current = g && g.actCurrent ? Number(g.actCurrent[String(key)] || 0) : 0;
        var submissionTime = g && g.actSubmissionTimes ? Number(g.actSubmissionTimes[String(key)] || 0) : 0;
        var gradeTime = g && g.actGradeTimes ? Number(g.actGradeTimes[String(key)] || 0) : 0;
        // A new delivery made after the last correction must be graded again.
        if (current > 0 && submissionTime > 0 && gradeTime > 0 && submissionTime > gradeTime) return false;
        // A zero is a released grade only when the student actually delivered.
        return Number(value) !== 0 || current > 0;
      }
      function hasAllMonitoredGrades(g) {
        var acts = g && g.actGrades || {};
        var current = g && g.actCurrent || {};
        var now = Math.floor(Date.now() / 1000);
        var keys = Object.keys(ACT_MAXES).filter(function(key) {
          return Number(ACT_MAXES[key] || 0) > 0;
        });
        if (!keys.length) keys = Object.keys(acts);
        return keys.length > 0 && keys.every(function(key) {
          var hasGrade = hasEffectiveActivityGrade(g, key, now);
          if (hasGrade) return true;
          var hasSubmission = Number(current[String(key)] || 0) > 0;
          var deadline = Number(ACT_DUE_DATES[Number(key)] || ACT_AVAILABLE_UNTIL[Number(key)] || 0);
          return !hasSubmission && deadline > 0 && deadline < now;
        });
      }
      function gradeDeltaChip(delta, invertColors) {
        if (delta === null || delta === undefined || isNaN(Number(delta))) {
          return '';
        }
        delta = Number(delta);
        var good = invertColors ? delta < 0 : delta > 0;
        var color = delta === 0 ? '#8a94a8' : good ? '#13794c' : '#b42318';
        var bg = delta === 0 ? '#f0f2f7' : good ? '#e8f7ef' : '#fdecec';
        var label = delta === 0 ? '0' : (delta > 0 ? '+' + delta : String(delta));
        return '<span class="gr-kpi-chip" style="background:' + bg + ';color:' + color + ';">' + esc(label) + '</span>';
      }
      function gradeTrendSnapshot() {
        var key = 'mwa_grades_kpi_counts_' + gradeCourseKey();
        var saved = null;
        try {
          saved = JSON.parse((window.localStorage && window.localStorage.getItem(key)) || 'null');
        } catch (e) {
          saved = null;
        }
        return saved && saved.counts ? saved : null;
      }
      function saveGradeTrendSnapshot(metrics, previousSnapshot) {
        var key = 'mwa_grades_kpi_counts_' + gradeCourseKey();
        try {
          if (window.localStorage) {
            var today = new Date().toISOString().slice(0, 10);
            if (!previousSnapshot || previousSnapshot.day !== today) {
              window.localStorage.setItem(key, JSON.stringify({day: today, counts: metrics}));
            }
          }
        } catch (e) {
          // Storage is optional; chips start from zero when unavailable.
        }
      }
      function gradeMetricDelta(current, baseline, key) {
        var previous = Number(Object.prototype.hasOwnProperty.call(baseline || {}, key) ? baseline[key] : current[key]);
        return Number(current[key]) - previous;
      }
      function gradeChipWrap(chip) {
        return chip ? '<span class="gr-kpi-chip-wrap">' + chip + '</span>' : '';
      }
      function norm(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
      function normKey(k) { return String(k || '').replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }
    
      /* ── globally accessible cache ── */
      var GRADES_CACHE = [];
      var GRADES_COURSE_COMPLETE = false;
      var ACT_NAMES    = {};  // { seq: 'Nome completo da atividade' }
      var ACT_CMIDS    = {};  // { seq: cmid }
      var ACT_MODULES  = {};  // { seq: 'forum'|'assign'|... }
      var ACT_AVAILABLE = {};
      var ACT_AVAILABLE_FROM = {};
      var ACT_AVAILABLE_UNTIL = {};
      var ACT_DUE_DATES = {};
      var ACT_MAXES = {};
      var ACT_HIDDEN = {};
      var GR_PAGE = 1;
      var GR_PAGE_SIZE = 10;
      var GR_NAME_SORT = '';
      var GR_SELECTED = {};
      var GR_SELECTABLE = {};

      function gradeSelectionKey(g) {
        return g && g.userid ? 'u' + g.userid : 'e' + norm(g && g.email || g && g.name).toLowerCase();
      }
      function gradeTarget(g) {
        return {name: g.name, email: g.email || '', userid: Number(g.userid || 0)};
      }
      function updateGradeBulkAction() {
        var selected = Object.keys(GR_SELECTED).length;
        var button = document.getElementById('grBulkMessage');
        var count = document.getElementById('grBulkMessageCount');
        if (button) button.disabled = selected === 0;
        if (count) count.textContent = selected;
        var search = ((document.getElementById('grSearch') || {}).value || '').toLowerCase().trim();
        var group = (document.getElementById('grFilter') || {}).value || 'all';
        var visible = Array.from(document.querySelectorAll('#grCardUnified .mwa-student-select')).filter(function(box) {
          var row = box.closest('tr');
          return (group === 'all' || row.dataset.group === group) && (!search || String(row.dataset.name || '').indexOf(search) >= 0);
        });
        var master = document.getElementById('grSelectVisible');
        if (master) {
          var checked = visible.filter(function(box) { return box.checked; }).length;
          master.checked = visible.length > 0 && checked === visible.length;
          master.indeterminate = checked > 0 && checked < visible.length;
          master.disabled = visible.length === 0;
        }
      }
      function toggleGradeSelection(input) {
        var key = input.getAttribute('data-selection-key');
        var g = GR_SELECTABLE[key];
        if (!g) return;
        if (input.checked) GR_SELECTED[key] = gradeTarget(g); else delete GR_SELECTED[key];
        updateGradeBulkAction();
      }
      function toggleVisibleGradeSelection(input) {
        var shouldSelect = !!input.checked;
        var search = ((document.getElementById('grSearch') || {}).value || '').toLowerCase().trim();
        var group = (document.getElementById('grFilter') || {}).value || 'all';
        document.querySelectorAll('#grCardUnified .mwa-student-select').forEach(function(box) {
          var row = box.closest('tr');
          if ((group !== 'all' && row.dataset.group !== group) || (search && String(row.dataset.name || '').indexOf(search) < 0)) return;
          var key = box.getAttribute('data-selection-key');
          var student = GR_SELECTABLE[key];
          box.checked = shouldSelect;
          if (student) {
            if (shouldSelect) GR_SELECTED[key] = gradeTarget(student); else delete GR_SELECTED[key];
          }
        });
        updateGradeBulkAction();
      }
      function messageSelectedGrades() {
        var targets = Object.keys(GR_SELECTED).map(function(key) { return GR_SELECTED[key]; });
        if (targets.length && window.MWAActionCenter) window.MWAActionCenter.openBulkModal(targets, {});
      }
    
      /* ════════════════════════════════════════════
         PARSE — converte array bruto de notas
         Suporta o formato real retornado pela api.php:
           'First name', 'Last name', 'Email'
           'Activity N - NomeDaAtividade (Grade)'
           'Course total (Grade)'
         E também o formato de export XLSX do Moodle:
           'Nome', 'Sobrenome', 'Email'
           '[Atividade N] NomeDaAtividade (Real)'
           'Total do curso (Real)'
      ════════════════════════════════════════════ */
      function parseGrades(raw) {
        if (!raw || !raw.length) return [];
    
        // Primeira linha: metadados com nomes reais das atividades vindos do PHP.
        // Formato: { __mwa_type__: 'activity_names', act_1: 'Forum', act_2: 'Tarefa', ... }
        var offset = 0;
        ACT_NAMES  = {};
        ACT_CMIDS  = {};
        ACT_MODULES = {};
        ACT_AVAILABLE = {};
        ACT_AVAILABLE_FROM = {};
        ACT_AVAILABLE_UNTIL = {};
        ACT_DUE_DATES = {};
        ACT_MAXES = {};
        ACT_HIDDEN = {};
        if (raw[0] && raw[0]['__mwa_type__'] === 'activity_names') {
          var metaRow = raw[0];
          offset = 1;
          Object.keys(metaRow).forEach(function (k) {
            var m = k.match(/^act_(\d+)$/);
            if (m) { ACT_NAMES[Number(m[1])] = norm(metaRow[k]); return; }
            var mc = k.match(/^act_cmid_(\d+)$/);
            if (mc) { ACT_CMIDS[Number(mc[1])] = Number(metaRow[k]) || 0; return; }
            var mm = k.match(/^act_module_(\d+)$/);
            if (mm) { ACT_MODULES[Number(mm[1])] = norm(metaRow[k]); return; }
            var ma = k.match(/^act_available_(\d+)$/);
            if (ma) { ACT_AVAILABLE[Number(ma[1])] = String(metaRow[k]) !== '0'; return; }
            var maf = k.match(/^act_availablefrom_(\d+)$/);
            if (maf) { ACT_AVAILABLE_FROM[Number(maf[1])] = Number(metaRow[k]) || 0; return; }
            var mau = k.match(/^act_availableuntil_(\d+)$/);
            if (mau) { ACT_AVAILABLE_UNTIL[Number(mau[1])] = Number(metaRow[k]) || 0; return; }
            var md = k.match(/^act_duedate_(\d+)$/);
            if (md) { ACT_DUE_DATES[Number(md[1])] = Number(metaRow[k]) || 0; }
            var mx = k.match(/^act_max_(\d+)$/);
            if (mx) { ACT_MAXES[Number(mx[1])] = Number(metaRow[k]) || 0; return; }
            var mh = k.match(/^act_hidden_(\d+)$/);
            if (mh) { ACT_HIDDEN[Number(mh[1])] = String(metaRow[k]) !== '0'; }
          });
        }
    
        var sample = raw[offset] || raw[0];
        if (!sample) return [];
        var keys   = Object.keys(sample).filter(function (k) { return k !== '__mwa_type__'; });
    
        // Detect name columns — supports pt and en
        var firstNameKey = keys.find(function (k) { return /^(nome|first\s*name)$/i.test(k.trim()); });
        var lastNameKey  = keys.find(function (k) { return /^(sobrenome|last\s*name|surname)$/i.test(k.trim()); });
        var fullNameKey  = keys.find(function (k) { return /nome.*completo|full.*name|^aluno$/i.test(k); });
        var emailKey     = keys.find(function (k) { return /e.?mail/i.test(k); });
    
        // Detect total column — supports API format ('Course total (Grade)')
        // e formato XLSX ('Total do curso (Real)')
        var totalKey = keys.find(function (k) { return /^course\s+total\s*\(grade\)/i.test(normKey(k)); })
          || keys.find(function (k) { return normKey(k).startsWith('total do curso'); })
          || keys.find(function (k) { return /nota\s+final|final\s+grade/i.test(normKey(k)); })
          || keys.find(function (k) { return normKey(k) === 'total'; });
    
        // Use the full maximum of every currently monitored activity. "Course total max"
        // only contains the maximum of items already graded for each student, which can
        // differ between students and incorrectly approve low partial totals.
        var totalMaxKey = keys.find(function (k) { return /^course\s+full\s+max/i.test(normKey(k)); })
          || keys.find(function (k) { return /^course\s+total\s+max/i.test(normKey(k)); });
    
        if (!totalKey) {
          // fallback: last numeric column
          for (var i = keys.length - 1; i >= 0; i--) {
            var k = keys[i];
            if (!k) continue;
            var vals = raw.slice(0, 5).map(function (r) { return r[k]; })
              .filter(function (v) { return v !== null && v !== undefined && v !== '-' && v !== ''; });
            var nums = vals.map(function (v) { return parseFloat(String(v).replace(',', '.')); })
              .filter(function (n) { return !isNaN(n) && n <= 500; });
            if (nums.length >= 3) { totalKey = k; break; }
          }
        }
    
        return raw.slice(offset).filter(function (r) {
          return !r || r['__mwa_type__'] !== 'activity_names';
        }).map(function (r) {
          // Nome
          var name = '';
          if (firstNameKey && lastNameKey) {
            name = ((r[firstNameKey] || '') + ' ' + (r[lastNameKey] || '')).trim();
          } else if (fullNameKey) {
            name = norm(r[fullNameKey]);
          } else {
            name = norm(r[keys[0]]);
          }
    
          // Total
          var rawVal = totalKey ? r[totalKey] : null;
          var num    = (rawVal === '-' || rawVal === null || rawVal === undefined)
            ? NaN : parseFloat(String(rawVal).replace(',', '.'));
          var total  = (!isNaN(num) && num >= 0 && num <= 100000) ? num : null;
    
          // Maximum possible grade (for proportional pass threshold)
          var rawMax = totalMaxKey ? r[totalMaxKey] : null;
          var numMax = (rawMax === '-' || rawMax === null || rawMax === undefined)
            ? NaN : parseFloat(String(rawMax).replace(',', '.'));
          var totalmax = (!isNaN(numMax) && numMax > 0) ? numMax : null;
    
          var email  = emailKey ? norm(r[emailKey]) : '';
    
          // Grades per activity
          var actGrades = {};
          var actCurrent = {};
          var actSubmissionTimes = {};
          var actGradeTimes = {};
          var seq = 0;
          keys.forEach(function (k) {
            // Formato da API: chave = 'act_N' (ex: 'act_1', 'act_2')
            var mActKey = k.match(/^act_(\d+)$/);
            if (mActKey) {
              seq = Number(mActKey[1]);
              var v = r[k];
              var parsed = (v === '-' || v === null || v === undefined || v === '') ? null
                : parseFloat(String(v).replace(',', '.'));
              actGrades[String(seq)] = isNaN(parsed) ? null : parsed;
              return;
            }
            var mCurrentKey = k.match(/^act_current_(\d+)$/);
            if (mCurrentKey) {
              var cseq = Number(mCurrentKey[1]);
              var cv = parseInt(r[k], 10);
              actCurrent[String(cseq)] = isNaN(cv) ? 0 : cv;
              return;
            }
            var mSubmissionTimeKey = k.match(/^act_submissiontime_(\d+)$/);
            if (mSubmissionTimeKey) {
              actSubmissionTimes[String(Number(mSubmissionTimeKey[1]))] = Number(r[k] || 0);
              return;
            }
            var mGradeTimeKey = k.match(/^act_gradetime_(\d+)$/);
            if (mGradeTimeKey) {
              actGradeTimes[String(Number(mGradeTimeKey[1]))] = Number(r[k] || 0);
              return;
            }
            // Fallback: formato XLSX exportado manualmente pelo professor
            var kn = String(k || '').replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim();
            var mXlsx       = kn.match(/\[Atividade\s*(\d+)\]/i);
            var mXlsxApi    = kn.match(/^Atividade\s+(\d+)\s*[-–]\s*(.+?)(?:\s*\(Real\)|\s*\(Valor\))?\s*$/i);
            var mXlsxMoodle = kn.match(/^(Tarefa|Forum|Forum|Questionário|H5P|Wiki|Glossário|Lição|SCORM|Arquivo|Pacote\s+H5P|Base\s+de\s+dados)[:\s]+(.+?)(?:\s*\(Real\)|\s*\(Valor\))?\s*$/i);
            var mApi        = kn.match(/^Activity\s+(\d+)\s*[-–]\s*(.+?)(?:\s*\(Grade\))?\s*$/i);
            var isAct       = mXlsx || mXlsxApi || mXlsxMoodle || mApi;
            if (!isAct) return;
            seq++;
            var actName = kn.replace(/\(Grade\)|\(Real\)|\(Valor\)/gi, '').trim() || kn.trim();
            if (!ACT_NAMES[seq]) ACT_NAMES[seq] = actName;
            var v = r[k];
            var parsed = (v === '-' || v === null || v === undefined || v === '') ? null
              : parseFloat(String(v).replace(',', '.'));
            actGrades[String(seq)] = isNaN(parsed) ? null : parsed;
          });
    
          var pictureurl = r['Picture URL'] || r.pictureurl || r.profileimageurl || r.userpictureurl || '';
          // Preserve the access marker supplied by the API. A null value means
          // an older import that did not contain this field; zero specifically
          // identifies a student who has never accessed Moodle.
          var hasLastAccess = Object.prototype.hasOwnProperty.call(r, '_last_access');
          var lastaccess = hasLastAccess ? Number(r._last_access || 0) : null;
          return { name: name, total: total, totalmax: totalmax, email: email, userid: Number(r['User ID'] || r.userid || r._userid || 0), pictureurl: pictureurl, lastaccess: lastaccess, actGrades: actGrades, actCurrent: actCurrent, actSubmissionTimes: actSubmissionTimes, actGradeTimes: actGradeTimes };
        }).filter(function (g) { return g.name; });
      }
    
      /* ════════════════════════════════════════════
         RENDER PRINCIPAL
      ════════════════════════════════════════════ */
      function renderGrades() {
        var el = document.getElementById('gradesWrap');
        if (!el) return;
    
        var dash  = window.MWADashboard || {};
        var state = dash.state || {};
        var raw   = state.grades || [];
    
        if (!raw.length) {
          Store.renderHtml(el, '<div class="gr-empty"><div class="gr-empty-icon">' + icon('file') + '</div><p>' + esc(tr('gr_no_grades_loaded')) + '</p></div>');
          return;
        }
    
        var grades   = parseGrades(raw);
        var approval = approvalGrade();
        GRADES_CACHE = grades;
        window.MWA_GRADES_CACHE = grades;
        window.MWA_ACT_NAMES    = ACT_NAMES;
        window.MWA_ACT_CMIDS    = ACT_CMIDS;
        window.MWA_ACT_MODULES  = ACT_MODULES;
    
        // Enriquecer ACT_NAMES com nomes reais dos logs (contextodoevento)
        // Only replace if the current name is numeric or empty (means PHP
        // could not get real name). If the XLSX already provided a descriptive name,
        // keep the XLSX name which is more descriptive.
        var logs = (window.MWADashboard && window.MWADashboard.state && window.MWADashboard.state.logs) || [];
        if (logs.length) {
          // Build map: activity number → contextodoevento name
          var logNameMap = {};
          logs.forEach(function (r) {
            var ctx = (r.contextodoevento || '').trim();
            if (!ctx) return;
            var m = ctx.match(/^Atividade\s+(\d+)\s*[-–]\s*(.+)$/i);
            if (m) logNameMap[m[1]] = ctx; // nome completo: "Atividade 3 - Tarefa"
          });
          // Only replace if current ACT_NAMES entry is numeric/empty
          Object.keys(ACT_NAMES).forEach(function (seq) {
            var current = ACT_NAMES[seq] || '';
            var isNumericOrEmpty = !current || /^\d+$/.test(current.trim());
            if (isNumericOrEmpty && logNameMap[seq]) {
              ACT_NAMES[seq] = logNameMap[seq];
            }
          });
        }
    
        var valid    = grades.filter(function (g) { return g.total !== null && g.total >= 0; });
    
        var courseMax = grades.reduce(function(maximum, g) {
          return g.totalmax && g.totalmax > maximum ? g.totalmax : maximum;
        }, 0) || 100;
        GRADES_COURSE_COMPLETE = courseMax >= 100;
        function maxFor(g) {
          return g.totalmax && g.totalmax > 0 ? g.totalmax : courseMax;
        }
        function targetFor(g) {
          return maxFor(g) * approval / 100;
        }
        function isApproved(g) {
          return GRADES_COURSE_COMPLETE && g.total !== null && g.total >= (100 * approval / 100);
        }
        function isFailed(g) {
          return GRADES_COURSE_COMPLETE && hasAllMonitoredGrades(g) &&
            g.total !== null && g.total < (100 * approval / 100);
        }
        function pctNorm(g) {
          return Math.min(100, Math.round(g.total / maxFor(g) * 100));
        }
    
        var approved = valid.filter(function (g) { return isApproved(g); });
        var failed   = valid.filter(function (g) { return isFailed(g); });
        var inProg   = valid.filter(function (g) { return !isApproved(g) && !isFailed(g); });
        // "Sem nota" must not duplicate students from "Sem acesso registrado".
        var noGrade  = grades.filter(function (g) {
          return g.total === null && g.lastaccess !== 0;
        });
        var maxG     = valid.length ? Math.max.apply(null, valid.map(function (g) { return g.total; })) : 0;
    
        // Average grade as raw value (not normalised)
        var avgNorm  = valid.length
          ? valid.reduce(function (s, g) { return s + (g.total||0); }, 0) / valid.length : 0;
        /* Percentages are taken over the whole class, not just the students who
           already have a grade. Using valid.length made 2 approved out of 10
           students read as 67%, because only 3 had grades launched. */
        var classSize   = grades.length;
        function classPct(n){ return classSize ? Math.round(n / classSize * 100) : 0; }
        var passRate = classPct(approved.length);
        var isMid    = courseMax > 0 && courseMax < 100;
    
        var hasActGrades = grades.some(function (g) { return g.actGrades && Object.keys(g.actGrades).length > 0; });
        var allActKeys   = hasActGrades
          ? Array.from(new Set(grades.reduce(function (a, g) { return a.concat(Object.keys(g.actGrades || {})); }, [])))
              .sort(function (a, b) { return (parseInt(a) || 0) - (parseInt(b) || 0); })
          : [];
        var totalActs = allActKeys.length;
    
        function actSummary(g) {
          if (!hasActGrades || !totalActs) return null;
          var acts   = g.actGrades || {};
          var now = Math.floor(Date.now() / 1000);
          var graded = Object.keys(acts).filter(function (key) { return hasEffectiveActivityGrade(g, key, now); }).length;
          return { graded: graded, total: Object.keys(acts).length };
        }

        function studentCell(g) {
          var initials = String(g.name || '').trim().split(/\s+/).slice(0, 2).map(function(part) {
            return part.charAt(0).toUpperCase();
          }).join('') || '?';
          var avatar = g.pictureurl
            ? '<img src="' + esc(g.pictureurl) + '" alt="" loading="lazy">'
            : '<span aria-hidden="true">' + esc(initials) + '</span>';
          return '<button type="button" class="gr-student-link" data-gname="' + esc(g.name) + '" onclick="event.stopPropagation();window.MWAGrades.showDetailByEl(this)">'
            + '<span class="gr-student-avatar' + (g.pictureurl ? ' has-image' : '') + '">' + avatar + '</span>'
            + '<span class="gr-name">' + esc(g.name) + '</span></button>';
        }
        var currentMetrics = {
          approved: approved.length,
          inprogress: inProg.length,
          failed: failed.length,
          nograde: noGrade.length,
          highest: Math.round(maxG)
        };
        var trendSnapshot = gradeTrendSnapshot();
        var baselineMetrics = (trendSnapshot && trendSnapshot.counts) || {approved: 0, inprogress: 0, failed: 0, nograde: 0, highest: 0};
        var gradeChips = {
          approved: gradeDeltaChip(gradeMetricDelta(currentMetrics, baselineMetrics, 'approved'), false),
          inprogress: gradeDeltaChip(gradeMetricDelta(currentMetrics, baselineMetrics, 'inprogress'), true),
          failed: gradeDeltaChip(gradeMetricDelta(currentMetrics, baselineMetrics, 'failed'), true),
          nograde: gradeDeltaChip(gradeMetricDelta(currentMetrics, baselineMetrics, 'nograde'), true)
        };
        var avgPct = valid.length ? valid.reduce(function(sum, g) { return sum + pctNorm(g); }, 0) / valid.length : 0;
        var maxStudent = valid.length ? valid.slice().sort(function(a, b) { return b.total - a.total; })[0] : null;
        var avgClass = avgPct >= approval ? 'gr-grade-ok' : 'gr-grade-low';
        var maxClass = maxStudent && isApproved(maxStudent) ? 'gr-grade-ok' : 'gr-grade-low';
    
        // ── KPIs ──
        var kpisHtml =
          '<div class="kpis gr-analysis-kpis">'
          + '<button type="button" class="kpi c-green gr-kpi-filter gr-kpi-with-chip gr-analysis-kpi gr-kpi-green" onclick="window.MWAGrades&&window.MWAGrades.setFilter(\'approved\')">' + gradeChipWrap(gradeChips.approved) + '<div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-check"></use></svg></span><div class="kpi-label">' + tr('gr_approved') + tip('gr_tip_kpi_approved') + '</div></div><div class="kpi-value">' + passRate + '%</div><div class="kpi-sub">' + approved.length + ' ' + esc(approved.length === 1 ? tr('student') : tr('students')) + '</div></button>'
          + '<button type="button" class="kpi c-amber gr-kpi-filter gr-kpi-with-chip gr-analysis-kpi gr-kpi-amber" onclick="window.MWAGrades&&window.MWAGrades.setFilter(\'inprogress\')">' + gradeChipWrap(gradeChips.inprogress) + '<div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-hourglass"></use></svg></span><div class="kpi-label">' + tr('gr_in_progress') + tip('gr_tip_kpi_in_progress') + '</div></div><div class="kpi-value">' + classPct(inProg.length) + '%</div><div class="kpi-sub">' + inProg.length + ' ' + esc(inProg.length === 1 ? tr('student') : tr('students')) + '</div></button>'
          + '<button type="button" class="kpi c-red gr-kpi-filter gr-kpi-with-chip gr-analysis-kpi gr-kpi-red" onclick="window.MWAGrades&&window.MWAGrades.setFilter(\'failed\')">' + gradeChipWrap(gradeChips.failed) + '<div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-close"></use></svg></span><div class="kpi-label">' + tr('gr_failed') + tip('gr_tip_kpi_failed') + '</div></div><div class="kpi-value">' + classPct(failed.length) + '%</div><div class="kpi-sub">' + failed.length + ' ' + esc(failed.length === 1 ? tr('student') : tr('students')) + '</div></button>'
          + '<button type="button" class="kpi c-red gr-kpi-filter gr-kpi-with-chip gr-analysis-kpi gr-kpi-red" onclick="window.MWAGrades&&window.MWAGrades.setFilter(\'nograde\')">' + gradeChipWrap(gradeChips.nograde) + '<div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-circle"></use></svg></span><div class="kpi-label">' + tr('gr_no_grade') + tip('gr_tip_kpi_no_grade') + '</div></div><div class="kpi-value">' + classPct(noGrade.length) + '%</div><div class="kpi-sub">' + noGrade.length + ' ' + esc(noGrade.length === 1 ? tr('student') : tr('students')) + '</div></button>'
          + '<div class="kpi c-blue gr-analysis-kpi gr-kpi-blue"><div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-chart"></use></svg></span><div class="kpi-label">' + tr('gr_avg_grade') + tip('gr_tip_avg_grade') + '</div></div><div class="kpi-value ' + avgClass + '">' + avgNorm.toFixed(1) + '</div></div>'
          + (maxG > 0 ? '<div class="kpi c-teal gr-analysis-kpi gr-kpi-teal"><div class="gr-kpi-head"><span class="gr-kpi-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-star"></use></svg></span><div class="kpi-label">' + tr('gr_highest') + tip('gr_tip_highest') + '</div></div><div class="kpi-value ' + maxClass + '">' + maxG.toFixed(1) + '</div></div>' : '')
          + '</div>';
    
        // ── Partial semester warning ──
        var midHtml = isMid
          ? '<div class="gr-mid-warning"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-bell"></use></svg><div><strong>' + tr('gr_partial_warning_title') + '</strong> — ' + tr('gr_partial_warning_body').replace('{max}', courseMax.toFixed(1)).replace('{target}', (courseMax * approval / 100).toFixed(1)).replace('{approval}', approval) + '</div></div>'
          : '';
    
        // ── Charts ──
        var chartsHtml =
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">'
          + '<div class="card gr-chart-card"><div class="card-head" style="padding:12px 16px;font-size:.75rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);">' + icon('chart') + ' ' + tr('gr_chart_dist') + tip('gr_tip_chart_distribution') + '</div><div style="height:220px;padding:12px;"><canvas id="grChartDist"></canvas></div></div>'
          + '<div class="card gr-chart-card"><div class="card-head" style="padding:12px 16px;font-size:.75rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-check"></use></svg>' + tr('gr_chart_approval') + tip('gr_tip_chart_approval') + '</div><div style="height:220px;padding:12px;"><canvas id="grChartAR"></canvas></div></div>'
          + '</div>';
    
        // ── Filter bar ──
        var filterHtml =
          '<div class="gr-filter-panel">'
          + (Store.getConfig().canmanageactivitytracking ? '<div class="gr-approval-setting"><div><strong>' + esc(tr('gr_approval_setting')) + '</strong><small>' + esc(tr('gr_approval_setting_help')) + '</small></div><label><input id="grApprovalGrade" type="number" min="1" max="100" step="1" value="' + approval + '"><span>%</span></label><button type="button" class="gr-save-approval-btn" onclick="window.MWAGrades&&window.MWAGrades.saveApprovalGrade()">' + icon('check') + '<span>' + esc(tr('gr_approval_save')) + '</span></button></div>' : '')
          + '<div class="gr-filter-row">'
            + '<div class="gr-filter-group">'
              + '<div class="gr-filter-label">' + esc(tr('gr_filter_status_label', 'Situação')) + '</div>'
              + '<select id="grFilter" class="gr-standard-select" onchange="window.MWAGrades&&window.MWAGrades.filter(true)">'
                + '<option value="all">' + esc(tr('ev_all')) + '</option>'
                + '<option value="approved">' + esc(tr('gr_approved')) + '</option>'
                + '<option value="inprogress">' + esc(tr('gr_in_progress')) + '</option>'
                + '<option value="failed">' + esc(tr('gr_failed')) + '</option>'
                + '<option value="nograde">' + esc(tr('gr_no_grade')) + '</option>'
              + '</select>'
            + '</div>'
            + '<div class="gr-filter-group gr-filter-search-group">'
              + '<label class="gr-filter-label" for="grSearch">' + esc(tr('gr_filter_search_label', 'Buscar')) + '</label>'
              + '<label class="gr-search-wrap"><span class="gr-search-icon" aria-hidden="true"><svg class="mwa-ui-icon"><use href="#mwa-icon-search"></use></svg></span><input id="grSearch" type="search" class="gr-search" placeholder="' + esc(tr('gr_search_placeholder')) + '" oninput="window.MWAGrades&&window.MWAGrades.filter(true)"></label>'
            + '</div>'
            + '<div class="gr-filter-group gr-filter-clear-group">'
              + '<div class="gr-filter-label">&nbsp;</div>'
              + '<button class="gr-clear-btn" onclick="window.MWAGrades&&window.MWAGrades.clearFilters()">' + icon('trash') + ' ' + esc(tr('clearfilters')) + '</button>'
            + '</div>'
            + '<div class="gr-filter-group gr-filter-export-group">'
              + '<div class="gr-filter-label">&nbsp;</div>'
              + '<button type="button" class="gr-export-btn" onclick="window.MWAGrades&&window.MWAGrades.exportXLSX()">' + icon('file') + '<span>' + esc(tr('gr_export')) + '</span></button>'
            + '</div>'
            + '<div class="gr-filter-group gr-filter-message-group">'
              + '<div class="gr-filter-label">&nbsp;</div>'
              + '<button type="button" id="grBulkMessage" class="mwa-bulk-message-btn" onclick="window.MWAGrades&&window.MWAGrades.messageSelected()" disabled>' + icon('mail') + '<span>' + esc(tr('message', 'Mensagem')) + '</span><b id="grBulkMessageCount">0</b></button>'
            + '</div>'
          + '</div>'
          + '</div>';
    
        // ── Approved table ──
        var approvedTableCols = '<colgroup><col style="width:68%"><col style="width:24%"><col style="width:8%"></colgroup>';
        var progressTableCols = '<colgroup><col style="width:32%"><col style="width:14%"><col style="width:14%"><col style="width:32%"><col style="width:8%"></colgroup>';
        var noGradeTableCols = approvedTableCols;
        var approvedRows = approved.slice().sort(function (a, b) { return pctNorm(b) - pctNorm(a); }).map(function (g, i) {
          var gradeLabel = g.total.toFixed(1);
          return '<tr class="gr-clickable-row" data-name="' + esc(g.name).toLowerCase() + '" data-gname="' + esc(g.name) + '" data-group="approved" onclick="window.MWAGrades.showDetailByEl(this)">'
            + '<td>' + studentCell(g) + '</td>'
            + '<td><span class="gr-grade-val" style="color:var(--green);">' + gradeLabel + '</span></td>'
            + '<td class="gr-open-cell"><span class="gr-row-arrow">&nearr;</span></td>'
            + '</tr>';
        }).join('');
    
        var approvedHtml = '<div class="gr-card approved" id="grCardApproved">'
          + '<div class="gr-card-head"><span class="gr-card-title" style="color:var(--green);"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-check"></use></svg>' + tr('gr_approved') + ' (' + approved.length + ')</span>' + tip('gr_tip_card_approved') + '<span class="gr-card-sub">≥ ' + approval.toFixed(1) + ' ' + tr('gr_points') + ' (' + approval + '% de 100)</span></div>'
          + '<div class="gr-table-scroll"><table class="gr-tbl gr-approved-table">' + approvedTableCols + '<thead><tr><th>' + tr('gr_col_student') + '</th><th>' + tr('gr_col_grade') + '</th><th aria-hidden="true"></th></tr></thead><tbody>' + approvedRows + '</tbody></table></div>'
          + '</div>';
    
        // ── In progress table ──
        var inProgHtml = '';
        if (inProg.length) {
          var avgIP    = (inProg.reduce(function (s, g) { return s + g.total; }, 0) / inProg.length).toFixed(1);
          var avgFalta = (inProg.reduce(function (s, g) {
            return s + Math.max(0, targetFor(g) - g.total);
          }, 0) / inProg.length).toFixed(1);
          var ipRows   = inProg.slice().sort(function (a, b) { return pctNorm(b) - pctNorm(a); }).map(function (g, i) {
            var maximum = maxFor(g);
            var target = targetFor(g);
            var pct = pctNorm(g);
            var barColor = pct >= approval ? 'var(--green)' : pct >= Math.max(20, approval - 20) ? 'var(--amber)' : 'var(--red)';
            var missing = Math.max(0, target - g.total);
            var falta = missing > 0 ? '−' + missing.toFixed(1) : '—';
            var gradeLabel = g.total.toFixed(1);
            var gradeColor = g.total >= target ? 'var(--green)' : 'var(--amber)';
            return '<tr class="gr-clickable-row" data-name="' + esc(g.name).toLowerCase() + '" data-gname="' + esc(g.name) + '" data-group="inprogress" onclick="window.MWAGrades.showDetailByEl(this)">'
              + '<td>' + studentCell(g) + '</td>'
              + '<td><span class="gr-grade-val" style="color:' + gradeColor + ';">' + gradeLabel + '</span></td>'
              + '<td><span style="font-family:\'DM Mono\',monospace;font-size:.8rem;color:var(--red);">' + falta + '</span></td>'
              + '<td><div class="gr-prog-wrap"><div class="gr-prog-bg"><div class="gr-prog-fill" style="width:' + pct + '%;background:' + barColor + ';"></div><div class="gr-prog-marker" title="' + esc(tr('gr_target')) + ': ' + target.toFixed(1) + ' pts (' + approval + '%)" style="left:' + approval + '%;"></div></div><span class="gr-prog-label" style="color:' + barColor + ';">' + g.total.toFixed(0) + '/' + maximum.toFixed(0) + '</span></div><div class="gr-prog-sub">' + esc(tr('gr_target')) + ': ' + target.toFixed(1) + ' pts (' + approval + '%)</div></td>'
              + '<td class="gr-open-cell"><span class="gr-row-arrow">&nearr;</span></td>'
              + '</tr>';
          }).join('');
    
          inProgHtml = '<div class="gr-card inprogress" id="grCardInProgress">'
            + '<div class="gr-card-head"><span class="gr-card-title" style="color:var(--amber);"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-hourglass"></use></svg>' + tr('gr_in_progress') + ' (' + inProg.length + ')</span>' + tip('gr_tip_card_in_progress') + '<span class="gr-card-sub">' + tr('gr_below_60_note').replace('{approval}', approval) + '</span></div>'
            + '<div class="gr-table-scroll"><table class="gr-tbl gr-progress-table">' + progressTableCols + '<thead><tr><th>' + tr('gr_col_student') + '</th><th>' + tr('gr_col_current_grade') + '</th><th>' + tr('gr_col_missing') + '</th><th>' + tr('gr_col_progress') + '</th><th aria-hidden="true"></th></tr></thead><tbody>' + ipRows + '</tbody></table></div>'
            + '<div class="gr-footer"><span>' + tr('gr_avg_current') + ':</span><span style="font-family:\'DM Mono\',monospace;font-weight:700;color:var(--amber);">' + avgIP + ' pts</span><span>· ' + tr('gr_avg_missing') + '</span><span style="font-family:\'DM Mono\',monospace;font-weight:700;color:var(--red);">' + avgFalta + ' pts</span></div>'
            + '</div>';
        }
    
        // ── No grade table ──
        var noGradeHtml = '';
        if (noGrade.length) {
          var ngRows = noGrade.map(function (g) {
            return '<tr class="gr-clickable-row" data-name="' + esc(g.name).toLowerCase() + '" data-gname="' + esc(g.name) + '" data-group="nograde" onclick="window.MWAGrades.showDetailByEl(this)">'
              + '<td>' + studentCell(g) + '</td>'
              + '<td><span class="gr-no-grade-value">—</span></td>'
              + '<td class="gr-open-cell"><span class="gr-row-arrow">&nearr;</span></td>'
              + '</tr>';
          }).join('');
          noGradeHtml = '<div class="gr-card nograde" id="grCardNoGrade">'
            + '<div class="gr-card-head"><span class="gr-card-title"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-circle"></use></svg>' + tr('gr_no_grade') + ' (' + noGrade.length + ')</span>' + tip('gr_tip_card_no_grade') + '<span class="gr-card-sub">' + tr('gr_none_launched') + '</span></div>'
            + '<div class="gr-table-scroll"><table class="gr-tbl gr-nograde-table">' + noGradeTableCols + '<thead><tr><th>' + tr('gr_col_student') + '</th><th>' + tr('gr_col_grade') + '</th><th aria-hidden="true"></th></tr></thead><tbody>' + ngRows + '</tbody></table></div>'
            + '</div>';
        }

        // Unified performance list. The KPI cards remain the status filters, while
        // one table uses the full width and avoids three sections with uneven height.
        var unifiedStudents = approved.map(function(g) { return {student:g, group:'approved'}; })
          .concat(inProg.map(function(g) { return {student:g, group:'inprogress'}; }))
          .concat(failed.map(function(g) { return {student:g, group:'failed'}; }))
          .concat(noGrade.map(function(g) { return {student:g, group:'nograde'}; }));
        unifiedStudents.sort(function(left, right) {
          var order = {approved:0, inprogress:1, failed:2, nograde:3};
          if (order[left.group] !== order[right.group]) return order[left.group] - order[right.group];
          var leftGrade = left.student.total === null ? -1 : Number(left.student.total || 0);
          var rightGrade = right.student.total === null ? -1 : Number(right.student.total || 0);
          return rightGrade - leftGrade || left.student.name.localeCompare(right.student.name, 'pt-BR');
        });
        GR_SELECTABLE = {};
        var unifiedRows = unifiedStudents.map(function(entry) {
          var g = entry.student;
          var selectionKey = gradeSelectionKey(g);
          GR_SELECTABLE[selectionKey] = g;
          var maximum = maxFor(g);
          var target = targetFor(g);
          var grade = g.total === null ? null : Number(g.total);
          var pct = grade === null ? 0 : Math.max(0, Math.min(100, Math.round(grade / maximum * 100)));
          var missing = grade === null ? target : Math.max(0, target - grade);
          var tone = entry.group === 'approved' ? 'approved' : entry.group === 'inprogress' ? 'inprogress' : entry.group === 'failed' ? 'failed' : 'nograde';
          var label = entry.group === 'approved' ? tr('gr_approved_single') : entry.group === 'inprogress' ? tr('gr_in_progress') : entry.group === 'failed' ? tr('gr_failed_single') : tr('gr_no_grade');
          var color = grade !== null && grade >= target ? 'var(--green)' : entry.group === 'inprogress' ? 'var(--amber)' : 'var(--red)';
          var gradeChip = grade === null
            ? '<span class="gr-unified-grade empty">—</span>'
            : '<span class="gr-unified-grade ' + tone + '"><b>' + grade.toFixed(1) + '</b><small>pts</small></span>';
          var missingChip = missing > 0
            ? '<span class="gr-unified-missing has-missing"><b>' + missing.toFixed(1) + '</b><small>pts</small></span>'
            : '<span class="gr-unified-missing">—</span>';
          return '<tr class="gr-clickable-row" data-name="' + esc(g.name).toLowerCase() + '" data-gname="' + esc(g.name) + '" data-grade="' + (grade === null ? '-1' : grade) + '" data-group="' + entry.group + '" onclick="window.MWAGrades.showDetailByEl(this)">'
            + '<td class="mwa-select-cell"><input type="checkbox" class="mwa-student-select" data-selection-key="' + esc(selectionKey) + '"' + (GR_SELECTED[selectionKey] ? ' checked' : '') + ' onclick="event.stopPropagation()" onchange="event.stopPropagation();window.MWAGrades&&window.MWAGrades.toggleStudentSelection(this)" aria-label="' + esc(tr('select', 'Selecionar') + ' ' + g.name) + '"></td>'
            + '<td>' + studentCell(g) + '</td>'
            + '<td><span class="gr-unified-status ' + tone + '"><i></i>' + esc(label) + '</span></td>'
            + '<td>' + gradeChip + '</td>'
            + '<td>' + missingChip + '</td>'
            + '<td><div class="gr-prog-wrap"><div class="gr-prog-bg"><div class="gr-prog-fill" style="width:' + pct + '%;background:' + color + ';"></div><div class="gr-prog-marker" style="left:' + approval + '%;"></div></div><span class="gr-prog-label" style="color:' + color + ';">' + pct + '%</span></div><div class="gr-prog-sub">' + (grade === null ? '0' : grade.toFixed(1)) + '/' + maximum.toFixed(1) + '</div></td>'
            + '<td class="gr-open-cell"><span class="gr-row-arrow">&nearr;</span></td>'
            + '</tr>';
        }).join('');
        var unifiedHtml = '<div class="gr-card gr-unified-card" id="grCardUnified">'
          + '<div class="gr-card-head"><span class="gr-card-title">' + icon('users') + esc(tr('gr_performance_list')) + '</span><span class="gr-card-sub" id="grUnifiedCount">' + unifiedStudents.length + ' ' + esc(unifiedStudents.length === 1 ? tr('student') : tr('students')) + '</span></div>'
          + '<div class="gr-table-scroll"><table class="gr-tbl gr-unified-table"><colgroup><col style="width:4%"><col style="width:29%"><col style="width:16%"><col style="width:12%"><col style="width:12%"><col style="width:21%"><col style="width:6%"></colgroup>'
          + '<thead><tr><th class="mwa-select-head"><input id="grSelectVisible" type="checkbox" onclick="event.stopPropagation()" onchange="window.MWAGrades&&window.MWAGrades.toggleVisibleSelection(this)" aria-label="' + esc(tr('select_all')) + '"></th><th><button type="button" class="gr-name-sort" id="grNameSort" onclick="window.MWAGrades&&window.MWAGrades.toggleNameSort()" aria-label="' + esc(tr('gr_sort_name_asc')) + '" title="' + esc(tr('gr_sort_name_asc')) + '"><span>' + esc(tr('gr_col_student')) + '</span><i aria-hidden="true">&#8597;</i></button></th><th>' + esc(tr('gr_filter_status_label')) + '</th><th>' + esc(tr('gr_col_grade')) + '</th><th>' + esc(tr('gr_col_missing')) + '</th><th>' + esc(tr('gr_col_progress')) + '</th><th aria-hidden="true"></th></tr></thead>'
          + '<tbody>' + unifiedRows + '</tbody></table></div><div id="grUnifiedPagination" class="gr-unified-pagination"></div></div>';

        Store.renderHtml(el, midHtml + kpisHtml + chartsHtml + filterHtml + unifiedHtml);
        filter(false);
        saveGradeTrendSnapshot(currentMetrics, trendSnapshot);
    
        // ── Charts ──
        setTimeout(function () {
          renderCharts(valid, approved, inProg, failed, noGrade);
        }, 60);
      }
    
      /* ── Charts ── */
      function renderCharts(valid, approved, inProg, failed, noGrade) {
        if (!Chart) return;
        // Distribution uses the exact raw grade displayed in the Grade column.
        var bins  = [[0,20],[20,40],[40,60],[60,80],[80,101]];
        var binCounts = bins.map(function (b) {
          return valid.filter(function (g) {
            var displayedGrade = Number(g.total);
            return !isNaN(displayedGrade) && displayedGrade >= b[0] && displayedGrade < b[1];
          }).length;
        });
    
        var c1 = document.getElementById('grChartDist');
        var c2 = document.getElementById('grChartAR');
        if (window._grChartDist) window._grChartDist.destroy();
        if (window._grChartAR)   window._grChartAR.destroy();
    
        if (c1) {
          var distributionLabels = {
            id: 'mwaGradeDistributionLabels',
            afterDatasetsDraw: function (chart) {
              var ctx = chart.ctx;
              var meta = chart.getDatasetMeta(0);
              ctx.save();
              ctx.font = '700 11px sans-serif';
              ctx.textBaseline = 'middle';
              meta.data.forEach(function (bar, index) {
                var value = binCounts[index] || 0;
                var useInside = value > 0 && bar.x > chart.chartArea.right - 42;
                ctx.textAlign = useInside ? 'right' : 'left';
                ctx.fillStyle = useInside ? '#ffffff' : '#46516a';
                ctx.fillText(String(value), useInside ? bar.x - 7 : bar.x + 7, bar.y);
              });
              ctx.restore();
            }
          };
          window._grChartDist = new Chart(c1, {
            type: 'bar',
            data: {
              labels: ['0–20 pts','20–40 pts','40–60 pts','60–80 pts','80–100 pts'],
              datasets: [{
                data: binCounts,
                backgroundColor: ['#dc6268','#ed8d47','#e3b341','#49ad7e','#249c8e'],
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.68,
                categoryPercentage: 0.82
              }]
            },
            plugins: [distributionLabels],
            options: {
              responsive: true, maintainAspectRatio: false,
              indexAxis: 'y',
              layout: { padding: { right: 24 } },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      var count = Number(context.raw || 0);
                      var percent = valid.length ? Math.round((count / valid.length) * 100) : 0;
                      return count + ' ' + tr(count === 1 ? 'student' : 'students') + ' (' + percent + '%)';
                    }
                  }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  ticks: { precision: 0, color: '#68728a', font: { size: 10 } },
                  grid: { color: 'rgba(70,81,106,.08)' }
                },
                y: {
                  ticks: { color: '#46516a', font: { size: 11, weight: '700' } },
                  grid: { display: false }
                }
              }
            }
          });
        }
    
        if (c2) {
          window._grChartAR = new Chart(c2, {
            type: 'doughnut',
            data: {
              labels: [tr('gr_approved'), tr('gr_in_progress'), tr('gr_failed')],
              datasets: [{ data: [approved.length, inProg.length, failed.length], backgroundColor: ['#3aab7a','#f5a623','#d95f5f'], borderWidth: 0 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              cutout: '62%',
              onClick: function (evt, elements) {
                if (!elements || !elements.length) {
                  return;
                }
                var idx = elements[0].index;
                var groups = ['approved', 'inprogress', 'failed'];
                setFilter(groups[idx] || 'all');
              },
              onHover: function (evt, elements) {
                if (evt && evt.native && evt.native.target) {
                  evt.native.target.style.cursor = elements && elements.length ? 'pointer' : 'default';
                }
              },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: 'var(--muted)',
                    font: { size: 11 },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    boxHeight: 8,
                    padding: 14
                  },
                  onClick: function (evt, item) {
                    var groups = ['approved', 'inprogress', 'failed'];
                    setFilter(groups[item.index] || 'all');
                  }
                }
              }
            }
          });
        }
      }
    
      /* ── Detail modals de notas ── */
      function closeDetail() {
        var detail = document.getElementById('grDetailModal');
        if (!detail) return;
        var studentModal = detail.closest('.cl-detail-modal');
        if (detail._escapeHandler) document.removeEventListener('keydown', detail._escapeHandler);
        detail.remove();
        if (studentModal) studentModal.classList.remove('is-grades-open');
      }

      function showDetail(name, evt) {
        if (evt) evt.stopPropagation();
        var g = null;
        for (var i = 0; i < GRADES_CACHE.length; i++) {
          if (GRADES_CACHE[i].name === name) { g = GRADES_CACHE[i]; break; }
        }
        if (!g) return;
    
        // Simple keys (numbers) sorted, names from ACT_NAMES
        var nowSeconds = Math.floor(Date.now() / 1000);
        var keys = Object.keys(ACT_NAMES).length
          ? Object.keys(ACT_NAMES).sort(function (a, b) { return Number(a) - Number(b); })
          : Object.keys(g.actGrades || {}).sort(function (a, b) { return Number(a) - Number(b); });
        function isUnavailable(key, hasGrade, hasSubmission) {
          if (hasGrade || hasSubmission) return false;
          var n = Number(key);
          if (ACT_HIDDEN[n] === true) return true;
          if (ACT_AVAILABLE_FROM[n] > 0 && ACT_AVAILABLE_FROM[n] > nowSeconds) return true;
          return ACT_AVAILABLE[n] === false &&
            !(ACT_AVAILABLE_UNTIL[n] > 0 && ACT_AVAILABLE_UNTIL[n] < nowSeconds);
        }
    
        var acts    = g.actGrades || {};
        var graded  = keys.filter(function(k) { return hasEffectiveActivityGrade(g, k, nowSeconds); }).length;
        var tot     = g.total !== null ? g.total.toFixed(1) : '—';
        var approval = approvalGrade();
        var approved = GRADES_COURSE_COMPLETE && g.total !== null && g.total >= (100 * approval / 100);
        var failed = GRADES_COURSE_COMPLETE && hasAllMonitoredGrades(g) &&
          g.total !== null && g.total < (100 * approval / 100);
        var maximum = g.totalmax && g.totalmax > 0 ? g.totalmax : 100;
        var target = maximum * approval / 100;
        var partialTargetReached = g.total !== null && g.total >= target;
        var tc      = g.total === null ? 'var(--muted)' : partialTargetReached ? 'var(--green)' : 'var(--amber)';
        var missingPoints = g.total === null ? target : Math.max(0, target - g.total);
        var pendingKeys = keys.filter(function(k) {
          var hasGrade = hasEffectiveActivityGrade(g, k, nowSeconds);
          var current = Object.prototype.hasOwnProperty.call(g.actCurrent || {}, String(k))
            ? Number(g.actCurrent[String(k)] || 0) : null;
          var hasSubmission = current > 0;
          var unavailable = isUnavailable(k, hasGrade, hasSubmission);
          var overdue = !unavailable && !hasGrade && !hasSubmission &&
            ACT_AVAILABLE_UNTIL[Number(k)] > 0 && nowSeconds > ACT_AVAILABLE_UNTIL[Number(k)];
          return !hasGrade && !overdue && !unavailable;
        });
        var pendingCount = pendingKeys.length;
        var unavailableCount = keys.filter(function(k) {
          var hasGrade = hasEffectiveActivityGrade(g, k, nowSeconds);
          var current = Object.prototype.hasOwnProperty.call(g.actCurrent || {}, String(k))
            ? Number(g.actCurrent[String(k)] || 0) : null;
          return isUnavailable(k, hasGrade, current > 0);
        }).length;
        var remainingForProjection = pendingCount + unavailableCount;
        var estimatedNeeded = remainingForProjection ? missingPoints / remainingForProjection : 0;
        var overdueNames = [];
        var pendingNames = [];
        var config = Store.getConfig ? Store.getConfig() : {};
        var wwwroot = norm(config.wwwroot).replace(/\/$/, '');
        var courseid = Number(config.courseid || 0);

        function activityUrl(key) {
          var cmid = Number(ACT_CMIDS[Number(key)] || 0);
          var module = norm(ACT_MODULES[Number(key)]).toLowerCase();
          if (!cmid || !wwwroot) return '';
          if (module) return wwwroot + '/mod/' + encodeURIComponent(module) + '/view.php?id=' + encodeURIComponent(String(cmid));
          return courseid ? wwwroot + '/course/view.php?id=' + encodeURIComponent(String(courseid)) + '#module-' + encodeURIComponent(String(cmid)) : '';
        }
    
        var rows = keys.map(function (k) {
          // k = sequential key; name comes from ACT_NAMES
          var label = k;
          var fullName = (ACT_NAMES[k] || k).replace(/\(Grade\)|\(Real\)|\(Valor\)/gi, '').trim();
          var displayName = fullName.length > 55 ? fullName.slice(0, 52) + '...' : fullName;
          var url = activityUrl(k);
          var val   = acts[k];
          var hasV  = val !== null && val !== undefined && !isNaN(val);
          var activityMax = Number(ACT_MAXES[Number(k)] || 0);
          var activityPercent = hasV && activityMax > 0 ? Number(val) / activityMax * 100 : null;
          var lowGrade = activityPercent !== null && activityPercent < approval;
          var current = Object.prototype.hasOwnProperty.call(g.actCurrent || {}, String(k)) ? Number(g.actCurrent[String(k)] || 0) : null;
          var hasSubmission = current > 0;
          var zeroWithoutSubmission = hasV && Number(val) === 0 && !hasSubmission;
          var submissionTime = Number((g.actSubmissionTimes || {})[String(k)] || 0);
          var gradeTime = Number((g.actGradeTimes || {})[String(k)] || 0);
          var resubmittedAfterGrade = hasV && hasSubmission && submissionTime > 0 && gradeTime > 0 && submissionTime > gradeTime;
          var completedAndGraded = hasV && !zeroWithoutSubmission && !resubmittedAfterGrade;
          var submitted = (!hasV || resubmittedAfterGrade) && hasSubmission;
          var unavailable = isUnavailable(k, completedAndGraded, hasSubmission);
          var overdue = !unavailable && !completedAndGraded && !hasSubmission &&
            ACT_AVAILABLE_UNTIL[Number(k)] > 0 && nowSeconds > ACT_AVAILABLE_UNTIL[Number(k)];
          if (overdue) overdueNames.push({name: fullName, display: displayName, url: url});
          if (!unavailable && !completedAndGraded && !hasSubmission) {
            pendingNames.push({name: fullName, display: displayName, url: url});
          }
          var stateClass = completedAndGraded ? ' has-grade' : submitted ? ' awaiting-grade' : unavailable ? ' unavailable' : overdue ? ' overdue' : ' pending';
          var stateColor = completedAndGraded ? 'var(--green)' : submitted ? 'var(--amber)' : unavailable ? '#667085' : overdue ? 'var(--red)' : 'var(--blue)';
          var valueColor = stateColor;
          var stateLabel = completedAndGraded ? tr('gr_state_released') : submitted ? tr('gr_state_awaiting_grade') :
            unavailable ? tr('gr_state_unavailable') : overdue ? tr('gr_state_overdue') : tr('gr_state_not_submitted');
          if (unavailable && ACT_AVAILABLE_FROM[Number(k)] > nowSeconds) {
            stateLabel += ' · ' + tr('cl_activity_opens_on')
              .replace('{date}', new Date(ACT_AVAILABLE_FROM[Number(k)] * 1000).toLocaleDateString());
          }
          if (zeroWithoutSubmission) stateLabel += ' - ' + tr('gr_state_zero_without_submission');
          var rowTag = url ? 'a' : 'div';
          var rowAttrs = url ? ' href="' + esc(url) + '" target="_blank" rel="noopener"' : '';
          return '<' + rowTag + ' class="gr-act-row' + (url ? ' gr-act-link' : '') + (lowGrade ? ' low-grade' : '') + '"' + rowAttrs + ' title="' + esc(fullName) + '">'
            + '<span class="gr-act-main"><span class="gr-act-num' + stateClass + '">' + esc(label) + '</span>'
            + '<span class="gr-act-name">' + esc(displayName) + '</span></span>'
            + '<span class="gr-act-launched"><span class="gr-act-state" style="color:' + stateColor + ';">' + esc(stateLabel) + '</span>'
            + '<span class="gr-act-val" style="color:' + valueColor + ';">' + (hasV ? Number(val).toFixed(1) + ' pts' : '—') + '</span></span>'
            + '<span class="gr-act-max">' + (activityMax > 0 ? activityMax.toFixed(1) + ' pts' : '—') + '</span>'
            + '</' + rowTag + '>';
        }).join('');

        // Points of attention lists only activities that have not been
        // submitted. A valid submission awaiting grading is not a pending
        // action for the student and must not appear here.
        var attentionItems = pendingNames.slice(0, 5);
        var attentionHtml = attentionItems.length
          ? '<ul>' + attentionItems.map(function(item) {
              var content = item.url
                ? '<a href="' + esc(item.url) + '" target="_blank" rel="noopener" title="' + esc(item.name) + '">' + esc(item.display) + '</a>'
                : '<span title="' + esc(item.name) + '">' + esc(item.display) + '</span>';
              return '<li>' + content + '</li>';
            }).join('') + '</ul>'
          : '<p>' + esc(tr('gr_no_pending')) + '</p>';
        closeDetail();
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    
        var overlay = document.createElement('div');
        overlay.className = 'gr-modal-overlay';
        overlay.id = 'grDetailModal';
    
        Store.renderHtml(overlay, '<div class="gr-modal gr-detail-panel-modal">'
            + '<div class="gr-modal-head">'
              + '<div class="gr-modal-student">'
                + '<span class="gr-student-avatar' + (g.pictureurl ? ' has-image' : '') + '">' + (g.pictureurl ? '<img src="' + esc(g.pictureurl) + '" alt="">' : esc(String(name).split(/\s+/).slice(0,2).map(function(part){return part.charAt(0);}).join('').toUpperCase())) + '</span>'
                + '<div style="min-width:0;">'
                + '<div class="gr-modal-name">' + esc(name) + '</div>'
                + '<div class="gr-modal-sub">' + esc(approved ? tr('gr_approved_single') : failed ? tr('gr_failed_single') : g.total === null ? tr('gr_no_grade') : tr('gr_in_progress')) + '</div>'
                + '</div>'
              + '</div>'
              + '<div class="gr-modal-head-actions">'
                + '<button class="gr-modal-close" onclick="window.MWAGrades.closeDetail()" aria-label="' + esc(tr('close')) + '">' + icon('close') + '</button>'
              + '</div>'
            + '</div>'
            + '<div class="gr-modal-body">'
              + '<div class="gr-detail-kpis">'
                + '<div><span>' + esc(tr('gr_col_current_grade', 'Nota atual')) + '</span><strong style="color:' + tc + ';">' + tot + '</strong><small>' + esc(tr('gr_points')) + '</small></div>'
                + '<div><span>' + esc(tr('gr_target')) + '</span><strong>' + target.toFixed(1) + '</strong><small>' + approval + '% ' + esc(tr('gr_of_maximum')) + ' ' + maximum.toFixed(1) + '</small></div>'
                + '<div><span>' + esc(tr('gr_col_missing', 'Pontos faltantes')) + '</span><strong style="color:' + (missingPoints ? 'var(--red)' : 'var(--green)') + ';">' + missingPoints.toFixed(1) + '</strong><small>' + esc(missingPoints ? (failed ? tr('gr_failed_single') : tr('gr_in_progress')) : tr('gr_approved_single')) + '</small></div>'
                + '<div><span>' + esc(tr('gr_grades_launched')) + '</span><strong>' + graded + '/' + keys.length + '</strong><small>' + pendingCount + ' ' + esc(tr('gr_pending_count')) + (unavailableCount ? ' · ' + esc((unavailableCount === 1 ? tr('gr_unavailable_one') : tr('gr_unavailable_many').replace('{count}', unavailableCount))) : '') + '</small></div>'
                + '<div class="gr-detail-progress-kpi"><span>' + esc(tr('gr_col_progress', 'Progresso')) + '</span><strong>' + Math.max(0, Math.min(100, Math.round((Number(g.total || 0) / maximum) * 100))) + '%</strong><small>' + tot + '/' + maximum.toFixed(1) + '</small><div class="gr-detail-progress-mini"><b style="width:' + Math.max(0, Math.min(100, Math.round((Number(g.total || 0) / maximum) * 100))) + '%;background:' + tc + ';"></b><i style="left:' + approval + '%"></i></div></div>'
              + '</div>'
              + '<div class="gr-detail-analysis-grid">'
                + '<section class="gr-detail-insight"><h4>' + esc(tr('gr_attention_points')) + '</h4>' + attentionHtml + '</section>'
                + '<section class="gr-detail-simulation"><h4>' + esc(tr('gr_projection')) + '</h4>'
                  + (approved ? '<strong style="color:var(--green)">' + esc(tr('gr_approved_single')) + '</strong><p>' + esc(tr('gr_no_missing_points')) + '</p>'
                    : failed ? '<strong style="color:var(--red)">' + esc(tr('gr_failed_single')) + '</strong><p>' + esc(tr('gr_no_remaining_items')) + '</p>'
                    : remainingForProjection ? '<strong>' + estimatedNeeded.toFixed(1) + ' ' + esc(tr('gr_points')) + '</strong><p>' + esc(tr('gr_in_progress')) + ' · ' + esc(tr('gr_estimated_each_remaining')) + '</p>'
                    : '<strong style="color:var(--amber)">' + esc(tr('gr_in_progress')) + '</strong><p>' + esc(tr('gr_no_remaining_items')) + '</p>')
                + '</section>'
              + '</div>'
              + '<div class="gr-detail-section-title"><div class="gr-detail-section-label">' + esc(tr('gr_col_activities', 'Atividades com nota')) + tip('grade_state_rules_tip', 'mwa-grade-rules-tip') + '</div><span>' + graded + '/' + keys.length + ' ' + esc(tr('gr_launched')) + '</span></div>'
              + '<div class="gr-color-legend">'
              + '<span class="green"><i></i>' + esc(tr('gr_legend_released', 'Nota lançada')) + '</span>'
              + '<span class="yellow"><i></i>' + esc(tr('gr_legend_awaiting_grade', 'Entregue, aguardando nota')) + '</span>'
              + '<span class="blue"><i></i>' + esc(tr('gr_legend_not_submitted', 'Atividade não entregue')) + '</span>'
              + '<span class="red"><i></i>' + esc(tr('gr_legend_overdue', 'Atividade atrasada')) + '</span>'
              + '<span class="grey"><i></i>' + esc(tr('gr_legend_unavailable', 'Ainda não disponível')) + '</span>'
              + '</div><div class="gr-detail-activities">' + (rows ? '<div class="gr-act-columns"><span>' + esc(tr('gr_col_activity')) + '</span><span>' + esc(tr('gr_col_launched_grade')) + '</span><span>' + esc(tr('gr_col_max_grade')) + '</span></div>' + rows : '<p style="color:var(--muted);text-align:center;">' + esc(tr('no_data')) + '</p>') + '</div>'
              + '<div class="gr-detail-actions">'
                + '<button type="button" class="btn-ghost mwa-card-action is-primary gr-detail-profile" data-gname="' + esc(name) + '">' + icon('user') + ' ' + esc(tr('cl_view_individual_profile')) + '</button>'
                + '<button type="button" class="btn-ghost mwa-card-action is-primary gr-detail-message" data-name="' + esc(name) + '" data-email="' + esc(g.email || '') + '">' + icon('mail') + ' ' + esc(tr('message')) + '</button>'
                + '<button type="button" class="btn-ghost gr-detail-close">' + esc(tr('close', 'Fechar')) + '</button>'
              + '</div>'
            + '</div>'
          + '</div>');
    
        var studentModal = document.querySelector('#clStudentDetailOverlay .cl-detail-modal');
        if (studentModal) {
          studentModal.classList.add('is-grades-open');
          overlay.classList.add('gr-modal-overlay-nested');
          studentModal.appendChild(overlay);
        } else {
          (document.getElementById('block-mwa-dashboard-app') || document.body).appendChild(overlay);
        }
        var messageButton = overlay.querySelector('.gr-detail-message');
        if (messageButton) messageButton.addEventListener('click', function() {
          if (window.MWAInterventions) window.MWAInterventions.quickMessage(messageButton.dataset.name, messageButton.dataset.email || '', 0, '');
        });
        var profileButton = overlay.querySelector('.gr-detail-profile');
        if (profileButton) profileButton.addEventListener('click', function() {
          closeDetail();
          openProfile(profileButton);
        });
        var closeButton = overlay.querySelector('.gr-detail-close');
        if (closeButton) closeButton.addEventListener('click', closeDetail);
      }
    
      /* ── Filtro de busca/grupo ── */
      function filter(resetPage) {
        if (resetPage) GR_PAGE = 1;
        var search = (document.getElementById('grSearch') || {}).value || '';
        var group  = (document.getElementById('grFilter') || {}).value || 'all';
        var q      = search.toLowerCase().trim();
    
        var matchingRows = [];
        document.querySelectorAll('#grCardUnified .gr-tbl tbody tr').forEach(function (row) {
          var name = (row.dataset.name || '').toLowerCase();
          var matchesGroup = group === 'all' || row.dataset.group === group;
          if (matchesGroup && (!q || name.includes(q))) matchingRows.push(row);
        });
        var totalPages = Math.max(1, Math.ceil(matchingRows.length / GR_PAGE_SIZE));
        GR_PAGE = Math.min(Math.max(1, GR_PAGE), totalPages);
        var startIndex = (GR_PAGE - 1) * GR_PAGE_SIZE;
        var endIndex = Math.min(startIndex + GR_PAGE_SIZE, matchingRows.length);
        document.querySelectorAll('#grCardUnified .gr-tbl tbody tr').forEach(function(row) { row.style.display = 'none'; });
        matchingRows.slice(startIndex, endIndex).forEach(function(row) { row.style.display = ''; });
        var visible = matchingRows.length;
        var count = document.getElementById('grUnifiedCount');
        if (count) count.textContent = visible + ' ' + tr(visible === 1 ? 'student' : 'students');
        renderUnifiedPagination(visible, startIndex, endIndex, totalPages);
        updateGradeBulkAction();
      }

      function renderUnifiedPagination(total, startIndex, endIndex, totalPages) {
        var box = document.getElementById('grUnifiedPagination');
        if (!box) return;
        var pages = '';
        pages += '<button type="button" class="gr-page-btn"' + (GR_PAGE <= 1 ? ' disabled' : '') + ' onclick="window.MWAGrades.goPage(' + (GR_PAGE - 1) + ')">&#8249;</button>';
        for (var page = 1; page <= totalPages; page++) {
          pages += '<button type="button" class="gr-page-btn' + (page === GR_PAGE ? ' active' : '') + '" onclick="window.MWAGrades.goPage(' + page + ')">' + page + '</button>';
        }
        pages += '<button type="button" class="gr-page-btn"' + (GR_PAGE >= totalPages ? ' disabled' : '') + ' onclick="window.MWAGrades.goPage(' + (GR_PAGE + 1) + ')">&#8250;</button>';
        var sizes = [5,10,20,50].map(function(size) { return '<option value="' + size + '"' + (size === GR_PAGE_SIZE ? ' selected' : '') + '>' + size + '</option>'; }).join('');
        var first = total ? startIndex + 1 : 0;
        Store.renderHtml(box, '<span class="gr-page-info">' + esc(tr('gr_showing_range').replace('{start}', first).replace('{end}', endIndex).replace('{total}', total)) + '</span>'
          + '<div class="gr-page-buttons">' + pages + '</div>'
          + '<label class="gr-page-size">' + esc(tr('gr_items_per_page')) + '<select onchange="window.MWAGrades.setPageSize(this.value)">' + sizes + '</select></label>');
      }

      function goPage(page) { GR_PAGE = Math.max(1, Number(page) || 1); filter(false); }
      function setPageSize(size) { GR_PAGE_SIZE = [5,10,20,50].indexOf(Number(size)) >= 0 ? Number(size) : 10; GR_PAGE = 1; filter(false); }

      function toggleNameSort() {
        GR_NAME_SORT = GR_NAME_SORT === 'asc' ? 'desc' : 'asc';
        var tbody = document.querySelector('#grCardUnified .gr-tbl tbody');
        if (!tbody) return;
        Array.from(tbody.querySelectorAll('tr')).sort(function(left, right) {
          var result = String(left.dataset.name || '').localeCompare(String(right.dataset.name || ''), 'pt-BR', {sensitivity: 'base'});
          return GR_NAME_SORT === 'desc' ? -result : result;
        }).forEach(function(row) { tbody.appendChild(row); });
        var button = document.getElementById('grNameSort');
        if (button) {
          var nextLabel = GR_NAME_SORT === 'asc' ? tr('gr_sort_name_desc') : tr('gr_sort_name_asc');
          button.setAttribute('aria-label', nextLabel);
          button.setAttribute('title', nextLabel);
          var indicator = button.querySelector('i');
          if (indicator) indicator.textContent = GR_NAME_SORT === 'asc' ? '\u25B2' : '\u25BC';
        }
        filter(true);
      }

      function resetGradeSort() {
        GR_NAME_SORT = '';
        var tbody = document.querySelector('#grCardUnified .gr-tbl tbody');
        if (tbody) {
          Array.from(tbody.querySelectorAll('tr')).sort(function(left, right) {
            var gradeResult = Number(right.dataset.grade || -1) - Number(left.dataset.grade || -1);
            return gradeResult || String(left.dataset.name || '').localeCompare(String(right.dataset.name || ''), 'pt-BR', {sensitivity: 'base'});
          }).forEach(function(row) { tbody.appendChild(row); });
        }
        var button = document.getElementById('grNameSort');
        if (button) {
          button.setAttribute('aria-label', tr('gr_sort_name_asc'));
          button.setAttribute('title', tr('gr_sort_name_asc'));
          var indicator = button.querySelector('i');
          if (indicator) indicator.textContent = '\u2195';
        }
      }
    
      /* ── Build data for export ── */

      function setFilter(group) {
        var value = group || 'all';
        var input = document.getElementById('grFilter');
        if (input) input.value = value;
        document.querySelectorAll('#grFilterTabs .gr-tab').forEach(function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-gr-filter') === value);
        });
        GR_PAGE = 1;
        filter(false);
      }

      function clearFilters() {
        var group = document.getElementById('grFilter');
        var search = document.getElementById('grSearch');
        if (group) group.value = 'all';
        if (search) search.value = '';
        GR_SELECTED = {};
        document.querySelectorAll('#grCardUnified .mwa-student-select').forEach(function(box) {
          box.checked = false;
        });
        resetGradeSort();
        filter(true);
      }
    
      function buildExportData() {
        var allKeys = Array.from(new Set(
          GRADES_CACHE.reduce(function (a, g) { return a.concat(Object.keys(g.actGrades || {})); }, [])
        )).sort(function (a, b) { return (parseInt(a) || 0) - (parseInt(b) || 0); });

        var header = [tr('gr_col_student'), tr('gr_col_grade'), 'Status'];
        var actLabels = allKeys.map(function (k) {
          var nm = (ACT_NAMES[k] || (tr('gr_act_prefix','Ativ. ') + k)).replace(/\(Grade\)|\(Real\)|\(Valor\)/gi, '').trim();
          return nm.length > 40 ? nm.slice(0, 37) + '...' : nm;
        });
        header = header.concat(actLabels);

        var cacheByName = {};
        GRADES_CACHE.forEach(function(g) { cacheByName[norm(g.name).toLowerCase()] = g; });
        var search = norm((document.getElementById('grSearch') || {}).value).toLowerCase();
        var group = (document.getElementById('grFilter') || {}).value || 'all';
        var orderedEntries = Array.from(document.querySelectorAll('#grCardUnified .gr-tbl tbody tr')).filter(function(row) {
          var matchesGroup = group === 'all' || row.dataset.group === group;
          return matchesGroup && (!search || String(row.dataset.name || '').toLowerCase().indexOf(search) >= 0);
        }).map(function(row) {
          return {grade: cacheByName[norm(row.dataset.gname).toLowerCase()], group: row.dataset.group || ''};
        }).filter(function(entry) { return !!entry.grade; });
        if (!orderedEntries.length && !document.querySelector('#grCardUnified .gr-tbl tbody')) {
          orderedEntries = GRADES_CACHE.map(function(g) { return {grade: g, group: ''}; });
        }

        var rows = orderedEntries.map(function (entry) {
          var g = entry.grade;
          var status = entry.group === 'approved' ? tr('gr_approved_single') :
            entry.group === 'failed' ? tr('gr_failed_single') :
              entry.group === 'inprogress' ? tr('gr_in_progress') :
                entry.group === 'nograde' ? tr('gr_no_grade') :
                  g.total === null ? tr('gr_no_grade') : GRADES_COURSE_COMPLETE && g.total >= approvalGrade()
                    ? tr('gr_approved_single') : GRADES_COURSE_COMPLETE && hasAllMonitoredGrades(g)
                      ? tr('gr_failed_single') : tr('gr_in_progress');
          var row = [g.name, g.total !== null ? g.total : '', status];
          allKeys.forEach(function (k) {
            var v = (g.actGrades || {})[k];
            row.push((v !== null && v !== undefined && !isNaN(v)) ? Number(v) : '');
          });
          return row;
        });

        return { header: header, rows: rows, allKeys: allKeys };
      }

      /* ── Gerador XLSX nativo (sem biblioteca externa) ── */
      function exportXLSX() {
        if (!GRADES_CACHE.length) { Store.notify(tr('gr_no_grades_loaded'), 'warning'); return; }

        var btn = document.querySelector('#page-grades .gr-export-btn');
        if (btn) { btn.disabled = true; Store.renderHtml(btn, icon('clock') + ' Exportando...'); }

        var data   = buildExportData();
        var header = data.header;
        var rows   = data.rows;
        var allRows = [header].concat(rows);
        var fname  = tr('gr_export_filename','notas_') + new Date().toISOString().slice(0, 10) + '.xlsx';

        /* ── XML helpers ── */
        function xmlEsc(s) {
          return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        }
        function colName(n) { // 0-based → A, B, ... Z, AA, ...
          var s = ''; n++;
          while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
          return s;
        }
        function cellRef(r, c) { return colName(c) + (r + 1); }

        /* ── Shared strings ── */
        var sharedStr = [], sharedMap = {};
        function si(s) {
          var k = String(s == null ? '' : s);
          if (sharedMap[k] === undefined) { sharedMap[k] = sharedStr.length; sharedStr.push(k); }
          return sharedMap[k];
        }

        /* ── Spreadsheet content ── */
        var sheetRows = '';
        allRows.forEach(function (row, r) {
          var cells = '';
          row.forEach(function (val, c) {
            var ref = cellRef(r, c);
            if (typeof val === 'number' && !isNaN(val)) {
              cells += '<c r="' + ref + '" t="n"><v>' + val + '</v></c>';
            } else {
              var idx = si(val);
              cells += '<c r="' + ref + '" t="s"><v>' + idx + '</v></c>';
            }
          });
          sheetRows += '<row r="' + (r + 1) + '">' + cells + '</row>';
        });

        // Larguras de coluna
        var colDefs = '<col min="1" max="1" width="34" customWidth="1"/>'
          + '<col min="2" max="2" width="12" customWidth="1"/>'
          + '<col min="3" max="3" width="16" customWidth="1"/>';
        for (var ci = 0; ci < allRows[0].length - 3; ci++) {
          colDefs += '<col min="' + (ci+4) + '" max="' + (ci+4) + '" width="22" customWidth="1"/>';
        }

        var lastCol = colName(header.length - 1);
        var lastRow = allRows.length;
        var dim     = 'A1:' + lastCol + lastRow;

        var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
          + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
          + '<dimension ref="' + dim + '"/>'
          + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
          + '<cols>' + colDefs + '</cols>'
          + '<sheetData>' + sheetRows + '</sheetData>'
          + '<autoFilter ref="' + dim + '"/>'
          + '</worksheet>';

        var ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
          + ' count="' + sharedStr.length + '" uniqueCount="' + sharedStr.length + '">'
          + sharedStr.map(function (s) { return '<si><t xml:space="preserve">' + xmlEsc(s) + '</t></si>'; }).join('')
          + '</sst>';

        var wbXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
          + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
          + '<sheets><sheet name="Notas" sheetId="1" r:id="rId1"/></sheets>'
          + '</workbook>';

        var wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
          + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
          + '</Relationships>';

        var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
          + '</Relationships>';

        var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          + '<Default Extension="xml" ContentType="application/xml"/>'
          + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
          + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
          + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
          + '</Types>';

        /* ── Build ZIP in memory (stored format — method 0) ── */
        function strToBytes(s) {
          var enc = new TextEncoder();
          return enc.encode(s);
        }
        function u32le(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
        function u16le(n) { return [n & 0xff, (n >> 8) & 0xff]; }

        function crc32(bytes) {
          var table = [];
          for (var i = 0; i < 256; i++) {
            var c = i;
            for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c;
          }
          var crc = 0xFFFFFFFF;
          for (var k = 0; k < bytes.length; k++) crc = table[(crc ^ bytes[k]) & 0xff] ^ (crc >>> 8);
          return (crc ^ 0xFFFFFFFF) >>> 0;
        }

        var files = [
          { name: '[Content_Types].xml',           data: contentTypes },
          { name: '_rels/.rels',                   data: rootRels },
          { name: 'xl/workbook.xml',               data: wbXml },
          { name: 'xl/_rels/workbook.xml.rels',    data: wbRels },
          { name: 'xl/worksheets/sheet1.xml',      data: sheetXml },
          { name: 'xl/sharedStrings.xml',          data: ssXml }
        ];

        var localHeaders = [], centralDir = [], offset = 0;
        var allBytes = [];

        files.forEach(function (f) {
          var nameBytes  = new TextEncoder().encode(f.name);
          var dataBytes  = strToBytes(f.data);
          var crc        = crc32(dataBytes);
          var size       = dataBytes.length;
          var modDate    = 0x5421; // placeholder date
          var modTime    = 0x0000;

          // Local file header
          var lh = [0x50,0x4B,0x03,0x04, // signature
            0x14,0x00,           // version needed
            0x00,0x00,           // flags
            0x00,0x00,           // compression (stored)
          ].concat(u16le(modTime), u16le(modDate),
            u32le(crc), u32le(size), u32le(size),
            u16le(nameBytes.length), u16le(0));

          var entry = lh.concat(Array.from(nameBytes), Array.from(dataBytes));
          localHeaders.push(entry);

          // Central directory record
          var cd = [0x50,0x4B,0x01,0x02,
            0x14,0x00, 0x14,0x00,
            0x00,0x00, 0x00,0x00,
          ].concat(u16le(modTime), u16le(modDate),
            u32le(crc), u32le(size), u32le(size),
            u16le(nameBytes.length), u16le(0), u16le(0),
            u16le(0), u16le(0),
            u32le(0), u32le(offset))
            .concat(Array.from(nameBytes));

          centralDir.push(cd);
          offset += entry.length;
        });

        var cdOffset = offset;
        var cdBytes  = centralDir.reduce(function (a, b) { return a.concat(b); }, []);
        var eocd = [0x50,0x4B,0x05,0x06,
          0x00,0x00, 0x00,0x00,
        ].concat(u16le(files.length), u16le(files.length),
          u32le(cdBytes.length), u32le(cdOffset),
          u16le(0));

        var all = localHeaders.reduce(function (a, b) { return a.concat(b); }, [])
          .concat(cdBytes).concat(eocd);

        var blob = new Blob([new Uint8Array(all)],
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href  = url; a.download = fname;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);

        if (btn) { btn.disabled = false; Store.renderHtml(btn, icon('file') + '<span>' + tr('gr_export') + '</span>'); }
        Store.notify(tr('gr_export') + ': ' + fname, 'success');
      }

      /* ── showDetailByEl: chamado pelo data-* onclick ── */
      function showDetailByEl(el) {
        var name = el && el.dataset && el.dataset.gname;
        if (name) showDetail(name, null);
      }
    
      /* ── openProfile: navigate to profile tab with pre-selected student ── */
      function openProfile(el) {
        var name = el && el.dataset && el.dataset.gname;
        if (!name) return;
        if (window.goToStudentProfile) {
          window.goToStudentProfile(name);
        } else if (window.showPage) {
          window.showPage('studentprofile');
          setTimeout(function () {
            var sel = document.getElementById('spStudentSel');
            if (!sel) return;
            var opt = Array.from(sel.options).find(function (o) { return o.value === name || o.text === name; });
            if (opt) { sel.value = opt.value; window.MWAProfile && window.MWAProfile.loadProfile(name); }
          }, 200);
        }
      }

      function saveApprovalGrade() {
        var input = document.getElementById('grApprovalGrade');
        var value = input ? Math.round(Number(input.value)) : 0;
        if (value < 1 || value > 100) {
          Store.notify(tr('gr_approval_invalid'), 'error');
          if (input) input.focus();
          return;
        }
        var cfg = Store.getConfig ? (Store.getConfig() || {}) : {};
        Store.callAction('block_mwa_dashboard_set_approval_grade', {courseid: Number(cfg.courseid || 0), approvalgrade: value})
          .then(function(result) {
            cfg.approvalgrade = Number(result && result.approvalgrade || value);
            Store.notify(tr('gr_approval_saved'), 'success');
            setTimeout(function() { window.location.reload(); }, 450);
          })
          .catch(function() { Store.notify(tr('gr_approval_save_error'), 'error'); });
      }
    
      /* Public API */
      window.MWAGrades = {
        render:          renderGrades,
        filter:          filter,
        setFilter:       setFilter,
        clearFilters:    clearFilters,
        goPage:          goPage,
        setPageSize:     setPageSize,
        toggleNameSort:  toggleNameSort,
        toggleStudentSelection: toggleGradeSelection,
        toggleVisibleSelection: toggleVisibleGradeSelection,
        messageSelected: messageSelectedGrades,
        showDetail:      showDetail,
        closeDetail:     closeDetail,
        showDetailByEl:  showDetailByEl,
        openProfile:     openProfile,
        saveApprovalGrade: saveApprovalGrade,
        exportXLSX:      exportXLSX
      };
    
    })();

    return window.MWAGrades;
});
