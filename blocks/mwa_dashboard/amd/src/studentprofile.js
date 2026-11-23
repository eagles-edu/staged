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
 * @module     block_mwa_dashboard/studentprofile
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['block_mwa_dashboard/dashboardstore', 'block_mwa_dashboard/engagementcalc',
    'block_mwa_dashboard/actioncenter', 'core/templates', 'core/chartjs'],
function(Store, EngagementCalc, ActionCenter, Templates, Chart) {

    'use strict';

    var window = Store.windowFacade();

    (function () {
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
      function icon(name) {
        return '<svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-' + esc(name) + '"></use></svg>';
      }
      function norm(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
      function renderTemplate(node, template, context) {
        if (!node) return Promise.resolve(null);
        return Templates.render('block_mwa_dashboard/' + template, context || {}).then(function(html, js) {
          Templates.replaceNodeContents(node, html, js);
          return node;
        });
      }
    
      var NOTES    = window.MWA_TUTOR_NOTES    || (window.MWA_TUTOR_NOTES    = {});
      var CONTACTS = window.MWA_CONTACT_HIST   || (window.MWA_CONTACT_HIST   = {});
      var PENDING_PROFILE_STUDENT = '';
      var SP_SEARCH = '';
      var SP_ACHIEVEMENTS = {};
    
      var AV_COLORS = ['#5b9bd5','#8b72d4','#3aab7a','#c98a2a','#d95f5f','#2aafaa','#e07ba0'];
    
      function parseDate(log) {
        if (log._ts) return new Date(Number(log._ts) * 1000);
        var s = norm(log.hora);
        var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2}),\s*(\d{1,2}):(\d{2})/);
        if (m) return new Date(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
        return null;
      }

      function calculateWeeklyAchievements(students, logs) {
        var byStudent = {};
        var weeks = {};
        (students || []).forEach(function(student) {
          var name = norm(student.name || student.fullname);
          if (name) byStudent[name.toLowerCase()] = {name: name, gold: 0, silver: 0, bronze: 0, total: 0, history: []};
        });
        (logs || []).forEach(function(row) {
          var name = norm(row.nomecompleto || row.student_name || row.userfullname || row.fullname || row.name);
          if (name && !byStudent[name.toLowerCase()]) {
            byStudent[name.toLowerCase()] = {name: name, gold: 0, silver: 0, bronze: 0, total: 0, history: []};
          }
          var student = byStudent[name.toLowerCase()];
          var date = parseDate(row);
          if (!student || !date) return;
          var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
          var key = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
          weeks[key] = weeks[key] || {start: start, students: {}};
          var stat = weeks[key].students[student.name] || {events: 0, academic: 0, days: {}};
          stat.events++;
          stat.days[date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()] = true;
          var component = norm(row.componente || row.component || row._modtype).toLowerCase();
          if (component && component !== 'core' && component !== 'system') stat.academic++;
          weeks[key].students[student.name] = stat;
        });
        var previous = {};
        Object.keys(weeks).sort().forEach(function(key) {
          var week = weeks[key];
          var ranked = Object.keys(week.students).map(function(name) {
            var stat = week.students[name];
            var activeDays = Object.keys(stat.days).length;
            var score = stat.events + stat.academic * 2 + activeDays * 3;
            return {name: name, score: score, improvement: score - Number(previous[name] || 0), activeDays: activeDays, events: stat.events};
          });
          var used = {};
          function award(type, candidate) {
            var student = candidate && byStudent[norm(candidate.name).toLowerCase()];
            if (!student) return;
            student[type]++;
            student.total++;
            student.history.push({type: type, week: week.start.toLocaleDateString('pt-BR')});
          }
          ranked.sort(function(a, b) { return b.score - a.score || b.activeDays - a.activeDays || a.name.localeCompare(b.name, 'pt-BR'); });
          if (ranked[0]) { award('gold', ranked[0]); used[ranked[0].name] = true; }
          var silver = ranked.filter(function(item) { return !used[item.name]; }).sort(function(a, b) {
            return b.improvement - a.improvement || b.score - a.score || a.name.localeCompare(b.name, 'pt-BR');
          })[0];
          if (silver) { award('silver', silver); used[silver.name] = true; }
          var bronze = ranked.filter(function(item) { return !used[item.name]; }).sort(function(a, b) {
            return b.activeDays - a.activeDays || b.events - a.events || a.name.localeCompare(b.name, 'pt-BR');
          })[0];
          if (bronze) award('bronze', bronze);
          ranked.forEach(function(item) { previous[item.name] = item.score; });
        });
        return byStudent;
      }

      function closeAchievements() {
        var overlay = document.getElementById('spAchievementsOverlay');
        if (overlay) overlay.remove();
      }

      function openAchievements(name) {
        var data = SP_ACHIEVEMENTS[norm(name).toLowerCase()] || {name: name, gold: 0, silver: 0, bronze: 0, total: 0, history: []};
        var labels = {gold: tr('cl_medal_gold'), silver: tr('cl_medal_silver'), bronze: tr('cl_medal_bronze')};
        var emojis = {gold: '🥇', silver: '🥈', bronze: '🥉'};
        var descriptions = {gold: tr('cl_medal_gold_desc'), silver: tr('cl_medal_silver_desc'), bronze: tr('cl_medal_bronze_desc')};
        var counters = '<span>🥇 ' + data.gold + '</span><span>🥈 ' + data.silver + '</span><span>🥉 ' + data.bronze + '</span>';
        var history = data.history.slice().reverse().map(function(entry) {
          return '<div class="cl-achievement-history-item"><span aria-hidden="true">' + emojis[entry.type] + '</span><div><strong>' + esc(labels[entry.type]) + '</strong><small>' + esc(tr('cl_achievement_week').replace('{date}', entry.week)) + '</small></div></div>';
        }).join('');
        closeAchievements();
        var overlay = document.createElement('div');
        overlay.id = 'spAchievementsOverlay';
        overlay.className = 'block-mwa-dashboard-app cl-achievements-overlay';
        Store.renderHtml(overlay, '<section class="cl-achievements-modal" role="dialog" aria-modal="true" aria-labelledby="spAchievementsTitle">'
          + '<header><div><span aria-hidden="true">🏅</span><div><h2 id="spAchievementsTitle">' + esc(tr('cl_achievements_title')) + '</h2></div></div><button type="button" onclick="window.MWAProfile.closeAchievements()" aria-label="' + esc(tr('close')) + '">&times;</button></header>'
          + '<div class="cl-achievements-body"><div class="cl-achievements-score"><strong>' + esc(data.name || name) + '</strong>' + counters + '</div>'
          + '<div class="cl-achievements-rules"><p title="' + esc(descriptions.gold) + '">🥇 <strong>' + esc(labels.gold) + '</strong></p><p title="' + esc(descriptions.silver) + '">🥈 <strong>' + esc(labels.silver) + '</strong></p><p title="' + esc(descriptions.bronze) + '">🥉 <strong>' + esc(labels.bronze) + '</strong></p></div>'
          + '<h3>' + esc(tr('cl_achievements_history')) + '</h3><div class="cl-achievement-history">' + (history || '<p class="cl-achievements-empty">' + esc(tr('cl_achievements_empty')) + '</p>') + '</div></div></section>');
        document.body.appendChild(overlay);
      }
      function getDaysAgo(date) {
        if (!date) return 999;
        return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
      }
      function fmtDate(d) {
        if (!d) return '—';
        return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
      }
      function agoColor(ago) {
        if (ago === 0) return 'var(--green)';
        if (ago <= 2)  return 'var(--teal)';
        if (ago <= 6)  return 'var(--amber)';
        return 'var(--red)';
      }
    
      function engLabel(score, confirmedNever) {
        if (score === 0 && confirmedNever) return { label: tr('ev_never_access'), tone: 'never' };
        if (score >= 70) return { label: tr('ev_high_part'), tone: 'high' };
        if (score > 40) return { label: tr('ev_med_part'), tone: 'medium' };
        return { label: tr('ev_low_part'), tone: 'low' };
      }

      function studentActivityDone(row, seq, module) {
        var currentKey = 'act_current_' + seq;
        var hasCurrent = row && Object.prototype.hasOwnProperty.call(row, currentKey);
        var current = hasCurrent ? Number(row[currentKey] || 0) : null;
        var raw = String(row && row['act_' + seq] !== undefined && row['act_' + seq] !== null ? row['act_' + seq] : '').trim();
        var earned = parseFloat(raw.replace(',', '.'));
        var hasGrade = raw !== '' && raw !== '-' && !isNaN(earned) && earned > 0;
        return hasCurrent ? (module === 'forum' ? current > 0 : current > 0 || hasGrade) : hasGrade;
      }

      function totalGradeAtOrAboveThreshold(student, grade) {
        var row = student && student.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') raw = grade;
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') return false;
        var earned = Number(String(raw).trim().replace(',', '.'));
        var maximum = Number(row['Course full max (Grade)'] || student && student.gradeMax || 0);
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        var required = maximum > 0 ? maximum * approval / 100 : approval;
        return !isNaN(earned) && earned >= required;
      }

      function releasedGradeMaximum(grades, row, fallback) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var rows = (grades || []).filter(function(item) { return item && item.__mwa_type__ !== 'activity_names'; });
        var maximum = meta ? Object.keys(meta).reduce(function(total, key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return total;
          var seq = match[1];
          var released = rows.some(function(gradeRow) {
            var raw = String(gradeRow && gradeRow['act_' + seq] !== undefined && gradeRow['act_' + seq] !== null ? gradeRow['act_' + seq] : '').trim();
            return raw !== '' && raw !== '-' && !isNaN(parseFloat(raw.replace(',', '.')));
          });
          var activityMaximum = Number(meta['act_max_' + seq] || 0);
          return released && activityMaximum > 0 ? total + activityMaximum : total;
        }, 0) : 0;
        return maximum > 0 ? maximum : 0;
      }

      function totalGradeBelowThreshold(student, grade, grades) {
        var row = student && student.gradeRow || {};
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var hasStudentGrade = !!meta && Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var value = String(row['act_' + match[1]] === undefined || row['act_' + match[1]] === null
            ? '' : row['act_' + match[1]]).trim();
          return value !== '' && value !== '-' && !isNaN(parseFloat(value.replace(',', '.')));
        });
        if (!hasStudentGrade) return false;
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') raw = grade;
        var maximum = releasedGradeMaximum(grades, row, student && student.gradeMax);
        if (maximum <= 0) return false;
        var text = raw === null || raw === undefined ? '' : String(raw).trim();
        var earned = text === '' || text === '-' || text === '—' ? 0 : Number(text.replace(',', '.'));
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        var required = maximum * approval / 100;
        return !isNaN(earned) && earned < required;
      }

      function highlightGradeAtLeast60(student, grade, grades) {
        var row = student && student.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') raw = grade;
        var earned = Number(String(raw === null || raw === undefined ? '' : raw).trim().replace(',', '.'));
        var maximum = releasedGradeMaximum(grades, row, student && student.gradeMax);
        if (isNaN(earned)) return false;
        return maximum > 0 ? (earned / maximum) * 100 >= 60 : earned >= 60;
      }

      function highlightActivityTracked(meta, seq) {
        var cmid = Number(meta['act_cmid_' + seq] || 0);
        var name = norm(meta['act_' + seq] || '').toLowerCase();
        var matched = null;
        (Store.getConfig().activitylinks || []).some(function(link) {
          var linkCmid = Number(link && (link.cmid || link.coursemoduleid || link.id) || 0);
          var same = (cmid && linkCmid === cmid) || (!cmid && name && norm(link && link.name).toLowerCase() === name);
          if (same) { matched = link; return true; }
          return false;
        });
        return !matched || matched.tracked !== false;
      }

      function hasOpenPendingActivityForHighlight(student, grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var row = student && student.gradeRow || null;
        if (!meta || !row) return false;
        var now = Math.floor(Date.now() / 1000);
        var enrolled = Number(student.enrolmentCreated || row._enrolment_created || 0);
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var available = String(meta['act_available_' + seq] === undefined ? '1' : meta['act_available_' + seq]) !== '0';
          var from = Number(meta['act_availablefrom_' + seq] || 0);
          var until = Number(meta['act_availableuntil_' + seq] || 0);
          var open = available && (!from || from <= now) && (!until || until >= now);
          return open && highlightActivityTracked(meta, seq) &&
            !studentActivityDone(row, seq, norm(meta['act_module_' + seq] || '').toLowerCase());
        });
      }

      function hasOverdueDeliveryForProfile(student, grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var row = student && student.gradeRow || null;
        if (!meta || !row) return false;
        var now = Math.floor(Date.now() / 1000);
        var enrolled = Number(student.enrolmentCreated || row._enrolment_created || 0);
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var closedAt = Number(meta['act_availableuntil_' + seq] || 0);
          var availableFrom = Number(meta['act_availablefrom_' + seq] || 0);
          if (!closedAt || closedAt >= now || (enrolled && enrolled > closedAt) ||
              (availableFrom && availableFrom > closedAt)) return false;
          return !studentActivityDone(row, seq, norm(meta['act_module_' + seq] || '').toLowerCase());
        });
      }

      function hasAvailableContentForProfile(grades) {
        var now = Math.floor(Date.now() / 1000);
        if ((Store.getConfig().activitylinks || []).some(function(link) {
          if (!link || link.tracked === false) return false;
          var available = String(link.available === undefined ? '1' : link.available) !== '0';
          return available && (!Number(link.availablefrom || 0) || Number(link.availablefrom || 0) <= now) &&
            (!Number(link.availableuntil || 0) || Number(link.availableuntil || 0) >= now);
        })) return true;
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        return !!meta && Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var available = String(meta['act_available_' + seq] === undefined ? '1' : meta['act_available_' + seq]) !== '0';
          var from = Number(meta['act_availablefrom_' + seq] || 0);
          var until = Number(meta['act_availableuntil_' + seq] || 0);
          return available && (!from || from <= now) && (!until || until >= now);
        });
      }

      function profileFollowupReasons(student, grades, grade, confirmedNever) {
        if (confirmedNever) return [];
        var reasons = [];
        if (hasOverdueDeliveryForProfile(student, grades)) reasons.push({icon: 'clipboard', tone: 'overdue', label: tr('cl_followup_overdue')});
        if (Number(student && student.daysWithoutAccess || 0) >= 7 && hasAvailableContentForProfile(grades)) reasons.push({icon: 'clock', tone: 'inactive', label: tr('cl_followup_inactive')});
        if (totalGradeBelowThreshold(student, grade, grades)) reasons.push({icon: 'trend-down', tone: 'grade', label: tr('cl_followup_grade')});
        return reasons;
      }

      function profileFollowupReasonHtml(reasons) {
        if (!reasons || !reasons.length) return '';
        return '<span class="sp-followup-reasons">' + reasons.map(function(reason) {
          return '<span class="cl-followup-reason ' + esc(reason.tone) + '" title="' + esc(reason.label) + '" aria-label="' + esc(reason.label) + '">' + icon(reason.icon) + '</span>';
        }).join('') + '</span>';
      }
    
      function calcParticipation(name, logs, grades) {
        var email = '';
        (logs || []).some(function(r) {
          if (norm(r.nomecompleto) === name && norm(r.email)) {
            email = norm(r.email);
            return true;
          }
          return false;
        });
        return EngagementCalc.calculateForStudent(name, email, logs || [], grades || []).score;
      }

      function getAllStudentNames(logs, grades, students) {
        var seen = {};
        var names = [];
        function add(name) {
          name = norm(name);
          var key = name.toLowerCase();
          if (name && !seen[key]) {
            seen[key] = true;
            names.push(name);
          }
        }
        if (EngagementCalc && EngagementCalc.getStudentNames) {
          EngagementCalc.getStudentNames(logs || [], grades || []).forEach(add);
        }
        (students || []).forEach(function (s) {
          add(s.name || s.fullname || s.nomecompleto || s.student_name);
        });
        (logs || []).forEach(function (r) {
          add(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name);
        });
        return names;
      }

      function getTopTenRank(studentName, logs, grades, students) {
        var ranked = getAllStudentNames(logs, grades, students).map(function(candidate) {
          var email = getEmailForStudent(candidate, logs, grades, students);
          var calc = EngagementCalc.calculateForStudent(candidate, email, logs || [], grades || []);
          var grade = calc && calc.grade !== null && calc.grade !== undefined ? Number(calc.grade) : null;
          var daysWithoutAccess = Number(calc && calc.daysWithoutAccess);
          var rosterStudent = (students || []).find(function(student) {
            var sameEmail = email && norm(student.email).toLowerCase() === norm(email).toLowerCase();
            var sameName = norm(student.name || student.fullname).toLowerCase() === norm(candidate).toLowerCase();
            return sameEmail || sameName;
          }) || {};
          var gradeRow = rosterStudent.gradeRow || null;
          if (!gradeRow) {
            (grades || []).some(function(row) {
              if (!row || row.__mwa_type__ === 'activity_names') return false;
              var rowName = (norm(row['First name']) + ' ' + norm(row['Last name'])).trim().toLowerCase();
              if (rowName === norm(candidate).toLowerCase()) { gradeRow = row; return true; }
              return false;
            });
          }
          var eligibilityStudent = Object.assign({}, rosterStudent, {
            gradeRow: gradeRow,
            gradeMax: Number(calc && calc.gradeMax || rosterStudent.gradeMax || 0)
          });
          return {
            name: candidate,
            grade: grade,
            score: Number(calc && calc.score || 0),
            daysWithoutAccess: daysWithoutAccess,
            gradeEligible: highlightGradeAtLeast60(eligibilityStudent, grade, grades),
            hasOpenPending: hasOpenPendingActivityForHighlight(eligibilityStudent, grades)
          };
        }).filter(function(candidate) {
          return candidate.grade !== null && !isNaN(candidate.grade) &&
            !isNaN(candidate.daysWithoutAccess) && candidate.daysWithoutAccess <= 1 &&
            candidate.gradeEligible && !candidate.hasOpenPending;
        }).sort(function(a, b) {
          return b.grade - a.grade || b.score - a.score || a.name.localeCompare(b.name, 'pt-BR');
        }).slice(0, 10);
        var target = norm(studentName).toLowerCase();
        for (var index = 0; index < ranked.length; index++) {
          if (norm(ranked[index].name).toLowerCase() === target) return index + 1;
        }
        return 0;
      }

      function getEmailForStudent(name, logs, grades, students) {
        var target = name.toLowerCase();
        var found = '';
        (students || []).some(function (s) {
          var n = norm(s.name || s.fullname || s.nomecompleto || s.student_name).toLowerCase();
          if (n === target) {
            found = norm(s.email || s.mail);
            return !!found;
          }
          return false;
        });
        if (found) return found;
        (logs || []).some(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name).toLowerCase();
          if (n === target) {
            found = norm(r.email);
            return !!found;
          }
          return false;
        });
        if (found) return found;
        (grades || []).some(function (g) {
          if (!g || g.__mwa_type__ === 'activity_names') return false;
          var gname = (norm(g['First name']) + ' ' + norm(g['Last name'])).trim().toLowerCase();
          if (gname === target) {
            found = norm(g.Email || g.email);
            return !!found;
          }
          return false;
        });
        return found;
      }

      function buildActivityProgress(name, grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        if (!meta) return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_activities_found')) + '</span>';
        var actNames = {};
        var actCmids = {};
        var actModules = {};
        var actAvailability = {};
        var actAvailableFrom = {};
        var actAvailableUntil = {};
        var actMaxes = {};
        var actHidden = {};
        Object.keys(meta).forEach(function (k) {
          var m = k.match(/^act_(\d+)$/);
          if (!m) return;
          actNames[Number(m[1])] = norm(meta[k]);
          actCmids[Number(m[1])] = Number(meta['act_cmid_' + m[1]] || 0);
          actModules[Number(m[1])] = norm(meta['act_module_' + m[1]] || '');
          actAvailability[Number(m[1])] = String(meta['act_available_' + m[1]] === undefined ? '1' : meta['act_available_' + m[1]]) !== '0';
          actAvailableFrom[Number(m[1])] = Number(meta['act_availablefrom_' + m[1]] || 0);
          actAvailableUntil[Number(m[1])] = Number(meta['act_availableuntil_' + m[1]] || 0);
          actMaxes[Number(m[1])] = Number(meta['act_max_' + m[1]] || 0);
          actHidden[Number(m[1])] = String(meta['act_hidden_' + m[1]] || '0') !== '0';
        });
        var rawRow = null;
        (grades || []).some(function (g) {
          if (!g || g.__mwa_type__ === 'activity_names') return false;
          var first = norm(g['First name'] || g.Nome || g.firstname || '');
          var last = norm(g['Last name'] || g.Sobrenome || g.lastname || '');
          var gname = norm(g.student_name || g.name || g.nomecompleto || g.Aluno || (first + ' ' + last));
          if (gname.toLowerCase() === name.toLowerCase()) {
            rawRow = g;
            return true;
          }
          return false;
        });
        var wwwroot = (Store.getConfig().wwwroot || '').replace(/\/$/, '');
        var nowSeconds = Math.floor(Date.now() / 1000);
        var seqs = Object.keys(actNames).sort(function (a, b) { return Number(a) - Number(b); });
        if (!seqs.length) return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_activities_found')) + '</span>';
        return '<div class="cl-act-dots">' + seqs.map(function (seq) {
          var val = rawRow ? rawRow['act_' + seq] : null;
          var hasCurrentState = rawRow && Object.prototype.hasOwnProperty.call(rawRow, 'act_current_' + seq);
          var current = hasCurrentState ? Number(rawRow['act_current_' + seq] || 0) : null;
          var mod = String(actModules[Number(seq)] || '').toLowerCase();
          var num = (val === null || val === undefined) ? NaN : parseFloat(String(val).replace(',', '.'));
          var hasReleasedGrade = val !== null && val !== undefined && val !== '-' && val !== '' && !isNaN(num);
          var hasSubmission = hasCurrentState && current > 0;
          var zeroWithoutSubmission = hasReleasedGrade && num === 0 && !hasSubmission;
          var submissionTime = Number(rawRow['act_submissiontime_' + seq] || 0);
          var gradeTime = Number(rawRow['act_gradetime_' + seq] || 0);
          var resubmittedAfterGrade = hasReleasedGrade && hasSubmission && submissionTime > 0 &&
            gradeTime > 0 && submissionTime > gradeTime;
          var completedAndGraded = hasReleasedGrade && !zeroWithoutSubmission && !resubmittedAfterGrade;
          var n = Number(seq);
          var unavailable = !completedAndGraded && !hasSubmission && (
            actHidden[n] === true ||
            (actAvailableFrom[n] > 0 && actAvailableFrom[n] > nowSeconds) ||
            (actAvailability[n] === false && !(actAvailableUntil[n] > 0 && actAvailableUntil[n] < nowSeconds))
          );
          var overdue = !unavailable && !completedAndGraded && !hasSubmission &&
            actAvailableUntil[Number(seq)] > 0 && nowSeconds > actAvailableUntil[Number(seq)];
          var cls = completedAndGraded ? 'done' : hasSubmission ? 'awaiting-grade' : unavailable ? 'unavailable' : overdue ? 'overdue' : 'missing';
          var actName = actNames[Number(seq)] || ('Atividade ' + seq);
          var cmid = actCmids[Number(seq)] || 0;
          var url = cmid && mod && wwwroot ? wwwroot + '/mod/' + encodeURIComponent(mod) + '/view.php?id=' + encodeURIComponent(String(cmid)) : '';
          var activityStatus = completedAndGraded
            ? tr('cl_activity_grade_released').replace('{grade}', num.toFixed(1))
            : hasSubmission
              ? tr('cl_activity_awaiting_grade')
              : unavailable
                ? tr('cl_activity_unavailable')
              : overdue
                ? tr('cl_activity_overdue')
                : tr('cl_activity_not_submitted');
          if (unavailable && actAvailableFrom[n] > nowSeconds) {
            activityStatus += ' · ' + tr('cl_activity_opens_on').replace('{date}', new Date(actAvailableFrom[n] * 1000).toLocaleDateString());
          }
          var maxPoints = Number(actMaxes[n] || 0);
          if (maxPoints > 0) {
            activityStatus += ' · ' + tr('cl_activity_max_points').replace('{points}', maxPoints.toFixed(1));
          }
          if (zeroWithoutSubmission) {
            activityStatus += ' - ' + tr('cl_activity_zero_without_submission');
          }
          if (mod === 'forum' && hasSubmission) {
            activityStatus += ' · ' + tr(current === 1 ? 'cl_forum_post_count' : 'cl_forum_posts_count')
              .replace('{count}', current);
          }
          var title = esc(tr('sp_activity_status_title')
            .replace('{activity}', actName)
            .replace('{status}', activityStatus));
          if (url) return '<a class="cl-act-dot ' + cls + '" href="' + esc(url) + '" target="_blank" rel="noopener" title="' + title + '" onclick="event.stopPropagation()">' + esc(seq) + '</a>';
          return '<span class="cl-act-dot ' + cls + '" title="' + title + '">' + esc(seq) + '</span>';
        }).join('') + '</div>';
      }

      function moduleOf(log) {
        var mod = norm(log._modtype || log.modtype || log.module || log.modname || '').toLowerCase();
        var comp = norm(log.component || log.componente || '').toLowerCase();
        if (!mod && /^mod_/.test(comp)) mod = comp.replace(/^mod_/, '');
        if (mod === 'hvp') mod = 'h5pactivity';
        return mod;
      }

      function isCourseGeneral(v) {
        v = norm(v).toLowerCase();
        return !v || v === 'course module viewed' || v === 'módulo do curso visualizado' || v === 'course viewed' || v === 'curso visualizado';
      }

      function isResourceModule(log) {
        var mod = moduleOf(log);
        var comp = norm(log.component || log.componente || '').toLowerCase();
        if (mod === 'label' || comp.indexOf('area de midia e texto') >= 0 || comp.indexOf('área de mídia e texto') >= 0 || comp.indexOf('text and media area') >= 0) return false;
        return mod === 'page' || mod === 'book' || mod === 'url' || mod === 'resource' || mod === 'folder' || mod === 'imscp' ||
          comp === 'page' || comp === 'página' || comp === 'book' || comp === 'livro' || comp === 'url' || comp === 'arquivo' || comp === 'file';
      }

      function gradedCmidSet(grades) {
        var set = {};
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        if (!meta) return set;
        Object.keys(meta).forEach(function(key) {
          var match = key.match(/^act_cmid_(\d+)$/);
          if (match && Number(meta[key] || 0)) set[Number(meta[key])] = true;
        });
        return set;
      }

      function buildResourceCatalog(logs, activityLinks, grades) {
        var map = {};
        var graded = gradedCmidSet(grades);
        var now = Math.floor(Date.now() / 1000);
        (activityLinks || []).forEach(function(link) {
          if (!link || link.tracked === false) return;
          var available = String(link.available === undefined ? '1' : link.available) !== '0';
          var availableFrom = Number(link.availablefrom || 0);
          var availableUntil = Number(link.availableuntil || 0);
          var unavailable = !available || (availableFrom && availableFrom > now) ||
            (availableUntil && availableUntil < now);
          var cmid = parseInt(link.cmid || 0, 10) || 0;
          if (!isResourceModule(link) && (!cmid || graded[cmid])) return;
          var name = norm(link.name || '');
          if (!name) return;
          var mod = moduleOf(link);
          var key = cmid ? 'cmid:' + cmid : 'name:' + name.toLowerCase();
          map[key] = {name: name, cmid: cmid, mod: mod, url: norm(link.url || ''),
            unavailable: unavailable, availableFrom: availableFrom, students: {}};
        });
        (logs || []).forEach(function (log) {
          var cmid = parseInt(log.cmid || log._cmid || log.contextinstanceid || log.contextinstance || log.coursemoduleid || log.moduleid || 0, 10) || 0;
          if (!cmid) return;
          var key = 'cmid:' + cmid;
          if (!map[key]) return;
          var mod = moduleOf(log);
          if (!map[key].mod && mod) map[key].mod = mod;
          if (!map[key].url) map[key].url = norm(log.url || log.contexturl || log.objecturl || log.link || log.viewurl || log._url || '');
          var student = norm(log.nomecompleto || log.student_name || log.userfullname || log.fullname || log.name);
          if (student) map[key].students[student.toLowerCase()] = 1;
        });
        return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
      }

      function buildResourceProgress(name, logs, grades) {
        var config = Store.getConfig ? Store.getConfig() : {};
        var resources = buildResourceCatalog(logs, config.activitylinks || [], grades);
        if (!resources.length) return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_resources_found')) + '</span>';
        var studentKey = name.toLowerCase();
        var wwwroot = (Store.getConfig().wwwroot || '').replace(/\/$/, '');
        return '<div class="cl-act-dots">' + resources.map(function (res, idx) {
          var done = !!(res.students && res.students[studentKey]);
          var cls = done ? 'done' : (res.unavailable ? 'unavailable' : 'missing');
          var url = res.url || ((wwwroot && res.cmid && res.mod) ? wwwroot + '/mod/' + encodeURIComponent(res.mod) + '/view.php?id=' + encodeURIComponent(String(res.cmid)) : '');
          var status = done ? tr('cl_resource_accessed') :
            (res.unavailable ? tr('cl_resource_unavailable') : tr('cl_resource_not_accessed'));
          if (!done && res.unavailable && res.availableFrom && res.availableFrom > Math.floor(Date.now() / 1000)) {
            status += ' · ' + tr('cl_activity_opens_on').replace('{date}',
              new Date(res.availableFrom * 1000).toLocaleDateString());
          }
          var title = esc(res.name) + ' (' + esc(status) + ')';
          var label = String(idx + 1);
          if (url) return '<a class="cl-act-dot ' + cls + '" href="' + esc(url) + '" target="_blank" rel="noopener" title="' + title + '" onclick="event.stopPropagation()">' + label + '</a>';
          return '<span class="cl-act-dot ' + cls + '" title="' + title + '">' + label + '</span>';
        }).join('') + '</div>';
      }

      function getPictureForStudent(name, email, logs, grades) {
        var target = norm(name).toLowerCase();
        var targetEmail = norm(email).toLowerCase();
        var found = '';
        (logs || []).some(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname).toLowerCase();
          var e = norm(r.email).toLowerCase();
          if ((target && n === target) || (targetEmail && e === targetEmail)) {
            found = norm(r.pictureurl || r.profileimageurl || r.userpictureurl);
            return !!found;
          }
          return false;
        });
        if (found) return found;
        (grades || []).some(function (g) {
          if (!g || g.__mwa_type__ === 'activity_names') return false;
          var gname = (norm(g['First name']) + ' ' + norm(g['Last name'])).trim().toLowerCase();
          var gemail = norm(g.Email || g.email).toLowerCase();
          if ((target && gname === target) || (targetEmail && gemail === targetEmail)) {
            found = norm(g['Picture URL'] || g.pictureurl || g.profileimageurl);
            return !!found;
          }
          return false;
        });
        return found;
      }

      function renderCalendar(sData, containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var dayMap = {};
        sData.forEach(function (r) {
          if (!r._parsed_date) return;
          var d = r._parsed_date;
          var dk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          dayMap[dk] = (dayMap[dk] || 0) + 1;
        });
        var today = new Date();
        var weeks = [];
        var cur = new Date(today);
        cur.setDate(cur.getDate() - cur.getDay());
        for (var w = 51; w >= 0; w--) {
          var week = [];
          for (var d = 0; d < 7; d++) {
            var date = new Date(cur);
            date.setDate(cur.getDate() - (51 - w) * 7 + d);
            var dk = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
            week.push({ date: new Date(date), dk: dk, count: dayMap[dk] || 0 });
          }
          weeks.push(week);
        }
        var maxCount = Math.max.apply(null, Object.values(dayMap).concat([1]));
        function getColor(n) {
          if (n === 0) return 'rgba(0,0,0,.06)';
          var i = n / maxCount;
          if (i < .25) return '#3aab7a30';
          if (i < .50) return '#3aab7a60';
          if (i < .75) return '#3aab7a90';
          return '#3aab7a';
        }
        var monthMarkers = [];
        weeks.forEach(function (wk, wi) {
          var label = '';
          if (wi === 0 || wk[0].date.getDate() <= 7) {
            var m = wk[0].date.toLocaleDateString('pt-BR', { month: 'short' });
            if (!monthMarkers.length || monthMarkers[monthMarkers.length-1] !== m) {
              label = m;
              monthMarkers.push(m);
            }
          }
          wk.monthLabel = label;
        });
        var days = ['D','S','T','Q','Q','S','S'];
        renderTemplate(el, 'student_calendar', {
          months: weeks.map(function(wk){ return {label: wk.monthLabel || ''}; }),
          days: days.map(function(day, i){ return {label: i % 2 === 1 ? day : ''}; }),
          weeks: weeks.map(function(wk){
            return {items: wk.map(function(day){
              return {
                title: day.dk + ': ' + day.count + ' acesso' + (day.count !== 1 ? 's' : ''),
                color: getColor(day.count)
              };
            })};
          }),
          less: tr('sp_calendar_less'),
          more: tr('sp_calendar_more'),
          legend: [
            {color:'rgba(0,0,0,.06)'},
            {color:'#3aab7a30'},
            {color:'#3aab7a60'},
            {color:'#3aab7a90'},
            {color:'#3aab7a'}
          ]
        });
      }
      function renderDailyChart(sData) {
        var daily = {};
        sData.forEach(function (r) {
          if (!r._parsed_date) return;
          var d = r._parsed_date;
          var dk = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          daily[dk] = (daily[dk] || 0) + 1;
        });
        var arr = Object.entries(daily).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
        if (arr.length === 1) {
          arr.unshift([arr[0][0], 0]);
        }
        var canvas = document.getElementById('spDailyChart');
        if (!canvas || !Chart) return;
        if (window._spDailyChart) window._spDailyChart.destroy();
        window._spDailyChart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: arr.map(function (e) { return e[0].slice(5); }),
            datasets: [{
              label: tr('interactions'),
              data: arr.map(function (e) { return e[1]; }),
              borderColor: '#3aab7a',
              backgroundColor: 'rgba(58,171,122,.08)',
              fill: true,
              tension: .4,
              pointRadius: 3,
              pointBackgroundColor: '#3aab7a'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: 'var(--muted)', maxTicksLimit: 12, font: { size: 10 } } },
              y: { beginAtZero: true, ticks: { color: 'var(--muted)', font: { size: 10 } } }
            }
          }
        });
      }
    
      function loadProfile(name) {
        var el = document.getElementById('spContent');
        if (!el) return;
        if (!name) {
          updateProfileFilterActions('', '');
          renderTemplate(el, 'empty_state', {
            class: 'sp-empty',
            icon: '👤',
            iconclass: 'sp-empty-icon',
            message: tr('sp_select_hint')
          });
          return;
        }
    
        var dash   = window.MWADashboard || {};
        var state  = dash.state || {};
        var logs   = state.logs   || [];
        var grades = state.grades || [];
        var students = state.students || [];
        SP_ACHIEVEMENTS = calculateWeeklyAchievements(students, logs);
        var sLogs = logs.filter(function (r) { return norm(r.nomecompleto) === name; })
          .map(function (r) { var clone = Object.assign({}, r); clone._parsed_date = parseDate(r); return clone; })
          .filter(function (r) { return r._parsed_date; })
          .sort(function (a, b) { return a._parsed_date - b._parsed_date; });
        var first     = sLogs.length ? sLogs[0]._parsed_date : null;
        var last      = sLogs.length ? sLogs[sLogs.length - 1]._parsed_date : null;
        var presenceMinutes = last ? Math.max(0, Math.floor((Date.now() - last.getTime()) / 60000)) : null;
        var presenceTone = presenceMinutes !== null && presenceMinutes <= 5 ? 'online' :
          presenceMinutes !== null && presenceMinutes <= 15 ? 'recent' : 'offline';
        var presenceLabel = presenceTone === 'online' ? tr('presence_online_now') :
          presenceTone === 'recent' ? tr('presence_recent') : tr('presence_offline');
        var ago       = getDaysAgo(last);
        var ac        = agoColor(ago);
        var email     = getEmailForStudent(name, logs, grades, students);
        updateProfileFilterActions(name, email, false);
        var uniqDays  = new Set(sLogs.map(function (r) { var d = r._parsed_date; return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate(); })).size;
        var total     = sLogs.length;
        var rosterStudent = (students || []).find(function(student) {
          var sameEmail = email && norm(student.email).toLowerCase() === norm(email).toLowerCase();
          var sameName = norm(student.name || student.fullname).toLowerCase() === norm(name).toLowerCase();
          return sameEmail || sameName;
        }) || {};
        var confirmedNever = Number(rosterStudent.moodleLastAccess || 0) === 0 && !rosterStudent.last && Number(rosterStudent.interactions || 0) === 0;
        var score     = calcParticipation(name, logs, grades);
        var grade = null;
        var gradeRow = null;
        if (grades.length) {
          grades.some(function (g) {
            var gn = (norm(g['First name']) + ' ' + norm(g['Last name'])).trim();
            if (gn.toLowerCase() === name.toLowerCase()) {
              gradeRow = g;
              var k = Object.keys(g).find(function (x) { var lx = x.toLowerCase(); return lx.includes('course total') || lx.includes('total do curso'); });
              if (k) { var n = parseFloat(String(g[k]).replace(',','.')); if (!isNaN(n)) grade = n; }
              return true;
            }
            return false;
          });
        }
        var followupStudent = Object.assign({}, rosterStudent, {
          daysWithoutAccess: ago,
          grade: grade,
          gradeRow: rosterStudent.gradeRow || gradeRow,
          enrolmentCreated: Number(rosterStudent.enrolmentCreated || gradeRow && gradeRow._enrolment_created || 0)
        });
        var eng       = engLabel(score, confirmedNever);
        var approved = totalGradeAtOrAboveThreshold(followupStudent, grade);
        var fullMaximum = Number((followupStudent.gradeRow || {})['Course full max (Grade)'] || 0);
        var academicPercent = grade !== null && !isNaN(Number(grade)) && fullMaximum > 0
          ? (Number(grade) / fullMaximum) * 100 : null;
        var followupReasons = profileFollowupReasons(followupStudent, grades, grade, confirmedNever);
        var isFollowup = !approved && (followupReasons.length > 0 ||
          !!(ActionCenter && ActionCenter.isFollowUpStudent && ActionCenter.isFollowUpStudent(followupStudent)));
        var profileSituation = approved
          ? (academicPercent !== null && academicPercent > 70
            ? {label: tr('ev_high_part', 'Alta participação'), tone: 'high'}
            : {label: tr('cl_goal_reached', 'Meta alcançada'), tone: 'goal'})
          : isFollowup ? {label: tr('attention'), tone: 'followup'} : eng;
        followupStudent.confirmedNever = confirmedNever;
        var evaluation = ActionCenter.evaluateStudent(followupStudent);
        approved = evaluation.approved;
        followupReasons = evaluation.reasons;
        profileSituation = {label:evaluation.label,tone:evaluation.key};
        var now7 = Date.now() - 7 * 86400000, now14 = Date.now() - 14 * 86400000;
        var w1 = sLogs.filter(function (r) { return r._parsed_date.getTime() >= now7; }).length;
        var w2 = sLogs.filter(function (r) { return r._parsed_date.getTime() >= now14 && r._parsed_date.getTime() < now7; }).length;
        var trendHtml = w1 > 0 ? '' : '<span class="sp-trend">' + tr('no_data') + '</span>';
        if (w2 > 0) {
          var diff = w1 - w2;
          var pct  = Math.min(100, Math.round(Math.abs(diff / w2) * 100));
          if (pct >= 5) {
            trendHtml = diff > 0
              ? '<span class="sp-trend up">↑' + pct + '% ' + tr('sp_vs_last_week') + '</span>'
              : '<span class="sp-trend down">↓' + pct + '% ' + tr('sp_vs_last_week') + '</span>';
          } else {
            trendHtml = '<span class="sp-trend">= ' + tr('sp_stable') + '</span>';
          }
        }
        var spark = [];
        for (var i = 6; i >= 0; i--) {
          var d = new Date(Date.now() - i * 86400000);
          var dk = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
          spark.push(sLogs.filter(function (r) {
            var rd = r._parsed_date;
            return rd.getFullYear() + '-' + (rd.getMonth()+1) + '-' + rd.getDate() === dk;
          }).length);
        }
        var maxS = Math.max.apply(null, spark.concat([1]));
        var sparkSvg = spark.map(function (v, i) {
          var h = Math.max(2, Math.round(v / maxS * 28));
          var clr = v === 0 ? 'rgba(0,0,0,.12)' : v >= maxS * .7 ? '#3aab7a' : '#5b9bd5';
          return '<rect x="' + (i * 9) + '" y="' + (30 - h) + '" width="6" height="' + h + '" rx="2" fill="' + clr + '"/>';
        }).join('');
        var initials = name.split(/\s+/).filter(Boolean).slice(0,2).map(function (w) { return w[0]; }).join('').toUpperCase();
        var ci = Math.abs((name.charCodeAt(0)||0) + (name.charCodeAt(1)||0)) % AV_COLORS.length;
        var picture = getPictureForStudent(name, email, logs, grades);
        var noteVal  = NOTES[name] || '';
        var contacts = CONTACTS[name] || [];
        var safeN = esc(name);
        var histHtml = contacts.length
          ? contacts.map(function (c, idx) {
              return '<div class="sp-contact-item">'
                + '<div class="sp-contact-dot" style="background:var(--blue);"></div>'
                + '<div style="flex:1;">'
                  + '<div class="sp-contact-subject">' + esc(c.subject || tr('sp_contact')) + '</div>'
                  + '<div class="sp-contact-meta">' + esc(c.type || 'email') + ' · ' + fmtDate(new Date(c.date)) + '</div>'
                + '</div>'
                + '<button class="sp-contact-delete" onclick="window.MWAProfile.deleteContact(' + JSON.stringify(name) + ',' + idx + ')">🗑</button>'
                + '</div>';
            }).join('')
          : '<div style="font-size:.78rem;color:var(--muted);padding:.5rem 0;">' + esc(tr('sp_no_contacts')) + '</div>';
        var calId = 'spCal_' + name.replace(/[^a-zA-Z0-9]/g, '_');
        var activityProgressHtml = buildActivityProgress(name, grades);
        var resourceProgressHtml = buildResourceProgress(name, logs, grades);
        var interventionStats = window.MWAInterventions && window.MWAInterventions.getStudentStats
          ? window.MWAInterventions.getStudentStats(name) : {total: 0, ongoing: 0};
        updateProfileFilterActions(name, email, interventionStats.total > 0);
        var achievements = SP_ACHIEVEMENTS[name.toLowerCase()] || {total: 0};
    
        renderTemplate(el, 'student_profile', {
          avatarcolor: AV_COLORS[ci],
          initials: initials,
          pictureurl: picture,
          haspicture: !!picture,
          name: name,
          email: email || tr('no_email'),
          presencetone: presenceTone,
          presencelabel: presenceLabel,
          rawemail: email,
          firstdate: fmtDate(first),
          lastdate: fmtDate(last),
          totalinteractions: total.toLocaleString('pt-BR'),
          interactionslabel: tr('interactions'),
          achievementtotal: Number(achievements.total || 0),
          achievementslabel: tr('cl_achievements'),
          lastaccesslabel: tr('sp_kpi_last_access'),
          agocolor: ac,
          ago: last ? ago : '-',
          agosuffix: last ? tr('sp_days_suffix') : '',
          activedayslabel: tr('sp_kpi_active_days'),
          uniquedays: uniqDays,
          total: total,
          interventionslabel: tr('student_interventions_received'),
          interventionstotal: interventionStats.total,
          interventionssub: tr('student_interventions_ongoing').replace('{count}', interventionStats.ongoing),
          hasinterventions: interventionStats.total > 0,
          gradelabel: tr('sp_kpi_grade'),
          gradecolor: grade !== null ? (approved ? 'var(--green)' : 'var(--amber)') : 'var(--muted)',
          gradevalue: grade !== null ? grade.toFixed(1) : '—',
          gradesub: grade !== null ? (approved ? tr('sp_approved') : tr('sp_in_progress')) : tr('sp_no_grade'),
          engagementkpilabel: tr('sp_kpi_engagement'),
          englabel: profileSituation.label,
          engagementtone: profileSituation.tone,
          followupreasonhtml: profileFollowupReasonHtml(followupReasons),
          score: score,
          activityprogresslabel: tr('cl_th_activity_progress'),
          activityprogresshtml: activityProgressHtml,
          resourceprogresslabel: tr('sp_resources_contents'),
          resourceprogresshtml: resourceProgressHtml,
          activity7d: tr('sp_activity_7d'),
          trendhtml: trendHtml,
          sparksvg: sparkSvg,
          hasweekdata: w1 > 0,
          nodatalabel: tr('no_data'),
          hasdailydata: sLogs.length > 0,
          weekinteractions: w1,
          weeklabel: tr('sp_interactions_this_week'),
          calendarid: calId,
          dailyjourney: tr('sp_daily_journey'),
          activitycalendar: tr('sp_activity_calendar')
        }).then(function () {
          renderDailyChart(sLogs);
          renderCalendar(sLogs, calId);
          if (window.MWAInterventions) {
            window.MWAInterventions.renderStudentTimeline(name, 'spTimeline_' + calId);
          }
          var page = document.getElementById('page-studentprofile');
          var main = page && page.closest('.main');
          if (main) main.scrollTop = 0;
          if (page && page.classList.contains('active')) window.scrollTo({top: 0, left: 0, behavior: 'auto'});
        });
      }

      function updateProfileFilterActions(name, email, hasIntervention) {
        var report = document.getElementById('spFilterReport');
        var message = document.getElementById('spFilterMessage');
        var enabled = !!norm(name);
        var reportEnabled = enabled && !!hasIntervention;
        if (report) {
          report.hidden = !reportEnabled;
          report.disabled = !reportEnabled;
          report.dataset.sname = reportEnabled ? name : '';
          report.onclick = reportEnabled ? function() {
            if (window.MWATeacherFeedback && typeof window.MWATeacherFeedback.openIndividualReport === 'function') {
              window.MWATeacherFeedback.openIndividualReport(name);
            }
          } : null;
        }
        if (message) {
          message.disabled = !enabled;
          message.dataset.sname = enabled ? name : '';
          message.dataset.semail = enabled ? (email || '') : '';
          message.onclick = enabled ? function() {
            if (window.MWAInterventions) window.MWAInterventions.openByEl(message);
          } : null;
        }
      }
    
      function toggleCollapse(trigger) {
        var body = trigger.nextElementSibling;
        var arrow = trigger.querySelector('.sp-collapse-arrow');
        if (!body) return;
        body.classList.toggle('open');
        if (arrow) arrow.classList.toggle('open');
      }
    
      function saveNote(name) {
        var area = document.getElementById('spNoteArea');
        if (!area) return;
        var text = area.value.trim();
        if (text) NOTES[name] = text;
        else delete NOTES[name];
        var t = document.createElement('div');
        t.textContent = tr('sp_note_saved');
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--green);color:#fff;padding:10px 18px;border-radius:12px;font-size:.82rem;font-weight:800;z-index:9999;animation:mwafadeIn .25s ease;';
        (document.getElementById('block-mwa-dashboard-app') || document.body).appendChild(t);
        setTimeout(function () { t.remove(); }, 2000);
      }
    
      function addContact(name) {
        var subject = prompt(tr('sp_contact_subject_prompt'), '');
        if (!subject) return;
        if (!CONTACTS[name]) CONTACTS[name] = [];
        CONTACTS[name].unshift({ subject: subject, type: 'manual', date: Date.now() });
        loadProfile(name);
      }
    
      function deleteContact(name, idx) {
        if (!CONTACTS[name]) return;
        CONTACTS[name].splice(idx, 1);
        if (!CONTACTS[name].length) delete CONTACTS[name];
        loadProfile(name);
      }
    
      function render() {
        var sel = document.getElementById('spStudentSel');
        var search = document.getElementById('spStudentSearch');
        var clear = document.getElementById('spStudentClear');
        var suggestions = document.getElementById('spStudentSuggestions');
        if (!sel) return;

        function getNames() {
          var dash  = window.MWADashboard || {};
          var state = dash.state || {};
          var logs  = state.logs || [];
          var grades = state.grades || [];
          var names = getAllStudentNames(logs, grades, state.students || []);
          names.sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
          return { names: names, logs: logs, grades: grades, students: state.students || [] };
        }

        function fillSelect(selectedName, searchTerm) {
          var current = norm(selectedName) || norm(sel.value);
          var d = getNames();
          var query = norm(searchTerm).toLowerCase();
          var placeholder = tr('sp_select_placeholder') || 'Escolha um aluno';
          // Updating filtered options is not a new selection. Ignore the synthetic
          // change emitted by the shared custom-select observer during this rebuild.
          sel.dataset.spFillingOptions = '1';
          sel.replaceChildren();
          var opt = document.createElement('option');
          opt.value = '';
          opt.textContent = placeholder;
          sel.appendChild(opt);
          var matches = d.names.filter(function(n) {
            if (!query) return true;
            var email = getEmailForStudent(n, d.logs, d.grades, d.students);
            return n.toLowerCase().indexOf(query) !== -1 || email.toLowerCase().indexOf(query) !== -1;
          });
          matches.forEach(function(n) {
            var item = document.createElement('option');
            item.value = n;
            item.textContent = n;
            sel.appendChild(item);
          });
          if (suggestions) {
            suggestions.replaceChildren();
            if (query) {
              matches.slice(0, 30).forEach(function(n) {
                var suggestion = document.createElement('button');
                suggestion.type = 'button';
                suggestion.className = 'sp-profile-search-result';
                var resultName = document.createElement('strong');
                var resultEmail = document.createElement('span');
                resultName.textContent = n;
                resultEmail.textContent = getEmailForStudent(n, d.logs, d.grades, d.students);
                suggestion.appendChild(resultName);
                suggestion.appendChild(resultEmail);
                suggestion.addEventListener('mousedown', function(event) {
                  event.preventDefault();
                  search.value = n;
                  sel.value = n;
                  suggestions.hidden = true;
                  sel.dispatchEvent(new Event('change', {bubbles: true}));
                });
                suggestions.appendChild(suggestion);
              });
            }
            var userIsSearching = search && search.dataset.spUserSearching === '1' &&
              document.activeElement === search;
            suggestions.hidden = !userIsSearching || !query || !matches.length;
          }
          if (current && matches.indexOf(current) !== -1) {
            sel.value = current;
          } else {
            sel.value = '';
          }
          setTimeout(function() { delete sel.dataset.spFillingOptions; }, 0);
          return sel.value;
        }

        var selectedAfterFill = fillSelect(PENDING_PROFILE_STUDENT, search ? search.value : '');
        if (!sel.dataset.spInit) {
          sel.dataset.spInit = '1';
          sel.addEventListener('change', function() {
            if (sel.dataset.spFillingOptions === '1') return;
            if (search && sel.value) search.value = sel.value;
            loadProfile(sel.value);
          });
        }
        if (search && !search.dataset.spSearchInit) {
          search.dataset.spSearchInit = '1';
          search.addEventListener('input', function() {
            search.dataset.spUserSearching = '1';
            fillSelect('', search.value);
          });
          search.addEventListener('focus', function() {
            search.dataset.spUserSearching = '0';
          });
          search.addEventListener('change', function() {
            var d = getNames();
            var query = norm(search.value).toLowerCase();
            var matchedStudent = d.names.find(function(name) {
              return name.toLowerCase() === query || getEmailForStudent(name, d.logs, d.grades, d.students).toLowerCase() === query;
            }) || '';
            fillSelect(matchedStudent, search.value);
            if (matchedStudent) loadProfile(matchedStudent);
          });
          search.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && suggestions) suggestions.hidden = true;
          });
          search.addEventListener('blur', function() {
            search.dataset.spUserSearching = '0';
            if (suggestions) setTimeout(function() { suggestions.hidden = true; }, 120);
          });
        }
        if (clear && !clear.dataset.spClearInit) {
          clear.dataset.spClearInit = '1';
          clear.addEventListener('click', function() {
            if (search) search.value = '';
            sel.value = '';
            fillSelect('', '');
            loadProfile('');
            if (search) search.focus();
          });
        }
        if (PENDING_PROFILE_STUDENT) {
          loadProfile(PENDING_PROFILE_STUDENT);
          PENDING_PROFILE_STUDENT = '';
        } else if (selectedAfterFill) {
          loadProfile(selectedAfterFill);
        }
      }
    
      window.goToStudentProfile = function (name, userid) {
        var normalName = norm(name);
        var requestedUserId = Number(userid || 0);
        if (requestedUserId) {
          var dashboard = window.MWADashboard || {};
          var matched = ((dashboard.state || {}).students || []).find(function(student) {
            return Number(student.userid || student.id || 0) === requestedUserId;
          });
          if (matched && matched.name) normalName = norm(matched.name);
        }
        if (!normalName) return;
        PENDING_PROFILE_STUDENT = normalName;
        window.showPage && window.showPage('studentprofile');
        var attempts = 0;
        function openWhenReady() {
          if (window.MWAProfileReloading) {
            if (attempts++ < 50) setTimeout(openWhenReady, 120);
            return;
          }
          var sel = document.getElementById('spStudentSel');
          if (!sel) {
            if (attempts++ < 50) setTimeout(openWhenReady, 120);
            return;
          }
          if (!sel.dataset.spInit) {
            PENDING_PROFILE_STUDENT = normalName;
            render();
            if (attempts++ < 50) setTimeout(openWhenReady, 120);
            return;
          }
          sel.value = normalName;
          var search = document.getElementById('spStudentSearch');
          var suggestions = document.getElementById('spStudentSuggestions');
          if (search) {
            search.value = normalName;
            search.dataset.spUserSearching = '0';
          }
          if (suggestions) suggestions.hidden = true;
          loadProfile(normalName);
          PENDING_PROFILE_STUDENT = '';
        }
        setTimeout(openWhenReady, 150);
      };

      function openInterventionHistory(name) {
        if (!window.MWAInterventions || !window.MWAInterventions.getStudentStats || !window.MWAInterventions.openStudentHistory) return;
        if (window.MWAInterventions.getStudentStats(name).total < 1) return;
        window.MWAInterventions.openStudentHistory(name);
      }
    
      window.MWAProfile = {
        render:       render,
        loadProfile:  loadProfile,
        saveNote:     saveNote,
        addContact:   addContact,
        deleteContact:deleteContact,
        openInterventionHistory: openInterventionHistory,
        openAchievements: openAchievements,
        closeAchievements: closeAchievements,
        toggleCollapse: toggleCollapse
      };
    
    })();

    return window.MWAProfile;
});
