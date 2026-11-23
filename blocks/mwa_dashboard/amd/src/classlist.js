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
 * @module     block_mwa_dashboard/classlist
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
define(['block_mwa_dashboard/dashboardstore', 'block_mwa_dashboard/engagementcalc', 'core/templates',
    'block_mwa_dashboard/xlsxexport', 'block_mwa_dashboard/actioncenter'],
  function(Store, EngagementCalc, Templates, XlsxExport, ActionCenter) {

    'use strict';

    var window = Store.windowFacade();

    (function () {
      function icon(name) {
        return '<svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-' + name + '"></use></svg>';
      }
      var CL_SELECTED = {};
      var CL_GRADE_ROWS = [];

      function classSelectionKey(item) {
        return item && item.userid ? 'u' + item.userid : 'e' + norm(item && item.email || item && item.name).toLowerCase();
      }
      function classTarget(item) {
        return {name: item.name, email: item.email || '', userid: Number(item.userid || 0)};
      }
      function updateClassBulkAction() {
        var selected = Object.keys(CL_SELECTED).length;
        var button = document.getElementById('clBulkMessage');
        var count = document.getElementById('clBulkMessageCount');
        if (button) button.disabled = selected === 0;
        if (count) count.textContent = selected;
        var filteredItems = CL_EXPORT_ITEMS || [];
        var master = document.getElementById('clSelectVisible');
        if (master) {
          var checked = filteredItems.filter(function(item) { return !!CL_SELECTED[classSelectionKey(item)]; }).length;
          master.checked = filteredItems.length > 0 && checked === filteredItems.length;
          master.indeterminate = checked > 0 && checked < filteredItems.length;
          master.disabled = filteredItems.length === 0;
        }
      }
      function toggleStudentSelection(input) {
        var item = CL_DETAIL_ITEMS[input.getAttribute('data-detail-id')];
        if (!item) return;
        var key = classSelectionKey(item);
        if (input.checked) CL_SELECTED[key] = classTarget(item); else delete CL_SELECTED[key];
        updateClassBulkAction();
      }
      function toggleVisibleSelection(input) {
        (CL_EXPORT_ITEMS || []).forEach(function(item) {
          var key = classSelectionKey(item);
          if (input.checked) CL_SELECTED[key] = classTarget(item); else delete CL_SELECTED[key];
        });
        document.querySelectorAll('#clTableBody .mwa-student-select').forEach(function(box) { box.checked = input.checked; });
        updateClassBulkAction();
      }
      function clearClassFilters() {
        CL_SELECTED = {};
        CL_FILTER = 'all';
        CL_SEARCH = '';
        CL_ACCESS_FROM = '';
        CL_ACCESS_TO = '';
        CL_PAGE = 1;
        var input = document.getElementById('clSearch');
        var sort = document.getElementById('clSort');
        var accessFrom = document.getElementById('clAccessFrom');
        var accessTo = document.getElementById('clAccessTo');
        if (input) input.value = '';
        if (sort) sort.value = 'risk';
        if (accessFrom) accessFrom.value = '';
        if (accessTo) accessTo.value = '';
        renderClassListUnified();
      }
      function messageSelected() {
        var targets = Object.keys(CL_SELECTED).map(function(key) { return CL_SELECTED[key]; });
        if (targets.length && window.MWAActionCenter) window.MWAActionCenter.openBulkModal(targets, {});
      }
      'use strict';
    
      
      function tr(key, fallback) {
        var S = Store.getStrings() || {};
        var v = Object.prototype.hasOwnProperty.call(S, key) ? S[key] : '';
        if (typeof v === 'string' && v && !/^\[\[.*\]\]$/.test(v)) return v;
        return fallback || key;
      }
      function esc(v) {
        return String(v === undefined || v === null ? '' : v)
          .replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
          });
      }
      function norm(v) { return (v === undefined || v === null) ? '' : String(v).trim(); }
      function helpTip(text) {
        return '<span class="mwa-help-tip cl-help-tip" tabindex="0" aria-label="' + esc(text) + '" data-tooltip="' + esc(text) + '">?</span>';
      }

      /**
       * Delta chip for a class KPI card.
       *
       * The label always reports the real signed change (cur - prv); only the
       * colour encodes whether that change is good or bad. "never" and "low"
       * are undesirable buckets, so for them a drop is green and a rise is red
       * (invertColors = true); "medium" and "high" are the reverse.
       */
      function classKpiDeltaChip(key, cur, prv, invertColors) {
        if (prv === null || prv === undefined || cur === null || cur === undefined) {
          return '';
        }
        var d = Number(cur) - Number(prv);
        var label = d === 0 ? '0' : (d > 0 ? '+' + d : String(d));
        var good = invertColors ? d < 0 : d > 0;
        var color = d === 0 ? '#8a94a8' : good ? '#13794c' : '#b42318';
        var bg = d === 0 ? '#f0f2f7' : good ? '#e8f7ef' : '#fdecec';
        return '<span style="background:' + bg + ';color:' + color + ';font-size:.65rem;font-weight:800;padding:2px 7px;border-radius:99px;">' + label + '</span>';
      }
    
      /* ── module state ── */
      var CL_VIEW = 'participation';
      var CL_FILTER = 'all';
      var CL_ATTENTION_STUDENTS = {ids: {}, names: {}};
      var CL_SEARCH = '';
      var CL_ACCESS_FROM = '';
      var CL_ACCESS_TO = '';
      var CL_DETAIL_ITEMS = {};
      var CL_PAGE = 1;
      var CL_PAGE_SIZE = 10;
      var CL_EXPORT_ITEMS = [];
      var CL_ALL_ITEMS = [];
      var CL_EXPORT_SESSION_TIMES = {};
      var CL_EXPORT_GRADES = [];
      var CL_EXPORT_RESOURCES = [];
      var CL_FOLLOWUP_ITEMS = null;
    
      /* ── avatar colours (cycling by name) ── */
      var AV_COLORS = ['#5b9bd5','#8b72d4','#3aab7a','#c98a2a','#d95f5f','#2aafaa','#e07ba0'];
    
      /* ── helpers de data ── */
      function parseDate(log) {
        if (log._ts) return new Date(Number(log._ts) * 1000);
        if (log.timecreated) return new Date(Number(log.timecreated) * 1000);
        var s = norm(log.hora || log.time || log.date);
        var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (m) return new Date(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
        return null;
      }
    
      function fmtDate(d) {
        if (!d) return '—';
        var dd = String(d.getDate()).padStart(2, '0');
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        return dd + '/' + mm + '/' + d.getFullYear();
      }

      function presenceInfo(last) {
        if (!last || !(last instanceof Date) || isNaN(last.getTime())) {
          return {tone: 'offline', label: tr('presence_offline', 'Offline')};
        }
        var minutes = Math.max(0, Math.floor((Date.now() - last.getTime()) / 60000));
        if (minutes <= 5) return {tone: 'online', label: tr('presence_online_now', 'Online agora')};
        if (minutes <= 15) return {tone: 'recent', label: tr('presence_recent', 'Ativo recentemente')};
        return {tone: 'offline', label: tr('presence_offline', 'Offline')};
      }
    
      /* ── session time calculation ── */
      var SESSION_GAP = 10 * 60 * 1000;
      var ACTIVE_GAP_CAP = 5 * 60 * 1000;
    
      function calcSessionTimes(logs) {
        var byStudent = {};
        logs.forEach(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name);
          var d = parseDate(r);
          if (!n || !d) return;
          if (!byStudent[n]) byStudent[n] = [];
          byStudent[n].push(d.getTime());
        });
        var result = {};
        Object.keys(byStudent).forEach(function (n) {
          var seen = {};
          var times = byStudent[n]
            .sort(function (a, b) { return a - b; })
            .filter(function (t) {
              if (seen[t]) return false;
              seen[t] = true;
              return true;
            });
          var total = 0;
          var prev = times[0];
          for (var i = 1; i < times.length; i++) {
            var gap = times[i] - prev;
            if (gap > 0 && gap <= SESSION_GAP) {
              total += Math.min(gap, ACTIVE_GAP_CAP);
            }
            prev = times[i];
          }
          result[n] = total;
        });
        return result;
      }
    
      function fmtTime(ms) {
        if (!ms || ms <= 0) return '0min';
        var totalMin = Math.round(ms / 60000);
        if (totalMin < 1) return '< 1min';
        if (totalMin < 60) return totalMin + 'min';
        var h = Math.floor(totalMin / 60);
        var m = totalMin % 60;
        return h + 'h' + (m > 0 ? ' ' + m + 'min' : '');
      }

      function progressCounts(html) {
        var markup = html || '';
        return {
          done: (markup.match(/class="cl-act-dot done"/g) || []).length +
            (markup.match(/class="cl-act-dot awaiting-grade"/g) || []).length,
          missing: (markup.match(/class="cl-act-dot missing"/g) || []).length,
          overdue: (markup.match(/class="cl-act-dot overdue"/g) || []).length
        };
      }

      function csvCell(value) {
        var text = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      }

      function utf16leBlob(text) {
        var buffer = new ArrayBuffer(2 + (text.length * 2));
        var view = new DataView(buffer);
        view.setUint16(0, 0xFEFF, true);
        for (var i = 0; i < text.length; i++) {
          view.setUint16(2 + (i * 2), text.charCodeAt(i), true);
        }
        return new Blob([buffer], {type: 'text/csv;charset=utf-16le'});
      }

      function exportGradeActivities(grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        if (!meta) return [];
        return Object.keys(meta).map(function(key) {
          var match = key.match(/^act_(\d+)$/);
          return match ? {seq: match[1], name: norm(meta[key]) || ('Atividade ' + match[1])} : null;
        }).filter(Boolean).sort(function(a, b) {
          return Number(a.seq) - Number(b.seq);
        });
      }

      function exportGradeRow(studentName, grades) {
        var found = null;
        (grades || []).some(function(row) {
          if (!row || row.__mwa_type__ === 'activity_names') return false;
          var first = norm(row['First name'] || row.Nome || row.firstname || '');
          var last = norm(row['Last name'] || row.Sobrenome || row.lastname || '');
          var name = norm(row.student_name || row.name || row.nomecompleto || row.Aluno || (first + ' ' + last));
          if (name.toLowerCase() === norm(studentName).toLowerCase()) {
            found = row;
            return true;
          }
          return false;
        });
        return found || {};
      }

      function exportActivityGrade(row, seq) {
        var raw = row['act_' + seq];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-' || String(raw).trim() === '—') {
          return '';
        }
        var parsed = Number(String(raw).trim().replace(',', '.'));
        return isNaN(parsed) ? raw : parsed;
      }

      function exportClassSpreadsheet() {
        if (!CL_EXPORT_ITEMS.length) {
          Store.notify(tr('cl_export_empty', 'Não há estudantes para exportar com os filtros atuais.'), 'warning');
          return;
        }
        var gradeActivities = exportGradeActivities(CL_EXPORT_GRADES);
        var headers = [
          tr('student', 'Estudante'), tr('email', 'E-mail'), tr('cl_th_participation', 'Participação (%)'),
          tr('cl_th_situation', 'Situação'), tr('attention', 'Em acompanhamento'),
          tr('cl_th_days_without', 'Dias sem acesso'), tr('cl_th_last_access', 'Último acesso'),
          tr('interactions', 'Interações'), tr('ev_active_days', 'Dias ativos'),
          tr('cl_th_total_time', 'Tempo total'), tr('sp_kpi_grade', 'Nota atual'),
          tr('cl_export_activities_done', 'Atividades concluídas'),
          tr('cl_export_activities_missing', 'Atividades pendentes'),
          tr('cl_export_activities_overdue', 'Atividades atrasadas'),
          tr('cl_export_resources_accessed', 'Conteúdos acessados'),
          tr('cl_export_resources_missing', 'Conteúdos não acessados')
        ].concat(gradeActivities.map(function(activity) {
          return tr('sp_kpi_grade', 'Nota') + ' — ' + activity.name;
        }));
        var rows = CL_EXPORT_ITEMS.map(function(item) {
          var calc = item.calc || {};
          var activity = progressCounts(buildActDots(item.name, CL_EXPORT_GRADES));
          var resource = progressCounts(buildResourceDots(item.name, CL_EXPORT_RESOURCES));
          var grade = calc.grade === null || calc.grade === undefined || isNaN(Number(calc.grade)) ? '' : Number(calc.grade);
          var daysWithout = item.status.key === 'never' ? '' : Number(calc.daysWithoutAccess || 0);
          var gradeRow = exportGradeRow(item.name, CL_EXPORT_GRADES);
          return [
            item.name, item.email || '', item.score,
            item.followup ? tr('attention', 'Em acompanhamento') : item.status.label,
            item.followup ? tr('yes', 'Sim') : tr('no', 'Não'), daysWithout,
            calc.last ? fmtDate(calc.last) : '', item.count, Number(calc.activeDays || 0),
            fmtTime(CL_EXPORT_SESSION_TIMES[item.name] || 0), grade,
            activity.done, activity.missing, activity.overdue,
            resource.done, resource.missing + resource.overdue
          ].concat(gradeActivities.map(function(activity) {
            return exportActivityGrade(gradeRow, activity.seq);
          }));
        });
        var courseId = (Store.getConfig() || {}).courseid || 'curso';
        XlsxExport.download(headers, rows,
          'relatorio_turma_' + courseId + '_' + new Date().toISOString().slice(0, 10) + '.xlsx',
          tr('cl_title', 'Relatório da turma'));
      }

      function exportMedalsReport() {
        if (!CL_ALL_ITEMS.length) {
          Store.notify(tr('cl_export_empty', 'Não há estudantes para exportar.'), 'warning');
          return;
        }
        var ranking = CL_ALL_ITEMS.map(function(item) {
          var medals = item.achievements || {gold: 0, silver: 0, bronze: 0, total: 0};
          return {name: item.name, gold: Number(medals.gold || 0), silver: Number(medals.silver || 0), bronze: Number(medals.bronze || 0), total: Number(medals.total || 0), points: Number(medals.gold || 0) * 3 + Number(medals.silver || 0) * 2 + Number(medals.bronze || 0)};
        }).sort(function(a, b) {
          return b.points - a.points || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name, 'pt-BR');
        });
        var rows = ranking.map(function(item, index) {
          var cls = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
          return '<tr class="' + cls + '"><td class="position">' + (index + 1) + 'º</td><td><strong>' + esc(item.name) + '</strong></td><td>🥇 ' + item.gold + '</td><td>🥈 ' + item.silver + '</td><td>🥉 ' + item.bronze + '</td><td>' + item.total + '</td><td class="points">' + item.points + '</td></tr>';
        }).join('');
        closeMedalsReport();
        var overlay = document.createElement('div');
        overlay.id = 'clMedalsReportOverlay';
        overlay.className = 'block-mwa-dashboard-app cl-medals-report-overlay';
        Store.renderHtml(overlay, '<section class="cl-medals-report-card" role="dialog" aria-modal="true" aria-labelledby="clMedalsReportTitle"><header><div><span aria-hidden="true">🏅</span><div><h2 id="clMedalsReportTitle">' + esc(tr('cl_medals_report_title')) + '</h2><p>' + esc(tr('cl_medals_report_subtitle')) + ' · ' + new Date().toLocaleDateString('pt-BR') + '</p></div></div><button type="button" onclick="window.MWAClassList.closeMedalsReport()" aria-label="' + esc(tr('close')) + '">&times;</button></header><div class="cl-medals-report-body"><div class="cl-medals-report-legend"><span>🥇 ' + esc(tr('cl_medals_weight_gold')) + '</span><span>🥈 ' + esc(tr('cl_medals_weight_silver')) + '</span><span>🥉 ' + esc(tr('cl_medals_weight_bronze')) + '</span></div><div class="cl-medals-report-table"><table><thead><tr><th>' + esc(tr('cl_medals_col_position')) + '</th><th>' + esc(tr('cl_medals_col_student')) + '</th><th>' + esc(tr('cl_medals_col_gold')) + '</th><th>' + esc(tr('cl_medals_col_silver')) + '</th><th>' + esc(tr('cl_medals_col_bronze')) + '</th><th>' + esc(tr('cl_medals_col_total')) + '</th><th>' + esc(tr('cl_medals_col_points')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div></div><footer><button type="button" class="btn-ghost" onclick="window.MWAClassList.closeMedalsReport()">' + esc(tr('close')) + '</button><button type="button" class="btn-accent" onclick="window.MWAClassList.printMedalsReport()">' + esc(tr('cl_medals_save_pdf')) + '</button></footer></section>');
        document.body.appendChild(overlay);
      }

      function closeMedalsReport() {
        var overlay = document.getElementById('clMedalsReportOverlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('mwa-print-medals-report');
      }

      function printMedalsReport() {
        document.body.classList.add('mwa-print-medals-report');
        var cleanup = function() { document.body.classList.remove('mwa-print-medals-report'); };
        globalThis.addEventListener('afterprint', cleanup, {once: true});
        globalThis.print();
        globalThis.setTimeout(cleanup, 1200);
      }
    
      /* ── cor do tempo ── */
      function timeColor(ms) {
        if (ms >= 3600000) return 'var(--green)';
        if (ms >= 900000)  return 'var(--blue)';
        return 'var(--muted)';
      }
    
      /* ── getLastAccess: date of last log entry per student ── */
      function getLastAccess(logs) {
        var m = {};
        logs.forEach(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name);
          var d = parseDate(r);
          if (!n || !d) return;
          if (!m[n] || d > m[n]) m[n] = d;
        });
        return m;
      }
    
      /* ── email do aluno ── */
      function getEmailForStudent(name, logs, grades) {
        var found = null;
        logs.some(function (r) {
          var rn = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name);
          if (rn === name && norm(r.email)) {
            found = norm(r.email);
            return true;
          }
          return false;
        });
        if (found) return found;
        (grades || []).some(function (g) {
          if (!g || g['__mwa_type__'] === 'activity_names') return false;
          var first = norm(g['First name'] || g.Nome || g.firstname || '');
          var last = norm(g['Last name'] || g.Sobrenome || g.lastname || '');
          var gname = norm(g.student_name || g.name || g.nomecompleto || g.Aluno || (first + ' ' + last));
          if (gname === name && norm(g.Email || g.email)) {
            found = norm(g.Email || g.email);
            return true;
          }
          return false;
        });
        return found || '';
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

      function getUserIdForStudent(name, email, students, logs) {
        var target = norm(name).toLowerCase();
        var targetEmail = norm(email).toLowerCase();
        var found = 0;
        (students || []).some(function (s) {
          var n = norm(s.name || s.fullname || s.nomecompleto || s.student_name).toLowerCase();
          var e = norm(s.email).toLowerCase();
          if ((target && n === target) || (targetEmail && e === targetEmail)) {
            found = parseInt(s.id || s.userid || 0, 10) || 0;
            return !!found;
          }
          return false;
        });
        if (found) return found;
        (logs || []).some(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name).toLowerCase();
          var e = norm(r.email).toLowerCase();
          if ((target && n === target) || (targetEmail && e === targetEmail)) {
            found = parseInt(r.userid || r.user_id || r.idusuario || 0, 10) || 0;
            return !!found;
          }
          return false;
        });
        return found || 0;
      }
    
      /* ── activity coverage calculation ── */
      function isCourseGeneral(name) {
        var n = norm(name);
        if (!n) return true;
        if (/^curso\s*:/i.test(n)) return true;
        if (/^sistema$/i.test(n)) return true;
        if (/^área de texto/i.test(n)) return true;
        if (/^mídia/i.test(n)) return true;
        return false;
      }
    
      /* ── dots de atividade por aluno (modo "Ver atividades") ── */
      function buildActDots(name, grades) {
        if (!grades || !grades.length) {
          return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_grades_hint')) + '</span>';
        }

        var meta = grades[0] && grades[0]['__mwa_type__'] === 'activity_names' ? grades[0] : null;
        var actNames = {};
        var actCmids = {};
        var actModules = {};
        var actAvailability = {};
        var actAvailableFrom = {};
        var actAvailableUntil = {};
        var actMaxes = {};
        var actHidden = {};
        if (meta) {
          Object.keys(meta).forEach(function (k) {
            var m = k.match(/^act_(\d+)$/);
            if (m) {
              actNames[Number(m[1])] = norm(meta[k]);
              actCmids[Number(m[1])] = Number(meta['act_cmid_' + m[1]] || 0);
              actModules[Number(m[1])] = norm(meta['act_module_' + m[1]] || '');
              actAvailability[Number(m[1])] = String(meta['act_available_' + m[1]] === undefined ? '1' : meta['act_available_' + m[1]]) !== '0';
              actAvailableFrom[Number(m[1])] = Number(meta['act_availablefrom_' + m[1]] || 0);
              actAvailableUntil[Number(m[1])] = Number(meta['act_availableuntil_' + m[1]] || 0);
              actMaxes[Number(m[1])] = Number(meta['act_max_' + m[1]] || 0);
              actHidden[Number(m[1])] = String(meta['act_hidden_' + m[1]] || '0') !== '0';
            }
          });
        }
        var wwwroot    = (Store.getConfig().wwwroot || '');

        var rawRow = null;
        grades.some(function (g) {
          if (!g || g['__mwa_type__'] === 'activity_names') return false;
          var first = norm(g['First name'] || g.Nome || g.firstname || '');
          var last = norm(g['Last name'] || g.Sobrenome || g.lastname || '');
          var gname = norm(g.student_name || g.name || g.nomecompleto || g.Aluno || (first + ' ' + last));
          if (gname.toLowerCase() === name.toLowerCase()) { rawRow = g; return true; }
          return false;
        });
        if (!rawRow) {
          return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_grade_for_student')) + '</span>';
        }

        var actGrades = {};
        var actCurrent = {};
        Object.keys(rawRow).forEach(function (k) {
          var gm = k.match(/^act_(\d+)$/);
          if (gm) {
            actGrades[gm[1]] = rawRow[k];
            return;
          }
          var cm = k.match(/^act_current_(\d+)$/);
          if (cm) {
            actCurrent[cm[1]] = Number(rawRow[k] || 0);
          }
        });
        var nowSeconds = Math.floor(Date.now() / 1000);
        var seqs      = Object.keys(actNames).length
          ? Object.keys(actNames).sort(function (a, b) { return Number(a) - Number(b); })
          : Object.keys(actGrades).sort(function (a, b) { return Number(a) - Number(b); });
        if (!seqs.length) {
          return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_activities_found')) + '</span>';
        }

        return '<div class="cl-act-dots">' + seqs.map(function (seq) {
          var key = String(seq);
          var val = actGrades[key];
          var modname = String(actModules[Number(seq)] || '').toLowerCase();
          var hasCurrentState = Object.prototype.hasOwnProperty.call(actCurrent, key);
          var currentCount = hasCurrentState ? Number(actCurrent[key] || 0) : null;
          var num = (val === null || val === undefined) ? NaN : parseFloat(String(val).replace(',', '.'));
          var isForum = modname === 'forum';
          var hasReleasedGrade = val !== null && val !== undefined && val !== '-' && val !== '' && !isNaN(num);
          var hasSubmission = hasCurrentState && currentCount > 0;
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
          var statusText = completedAndGraded
            ? tr('cl_activity_grade_released').replace('{grade}', num.toFixed(1))
            : hasSubmission
              ? tr('cl_activity_awaiting_grade')
              : unavailable
                ? tr('cl_activity_unavailable')
              : overdue
                ? tr('cl_activity_overdue')
                : tr('cl_activity_not_submitted');
          if (unavailable && actAvailableFrom[n] > nowSeconds) {
            statusText += ' · ' + tr('cl_activity_opens_on').replace('{date}', new Date(actAvailableFrom[n] * 1000).toLocaleDateString());
          }
          if (zeroWithoutSubmission) {
            statusText += ' - ' + tr('cl_activity_zero_without_submission');
          }
          if (isForum && hasSubmission) {
            statusText += ' · ' + tr(currentCount === 1 ? 'cl_forum_post_count' : 'cl_forum_posts_count')
              .replace('{count}', currentCount);
          }
          var maxPoints = Number(actMaxes[n] || 0);
          var maxText = maxPoints > 0 ? ' · ' + tr('cl_activity_max_points').replace('{points}', maxPoints.toFixed(1)) : '';
          var tooltip = esc(actName) + ' (' + esc(statusText + maxText) + ')';
          var cmid = actCmids[Number(seq)] || 0;
          var url = (cmid && modname && wwwroot)
            ? wwwroot + '/mod/' + modname + '/view.php?id=' + cmid
            : '';
          var inner = url
            ? '<a href="' + url + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:inherit;text-decoration:none;">' + seq + '</a>'
            : String(seq);
          return '<span class="cl-act-dot ' + cls + '" title="' + tooltip + '">' + inner + '</span>';
        }).join('') + '</div>';
      }

      function moduleOf(log) {
        var mod = norm(log._modtype || log.modtype || log.module || log.modname || '').toLowerCase();
        var comp = norm(log.component || log.componente || '').toLowerCase();
        if (!mod && /^mod_/.test(comp)) mod = comp.replace(/^mod_/, '');
        if (mod === 'hvp') mod = 'h5pactivity';
        if (mod === 'assignsubmission') mod = 'assign';
        if (!mod || mod === 'core' || mod === 'system') {
          if (comp === 'página' || comp === 'page') mod = 'page';
          else if (comp === 'livro' || comp === 'book') mod = 'book';
          else if (comp === 'url') mod = 'url';
          else if (comp === 'arquivo' || comp === 'file' || comp === 'recurso' || comp === 'resource') mod = 'resource';
          else if (comp === 'pasta' || comp === 'folder') mod = 'folder';
          else if (comp === 'pacote de conteúdo ims' || comp === 'ims content package' || comp === 'imscp') mod = 'imscp';
        }
        return mod;
      }

      function realContextName(log) {
        var ctx = norm(log.contextodoevento || log.eventcontext || log.context || '');
        var ev = norm(log.nomedoevento || log.eventname || log.action || '');
        var lowerCtx = ctx.toLowerCase();
        if (ctx && !isCourseGeneral(ctx) && lowerCtx !== 'course module viewed' && lowerCtx !== 'módulo do curso visualizado') {
          return ctx.replace(/^(page|página|book|livro|url|resource|recurso|file|arquivo|folder|pasta)\s*:\s*/i, '');
        }
        if (ev && !isCourseGeneral(ev) && ev.toLowerCase() !== 'course module viewed') {
          return ev;
        }
        return '';
      }

      function isResourceModule(log) {
        var mod = moduleOf(log);
        var comp = norm(log.component || log.componente || '').toLowerCase();
        if (mod === 'label' || comp.indexOf('área de mídia e texto') >= 0 ||
            comp.indexOf('area de midia e texto') >= 0 || comp.indexOf('text and media area') >= 0) {
          return false;
        }
        return mod === 'page' || mod === 'book' || mod === 'url' || mod === 'resource' ||
          mod === 'folder' || mod === 'imscp' || comp === 'página' || comp === 'page' ||
          comp === 'livro' || comp === 'book' || comp === 'url' || comp === 'arquivo' ||
          comp === 'file' || comp === 'pasta' || comp === 'folder';
      }

      function cmidOf(log) {
        var raw = log.cmid || log._cmid || log.contextinstanceid || log.contextinstance || log.coursemoduleid || log.moduleid || '';
        var cmid = parseInt(raw, 10);
        return isNaN(cmid) ? 0 : cmid;
      }

      function directResourceUrl(log) {
        return norm(log.url || log.contexturl || log.objecturl || log.link || log.viewurl || log._url || '');
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
        (activityLinks || []).forEach(function (link) {
          if (link && link.tracked === false) return;
          var available = String(link && link.available !== undefined ? link.available : '1') !== '0';
          var availableFrom = Number(link && link.availablefrom || 0);
          var availableUntil = Number(link && link.availableuntil || 0);
          var unavailable = !available || (availableFrom && availableFrom > now) ||
            (availableUntil && availableUntil < now);
          var name = norm(link.name || '');
          var cmid = cmidOf(link);
          if (!isResourceModule(link) && (!cmid || graded[cmid])) return;
          var mod = moduleOf(link);
          if (!name) return;
          var key = cmid ? 'cmid:' + cmid : 'name:' + name.toLowerCase();
          map[key] = {key: key, name: name, cmid: cmid, mod: mod, url: directResourceUrl(link),
            unavailable: unavailable, availableFrom: availableFrom, students: {}};
        });
        (logs || []).forEach(function (log) {
          var cmid = cmidOf(log);
          if (!cmid) return;
          var key = 'cmid:' + cmid;
          if (!map[key]) return;
          var mod = moduleOf(log);
          if (!map[key].url) {
            map[key].url = directResourceUrl(log);
          }
          if (!map[key].mod && mod) {
            map[key].mod = mod;
          }
          var student = norm(log.nomecompleto || log.student_name || log.userfullname || log.fullname || log.name);
          if (student) map[key].students[student.toLowerCase()] = 1;
        });
        return Object.keys(map).map(function (key) { return map[key]; })
          .sort(function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); });
      }

      function buildResourceDots(name, resources) {
        if (!resources || !resources.length) {
          return '<span class="cl-no-grades-hint">' + esc(tr('cl_no_resources_found')) + '</span>';
        }
        var studentKey = name.toLowerCase();
        var wwwroot = (Store.getConfig().wwwroot || '').replace(/\/$/, '');
        return '<div class="cl-act-dots">' + resources.map(function (res, idx) {
          var done = !!(res.students && res.students[studentKey]);
          var cls = done ? 'done' : (res.unavailable ? 'unavailable' : 'missing');
          var status = done ? tr('cl_resource_accessed') :
            (res.unavailable ? tr('cl_resource_unavailable') : tr('cl_resource_not_accessed'));
          if (!done && res.unavailable && res.availableFrom && res.availableFrom > Math.floor(Date.now() / 1000)) {
            status += ' · ' + tr('cl_activity_opens_on').replace('{date}',
              new Date(res.availableFrom * 1000).toLocaleDateString());
          }
          var tooltip = esc(res.name) + ' (' + esc(status) + ')';
          var url = res.url || ((wwwroot && res.cmid && res.mod)
            ? wwwroot + '/mod/' + encodeURIComponent(res.mod) + '/view.php?id=' + encodeURIComponent(String(res.cmid))
            : '');
          var number = String(idx + 1);
          if (url) {
            return '<a class="cl-act-dot ' + cls + '" href="' + esc(url) + '" target="_blank" rel="noopener" title="' + tooltip + '" onclick="event.stopPropagation()">' + number + '</a>';
          }
          return '<span class="cl-act-dot ' + cls + '" title="' + tooltip + '">' + number + '</span>';
        }).join('') + '</div>';
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

      function finalAcademicPercent(item) {
        var row = item && item.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var earned = Number(String(raw === null || raw === undefined ? '' : raw).trim().replace(',', '.'));
        var maximum = Number(row['Course full max (Grade)'] || 0);
        return !isNaN(earned) && maximum > 0 ? (earned / maximum) * 100 : null;
      }

      function statusInfo(score, confirmedNever, approved, academicPercent) {
        if (approved) {
          if (academicPercent !== null && academicPercent > 70) {
            return {key: 'high', cls: 'high', color: '#3aab7a', label: tr('ev_high_part', 'Alta participação')};
          }
          return {key: 'goal', cls: 'goal', color: '#2f80ed', label: tr('cl_goal_reached', 'Meta alcançada')};
        }
        if (score === 0 && confirmedNever) {
          return {key: 'never', cls: 'never', color: '#7b8496', label: tr('ev_never_access', 'Nunca acessou o Moodle')};
        }
        if (score >= 70) {
          return {key: 'high', cls: 'high', color: '#3aab7a', label: tr('ev_high_part', 'Alta participação')};
        }
        return {key: 'medium', cls: 'medium', color: '#8b72d4', label: tr('ev_med_part', 'Em progressão')};
      }

      function hasNoReleasedGrade(item) {
        var row = item && item.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var text = raw === null || raw === undefined ? '' : String(raw).trim().toLowerCase();
        return text === '' || text === '-' || text === '—' || text === 'null' || text === 'n/a';
      }

      function monitoredGradeMaximum(item) {
        var row = item && item.gradeRow || {};
        var meta = item && item.gradeMeta || {};
        var sharedReleasedMaximum = Object.keys(meta).reduce(function(total, key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return total;
          var seq = match[1];
          var released = CL_GRADE_ROWS.some(function(gradeRow) {
            var raw = String(gradeRow && gradeRow['act_' + seq] !== undefined && gradeRow['act_' + seq] !== null ? gradeRow['act_' + seq] : '').trim();
            return raw !== '' && raw !== '-' && !isNaN(parseFloat(raw.replace(',', '.')));
          });
          if (!released) return total;
          var maximum = Number(meta['act_max_' + seq] || 0);
          return total + (!isNaN(maximum) && maximum > 0 ? maximum : 0);
        }, 0);
        return sharedReleasedMaximum > 0 ? sharedReleasedMaximum : 0;
      }

      function currentPartialGradeMaximum(item) {
        return monitoredGradeMaximum(item);
      }

      function hasGradeAtOrAboveCurrentPartialTarget(item) {
        var row = item && item.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var earned = Number(String(raw === null || raw === undefined ? '' : raw).trim().replace(',', '.'));
        var maximum = currentPartialGradeMaximum(item);
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        return !isNaN(earned) && maximum > 0 && earned >= maximum * approval / 100;
      }

      function totalGradeBelowCourseThreshold(item) {
        if (hasFinalCourseApproval(item)) return false;
        if (hasTotalGradeAtOrAboveThreshold(item)) return false;
        var row = item && item.gradeRow || {};
        var meta = item && item.gradeMeta || {};
        var hasStudentGrade = Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          return !!match && gradeActivityEligibleForPartial(row, match[1]);
        });
        if (!hasStudentGrade) return false;
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var maximum = monitoredGradeMaximum(item);
        if (maximum <= 0) return false;
        var text = raw === null || raw === undefined ? '' : String(raw).trim();
        var earned = text === '' || text === '-' || text === '—' ? 0 : Number(text.replace(',', '.'));
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        var required = maximum * approval / 100;
        return !isNaN(earned) && earned < required;
      }

      function hasFinalCourseApproval(item) {
        var row = item && item.gradeRow || {};
        var fullMaximum = Number(row['Course full max (Grade)'] || 0);
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var earned = Number(String(raw === null || raw === undefined ? '' : raw).trim().replace(',', '.'));
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        var required = fullMaximum > 0 ? fullMaximum * approval / 100 : approval;
        return !isNaN(fullMaximum) && fullMaximum > 0 && !isNaN(earned) && earned >= required;
      }

      function hasReleasedActivityBelowThreshold(item) {
        var row = item && item.gradeRow || {};
        var meta = item && item.gradeMeta || {};
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          if (!gradeActivityEligibleForPartial(row, seq)) return false;
          var earned = parseFloat(String(row['act_' + seq]).trim().replace(',', '.'));
          var maximum = Number(meta['act_max_' + seq] || 0);
          return !isNaN(earned) && maximum > 0 && (earned / maximum) * 100 < approval;
        });
      }

      function hasTotalGradeAtOrAboveThreshold(item) {
        var row = item && item.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        if (raw === null || raw === undefined || String(raw).trim() === '') return false;
        var earned = Number(String(raw).trim().replace(',', '.'));
        var maximum = monitoredGradeMaximum(item);
        var approval = Number((Store.getConfig() || {}).approvalgrade) || 60;
        var required = maximum > 0 ? maximum * approval / 100 : approval;
        return !isNaN(earned) && earned >= required;
      }

      function hasHighlightGradeAtLeast60(item) {
        var row = item && item.gradeRow || {};
        var raw = row['Course total (Grade)'];
        if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
          raw = item && item.calc && item.calc.grade;
        }
        var earned = Number(String(raw === null || raw === undefined ? '' : raw).trim().replace(',', '.'));
        var maximum = monitoredGradeMaximum(item);
        if (isNaN(earned)) return false;
        return maximum > 0 ? (earned / maximum) * 100 >= 60 : earned >= 60;
      }

      function gradeActivityDone(row, seq, mod) {
        var currentKey = 'act_current_' + seq;
        var hasCurrent = Object.prototype.hasOwnProperty.call(row || {}, currentKey);
        var current = hasCurrent ? Number(row[currentKey] || 0) : null;
        var raw = String(row && row['act_' + seq] !== undefined && row['act_' + seq] !== null ? row['act_' + seq] : '').trim();
        var grade = parseFloat(raw.replace(',', '.'));
        var hasPositiveGrade = raw !== '' && raw !== '-' && !isNaN(grade) && grade > 0;
        if (hasCurrent) return current > 0 || hasPositiveGrade;
        return hasPositiveGrade;
      }

      function gradeActivityEligibleForPartial(row, seq) {
        var raw = String(row && row['act_' + seq] !== undefined && row['act_' + seq] !== null ? row['act_' + seq] : '').trim();
        var grade = parseFloat(raw.replace(',', '.'));
        return raw !== '' && raw !== '-' && !isNaN(grade);
      }

      function hasAwaitingGrade(item) {
        var row = item && item.gradeRow || {};
        var meta = item && item.gradeMeta || {};
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var module = norm(meta['act_module_' + seq] || '').toLowerCase();
          if (['assign', 'assignment', 'forum', 'workshop', 'data', 'database', 'glossary'].indexOf(module) === -1) return false;
          var current = Number(row['act_current_' + seq] || 0);
          if (current <= 0) return false;
          var rawGrade = row['act_' + seq];
          var hasGrade = rawGrade !== null && rawGrade !== undefined &&
            String(rawGrade).trim() !== '' && String(rawGrade).trim() !== '-';
          var submittedAt = Number(row['act_submissiontime_' + seq] || 0);
          var gradedAt = Number(row['act_gradetime_' + seq] || 0);
          var resubmitted = submittedAt > 0 && gradedAt > 0 && submittedAt > gradedAt;
          return !hasGrade || resubmitted;
        });
      }

      function gradeActivityExpiredForPartial(item, meta, seq, mod) {
        var row = item && item.gradeRow || {};
        var closedAt = Number(meta['act_availableuntil_' + seq] || 0);
        var availableFrom = Number(meta['act_availablefrom_' + seq] || 0);
        var enrolled = Number(item && item.enrolmentCreated || row._enrolment_created || 0);
        var now = Math.floor(Date.now() / 1000);
        if (!closedAt || closedAt >= now || (enrolled && enrolled > closedAt) ||
            (availableFrom && availableFrom > closedAt)) return false;
        return !gradeActivityDone(row, seq, mod);
      }

      function trackedActivity(meta, seq) {
        var cmid = Number(meta['act_cmid_' + seq] || 0);
        var name = norm(meta['act_' + seq] || '').toLowerCase();
        var matched = null;
        (Store.getConfig().activitylinks || []).some(function(link) {
          var linkCmid = cmidOf(link);
          var same = (cmid && linkCmid === cmid) || (!cmid && name && norm(link && link.name).toLowerCase() === name);
          if (same) { matched = link; return true; }
          return false;
        });
        return !matched || matched.tracked !== false;
      }

      function hasOverdueDelivery(item, grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var row = item && item.gradeRow;
        if (!meta || !row) return false;
        var now = Math.floor(Date.now() / 1000);
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var closedAt = Number(meta['act_availableuntil_' + seq] || 0);
          if (!closedAt || closedAt >= now) return false;
          return !gradeActivityDone(row, seq, norm(meta['act_module_' + seq] || '').toLowerCase());
        });
      }

      function hasOpenPendingActivity(item, grades) {
        var meta = grades && grades[0] && grades[0].__mwa_type__ === 'activity_names' ? grades[0] : null;
        var row = item && item.gradeRow;
        if (!meta || !row) return false;
        var now = Math.floor(Date.now() / 1000);
        return Object.keys(meta).some(function(key) {
          var match = key.match(/^act_(\d+)$/);
          if (!match) return false;
          var seq = match[1];
          var available = String(meta['act_available_' + seq] === undefined ? '1' : meta['act_available_' + seq]) !== '0';
          var from = Number(meta['act_availablefrom_' + seq] || 0);
          var until = Number(meta['act_availableuntil_' + seq] || 0);
          var open = available && (!from || from <= now) && (!until || until >= now);
          return open && trackedActivity(meta, seq) && !gradeActivityDone(row, seq, norm(meta['act_module_' + seq] || '').toLowerCase());
        });
      }

      function availableCourseContent(grades) {
        var now = Math.floor(Date.now() / 1000);
        var links = Store.getConfig().activitylinks || [];
        if (links.some(function(link) {
          if (link && link.tracked === false) return false;
          var available = String(link && link.available !== undefined ? link.available : '1') !== '0';
          var from = Number(link && link.availablefrom || 0);
          var until = Number(link && link.availableuntil || 0);
          return available && (!from || from <= now) && (!until || until >= now);
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

      function followUpReasons(item, grades) {
        if (!item || item.confirmedNever) return [];
        var reasons = [];
        if (hasOverdueDelivery(item, grades)) {
          reasons.push({icon: 'clipboard', tone: 'overdue', label: tr('cl_followup_overdue', 'Entrega atrasada')});
        }
        if (Number(item.daysWithoutAccess || 0) >= 7 && availableCourseContent(grades)) {
          reasons.push({icon: 'clock', tone: 'inactive', label: tr('cl_followup_inactive', 'Sem participação há 7 dias ou mais')});
        }
        if (totalGradeBelowCourseThreshold(item)) {
          reasons.push({icon: 'trend-down', tone: 'grade', label: tr('cl_followup_grade', 'Aproveitamento parcial abaixo de 60%').replace('60', Number((Store.getConfig() || {}).approvalgrade) || 60)});
        }
        return reasons;
      }

      function interventionIndicatorHtml(studentName) {
        if (!window.MWAInterventions || !window.MWAInterventions.getData) return '';
        var wanted = norm(studentName).toLowerCase();
        var records = (window.MWAInterventions.getData() || []).filter(function(record) {
          return norm(record && record.student_name).toLowerCase() === wanted;
        }).sort(function(a, b) {
          return Number((b && (b.timesent || b.timecreated)) || 0) - Number((a && (a.timesent || a.timecreated)) || 0);
        });
        if (!records.length) return '';
        var latest = records[0] || {};
        var timestamp = Number(latest.timesent || latest.timecreated || 0);
        var date = timestamp > 0 ? fmtDate(new Date(timestamp * 1000)) : '—';
        var reason = norm(latest.snapshot_reason || latest.snapshot_situation || latest.intervention_reason || '—');
        var tooltip = tr('cl_interventions_sent', '{count} intervenções enviadas').replace('{count}', records.length)
          + '\n' + tr('cl_intervention_last', 'Última: {date}').replace('{date}', date)
          + '\n' + tr('cl_intervention_reason', 'Motivo: {reason}').replace('{reason}', reason);
        return '<button type="button" class="cl-followup-reason intervention" data-student="' + esc(studentName) + '"'
          + ' title="' + esc(tooltip) + '" aria-label="' + esc(tooltip) + '"'
          + ' onclick="event.stopPropagation();window.MWAClassList&&window.MWAClassList.openInterventionHistory(this)">'
          + '<span aria-hidden="true">&#128172;</span></button>';
      }

      function followUpReasonHtml(reasons, interventionHtml) {
        reasons = reasons || [];
        if (!reasons.length && !interventionHtml) return '';
        return '<span class="cl-followup-reasons">' + reasons.map(function(reason) {
          return '<span class="cl-followup-reason ' + esc(reason.tone) + '" title="' + esc(reason.label) +
            '" aria-label="' + esc(reason.label) + '">' + icon(reason.icon) + '</span>';
        }).join('') + (interventionHtml || '') + '</span>';
      }

      function detChip(icon, label, tone) {
        return '<span class="cl-det-chip ' + esc(tone || 'slate') + '"><span>' + icon + '</span>' + esc(label) + '</span>';
      }

      function determinantHtml(item) {
        var calc = item.calc || {};
        var chips = [];
        if (item.status.key === 'never') {
          chips.push(detChip('&#128683;', tr('ev_never_access', 'Nunca acessou o Moodle'), 'red'));
          chips.push(detChip(icon('warning'), tr('ev_det_at_risk', 'Em risco'), 'red'));
          return chips.join('');
        }
        if (calc.interactions > 0 && calc.interactions < 3) {
          chips.push(detChip(icon('bolt'), tr('ev_det_low_activity', 'Poucas interações'), 'amber'));
        }
        if (item.hasOpenPending) {
          chips.push(detChip('&#128221;', tr('ev_det_pending_activities', 'Atividades pendentes'), 'blue'));
        }
        if (item.hasOverdue) {
          chips.push(detChip(icon('warning'), tr('ev_det_overdue_activities', 'Atividades vencidas'), 'red'));
        }
        return chips.join('');
      }

      function tagChip(icon, label, cls) {
        label = String(label || '').replace(/^[^\wÀ-ÿ]+/u, '').trim();
        return '<span class="cl-study-chip ' + esc(cls || 'slate') + '"><span class="cl-study-icon">' + icon + '</span><span>' + esc(label) + '</span></span>';
      }

      function buildStudyTags(name, logs, item) {
        var buckets = { dawn: 0, morning: 0, afternoon: 0, night: 0 };
        if (!item || !item.count || item.score <= 0) {
          return '';
        }
        logs.forEach(function (r) {
          var n = norm(r.nomecompleto || r.student_name || r.userfullname || r.fullname || r.name);
          var d;
          var h;
          if (n !== name) return;
          d = parseDate(r);
          if (!d) return;
          h = d.getHours();
          if (h >= 0 && h < 6) buckets.dawn++;
          else if (h < 12) buckets.morning++;
          else if (h < 18) buckets.afternoon++;
          else buckets.night++;
        });
        var peak = 'diurno';
        var peakCount = Math.max(buckets.dawn, buckets.morning, buckets.afternoon, buckets.night);
        if (peakCount <= 0) {
          return '';
        }
        if (peakCount > 0) {
          if (buckets.night === peakCount || buckets.dawn === peakCount) peak = 'noturno';
          else if (buckets.afternoon === peakCount) peak = 'vespertino';
        }
        if (peak === 'noturno') {
          return tagChip('&#127769;', tr('pl_tag_night', 'Noturno'), 'noturno');
        }
        if (peak === 'vespertino') {
          return tagChip('&#127780;', tr('pl_tag_afternoon', 'Vespertino'), 'vespertino');
        }
        return tagChip(icon('sun'), tr('pl_tag_daytime', 'Diurno'), 'diurno');
      }

      function renderClassKpis(items) {
        var box = document.getElementById('clKpiRow');
        if (!box) return;
        var counts = {never: 0, followup: 0, medium: 0, goal: 0, high: 0};
        var total = Math.max(items.length, 1);
        var courseId = (Store.getConfig() || {}).courseid || 0;
        var trendKey = 'mwa_class_kpi_counts_' + courseId;
        var savedTrend = null;
        var savedStamp = '';
        try {
          var raw = JSON.parse(window.localStorage.getItem(trendKey) || 'null');
          if (raw && raw.counts) {
            savedTrend = raw.counts;
            savedStamp = raw.day || '';
          }
        } catch (e) {
          savedTrend = null;
          savedStamp = '';
        }
        items.forEach(function (item) {
          if (item.followup) {
            counts.followup++;
          } else {
            counts[item.status.key]++;
          }
        });
        var cards = [
          ['never', '&#128683;', tr('ev_never_access', 'Nunca acessou o Moodle'), counts.never, 'never', tr('cl_kpi_tip_never', 'Alunos com 0% de participação, sem acesso registrado no Moodle.'), true],
          ['followup', '<span class="cl-stage-dot" aria-hidden="true"></span>', tr('attention', 'Em acompanhamento'), counts.followup, 'followup', tr('ac_tip_students_attention', 'Alunos com acesso registrado e aproveitamento de até 10%.'), true],
          ['medium', '<span class="cl-stage-dot" aria-hidden="true"></span>', tr('ev_med_part', 'Em progressão'), counts.medium, 'medium', tr('cl_kpi_tip_medium', 'Alunos que iniciaram o curso e avançam normalmente, sem motivos ativos de acompanhamento.'), false],
          ['goal', '<span class="cl-stage-dot" aria-hidden="true"></span>', tr('cl_goal_reached', 'Meta alcançada'), counts.goal, 'goal', tr('cl_kpi_tip_goal', 'Alunos que atingiram a nota mínima do curso, mesmo que ainda tenham itens pendentes.'), false],
          ['high', '<span class="cl-stage-dot" aria-hidden="true"></span>', tr('ev_high_part', 'Alta participação'), counts.high, 'high', tr('cl_kpi_tip_high', 'Alunos com aproveitamento acadêmico acima de 70% da pontuação final do curso.'), false]
        ];
        /* First visit for this course: compare against an empty class, so each
           card reports its starting population (e.g. 1 student in "high" -> +1).
           From the next day on, the stored snapshot provides the real baseline. */
        var previousCounts = savedTrend || {never: 0, followup: 0, medium: 0, goal: 0, high: 0};
        Store.renderHtml(box, cards.map(function (c) {
          var pct = Math.round((c[3] / total) * 100);
          var chip = classKpiDeltaChip(c[0], counts[c[0]], previousCounts[c[0]], c[6]);
          return '<button type="button" class="cl-kpi-card ' + c[4] + '" data-cl-filter="' + c[0] + '">'
            + '<span class="cl-kpi-trend-wrap">' + chip + '</span>'
            + '<span class="cl-kpi-head"><span class="cl-kpi-icon" aria-hidden="true">' + c[1] + '</span><span class="cl-kpi-title">' + esc(c[2]) + helpTip(c[5]) + '</span></span>'
            + '<strong>' + pct + '%</strong>'
            + '<span class="cl-kpi-pct">' + c[3] + ' ' + esc(c[3] === 1 ? tr('student', 'estudante') : tr('students', 'estudantes')) + '</span>'
            + '</button>';
        }).join(''));
        /* Only refresh the baseline once per day, so the chip means "change since
           the previous day" instead of resetting to zero on every re-render. */
        try {
          var today = new Date().toISOString().slice(0, 10);
          if (savedStamp !== today) {
            window.localStorage.setItem(trendKey, JSON.stringify({day: today, counts: counts}));
          }
        } catch (e) {}
      }
      function renderClassFilters(items, filtered) {
        var box = document.getElementById('clFilterBar');
        if (!box) return;
        var filters = [
          ['all', tr('ev_all', 'Todos')],
          ['never', tr('ev_never_access', 'Nunca acessou o Moodle')],
          ['below60', 'Aproveitamento parcial abaixo de 60%'],
          ['engaged', tr('cl_filter_engaged', 'Com engajamento')],
          ['interactions', tr('with_course_activity', 'Com Interações')],
          ['followup', tr('attention', 'Em acompanhamento')],
          ['overdue', tr('cl_followup_overdue', 'Entrega atrasada')],
          ['inactive', tr('cl_followup_inactive', 'Sem participação há 7 dias ou mais')],
          ['medium', tr('ev_med_part', 'Em progressão')],
          ['goal', tr('cl_goal_reached', 'Meta alcançada')],
          ['high', tr('ev_high_part', 'Alta participação')]
        ];
        Store.renderHtml(box, filters.map(function (f) {
            return '<option value="' + f[0] + '"' + (CL_FILTER === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>';
          }).join(''));
      }

      function renderClassPagination(totalItems) {
        var box = document.getElementById('clPagination');
        if (!box) return;
        if (!totalItems) {
          Store.renderHtml(box, '');
          return;
        }
        var totalPages = Math.max(1, Math.ceil(totalItems / CL_PAGE_SIZE));
        CL_PAGE = Math.max(1, Math.min(CL_PAGE, totalPages));
        var first = ((CL_PAGE - 1) * CL_PAGE_SIZE) + 1;
        var last = Math.min(totalItems, CL_PAGE * CL_PAGE_SIZE);
        var startPage = Math.max(1, CL_PAGE - 2);
        var endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        function pageButton(page, label, disabled, active) {
          return '<button type="button" class="cl-page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : '') + '"'
            + (disabled ? ' disabled' : '') + ' onclick="window.MWAClassList.goPage(' + page + ')">' + label + '</button>';
        }
        var buttons = pageButton(CL_PAGE - 1, '&#8249;', CL_PAGE <= 1, false);
        for (var page = startPage; page <= endPage; page++) {
          buttons += pageButton(page, String(page), false, page === CL_PAGE);
        }
        buttons += pageButton(CL_PAGE + 1, '&#8250;', CL_PAGE >= totalPages, false);
        var sizes = [5, 10, 20, 50].map(function(size) {
          return '<option value="' + size + '"' + (size === CL_PAGE_SIZE ? ' selected' : '') + '>' + size + '</option>';
        }).join('');
        Store.renderHtml(box, '<div class="cl-pag-info">' + esc(tr('cl_pag_showing', 'Mostrando {first} a {last} de {total} estudantes')
            .replace('{first}', first).replace('{last}', last).replace('{total}', totalItems)) + '</div>'
          + '<div class="cl-pag-pages">' + buttons + '</div>'
          + '<label class="cl-pag-size">' + esc(tr('cl_pag_items_per_page', 'Itens por página:')) + ' <select onchange="window.MWAClassList.setPageSize(this.value)">' + sizes + '</select></label>');
      }

      function assignWeeklyAchievements(items, logs) {
        var byStudent = {};
        var weeks = {};
        items.forEach(function(item) {
          item.achievements = {gold: 0, silver: 0, bronze: 0, total: 0, history: []};
          byStudent[norm(item.name).toLowerCase()] = item;
        });
        (logs || []).forEach(function(row) {
          var name = norm(row.nomecompleto || row.student_name || row.userfullname || row.fullname || row.name);
          var item = byStudent[name.toLowerCase()];
          var date = parseDate(row);
          if (!item || !date) return;
          var start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          var day = (start.getDay() + 6) % 7;
          start.setDate(start.getDate() - day);
          var key = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
          weeks[key] = weeks[key] || {start: start, students: {}};
          var stat = weeks[key].students[item.name] || {events: 0, academic: 0, days: {}};
          stat.events++;
          stat.days[date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate()] = true;
          var component = norm(row.componente || row.component || row._modtype).toLowerCase();
          if (component && component !== 'core' && component !== 'system') stat.academic++;
          weeks[key].students[item.name] = stat;
        });
        var previous = {};
        Object.keys(weeks).sort().forEach(function(key) {
          var week = weeks[key];
          var ranked = Object.keys(week.students).map(function(name) {
            var stat = week.students[name];
            var activeDays = Object.keys(stat.days).length;
            var score = stat.events + (stat.academic * 2) + (activeDays * 3);
            return {name: name, score: score, improvement: score - Number(previous[name] || 0), activeDays: activeDays, events: stat.events};
          });
          function award(type, candidate) {
            var student = candidate && byStudent[norm(candidate.name).toLowerCase()];
            if (!student) return;
            var data = student.achievements;
            data[type]++;
            data.total++;
            data.history.push({type: type, week: week.start.toLocaleDateString('pt-BR'), score: candidate.score});
          }
          var used = {};
          ranked.sort(function(a, b) { return b.score - a.score || b.activeDays - a.activeDays || a.name.localeCompare(b.name, 'pt-BR'); });
          var gold = ranked[0];
          if (gold) { award('gold', gold); used[gold.name] = true; }
          var silver = ranked.filter(function(candidate) { return !used[candidate.name]; }).sort(function(a, b) {
            return b.improvement - a.improvement || b.score - a.score || a.name.localeCompare(b.name, 'pt-BR');
          })[0];
          if (silver) { award('silver', silver); used[silver.name] = true; }
          var bronze = ranked.filter(function(candidate) { return !used[candidate.name]; }).sort(function(a, b) {
            return b.activeDays - a.activeDays || b.events - a.events || a.name.localeCompare(b.name, 'pt-BR');
          })[0];
          if (bronze) award('bronze', bronze);
          ranked.forEach(function(candidate) { previous[candidate.name] = candidate.score; });
        });
      }

      function buildStudentDetail(item, activityProgressHtml, resourceProgressHtml, detailId) {
        var calc = item.calc || {};
        var currentGrade = calc.grade === null || calc.grade === undefined ? null : Number(calc.grade);
        if (currentGrade !== null && isNaN(currentGrade)) currentGrade = null;
        var gradeText = currentGrade === null ? '\u2014' : currentGrade.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
        var gradeColor = currentGrade === null ? 'var(--muted)' : hasGradeAtOrAboveCurrentPartialTarget(item) ? 'var(--green)' : 'var(--red)';
        var lastText = item.lastAccess ? fmtDate(item.lastAccess) : '—';
        var daysText = item.status.key === 'never' ? tr('ev_never_access', 'Nunca acessou o Moodle') : Number(item.daysWithoutAccess || 0) + 'd';
        var interventionData = window.MWAInterventions && window.MWAInterventions.getData ? window.MWAInterventions.getData() : [];
        var hasIntervention = interventionData.some(function(record) { return norm(record.student_name).toLowerCase() === norm(item.name).toLowerCase(); });
        var interventionStats = window.MWAInterventions && window.MWAInterventions.getStudentStats
          ? window.MWAInterventions.getStudentStats(item.name) : {total: 0, ongoing: 0};
        var picture = norm(item.picture || '');
        var initials = norm(item.name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) { return word[0]; }).join('').toUpperCase();
        var ci = Math.abs((item.name.charCodeAt(0) || 0) + (item.name.charCodeAt(1) || 0)) % AV_COLORS.length;
        var avatarBg = AV_COLORS[ci];
        var avatarHtml = '<div class="cl-detail-avatar' + (picture ? ' has-img' : '') + '" style="background:' + avatarBg + ';">'
          + (picture ? '<img src="' + esc(picture) + '" alt="' + esc(item.name) + '" loading="lazy">' : esc(initials))
          + '</div>';
        return '<div class="cl-detail-panel">'
          + '<div class="cl-detail-top">'
            + avatarHtml
            + '<div class="cl-detail-main">'
              + '<div class="cl-detail-name-row"><strong>' + esc(item.name) + '</strong></div>'
              + '<button type="button" class="cl-achievement-summary" data-detail-id="' + esc(detailId) + '" onclick="event.stopPropagation();window.MWAClassList&&window.MWAClassList.openAchievements(this)"><span aria-hidden="true">&#127941;</span> ' + Number(item.achievements && item.achievements.total || 0) + ' ' + esc(tr('cl_achievements', 'conquistas')) + '</button>'
            + '</div>'
            + '<div class="cl-detail-top-actions">'
              + '<button class="btn-ghost mwa-card-action is-report cl-report-btn" data-student="' + esc(item.name) + '" type="button"' + (hasIntervention ? '' : ' hidden') + ' onclick="window.MWATeacherFeedback&&window.MWATeacherFeedback.openIndividualReport(\'' + esc(item.name) + '\');event.stopPropagation()">' + icon('chart') + ' ' + esc(tr('tf_ir_open', 'Relatório de evolução')) + '</button>'
              + '<button class="btn-ghost mwa-card-action is-primary cl-grades-detail-btn" data-student="' + esc(item.name) + '" type="button" onclick="event.stopPropagation();window.MWAClassList&&window.MWAClassList.openGrades(this)">' + icon('clipboard') + ' ' + esc(tr('cl_view_grades', 'Ver notas')) + '</button>'
            + '</div>'
          + '</div>'
          + '<div class="cl-detail-grid">'
            + '<div><span>' + esc(tr('cl_th_days_without', 'Days without access')) + '</span><strong>' + esc(daysText) + '</strong></div>'
            + '<div><span>' + esc(tr('ev_active_days', 'Dias ativos')) + '</span><strong>' + (calc.activeDays || 0) + '</strong></div>'
            + '<div><span>' + esc(tr('cl_th_last_access', 'Último acesso')) + '</span><strong>' + esc(lastText) + '</strong></div>'
            + '<div><span>' + esc(tr('interactions', 'Interações')) + '</span><strong>' + item.count + '</strong></div>'
            + '<button type="button" class="cl-detail-interventions" data-student="' + esc(item.name) + '"' + (interventionStats.total ? '' : ' disabled aria-disabled="true"') + ' onclick="event.stopPropagation();window.MWAClassList&&window.MWAClassList.openInterventionHistory(this)"><span>' + esc(tr('student_interventions_received', 'Intervenções recebidas')) + '</span><strong>' + interventionStats.total + '</strong><small>' + esc(tr('student_interventions_ongoing', '{count} em acompanhamento').replace('{count}', interventionStats.ongoing)) + '</small></button>'
            + '<div><span>' + esc(tr('sp_kpi_grade', 'Nota atual')) + '</span><strong style="color:' + gradeColor + ';">' + esc(gradeText) + '</strong></div>'
          + '</div>'
          + '<div class="cl-detail-progress-grid">'
            + '<div><h4>' + esc(tr('cl_th_activity_progress', 'Progresso por atividade com nota')) + '</h4>' + activityProgressHtml + '</div>'
            + '<div><h4>' + esc(tr('cl_th_resource_progress', 'Progresso por conteúdo')) + '</h4>' + resourceProgressHtml + '</div>'
          + '</div>'
          + '<div class="ai-box cl-ai-box">'
            + '<div class="ai-box-title">&#10022; ' + esc(tr('ev_ai_title', 'Análise & Recomendação IA')) + '</div>'
            + '<div id="clai' + esc(detailId) + '"><div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>'
            + '<span style="margin-left:.5rem;font-size:.78rem;color:var(--muted);">' + esc(tr('ev_ai_hint', 'Clique em "Gerar Recomendação IA" para analisar este aluno.')) + '</span></div>'
            + '</div>'
            + '<div class="cl-ai-actions"><button class="btn-accent cl-ai-generate-btn" type="button" onclick="window.MWAClassList&&window.MWAClassList.genAI(\'' + esc(detailId) + '\');event.stopPropagation()">&#10022; ' + esc(tr('ev_gen_ai', 'Gerar Recomendação IA')) + '</button></div>'
          + '</div>'
          + '<div class="cl-detail-actions">'
            + '<button class="btn-ghost mwa-card-action is-primary cl-profile-detail-btn" data-student="' + esc(item.name) + '" type="button" onclick="event.stopPropagation();window.MWAClassList&&window.MWAClassList.openProfile(this)">' + icon('user') + ' ' + esc(tr('cl_view_individual_profile', 'Ver perfil individual')) + '</button>'
            + '<button class="btn-ghost mwa-card-action is-primary" type="button" onclick="window.MWAInterventions&&window.MWAInterventions.quickMessage(\'' + esc(item.name) + '\',\'' + esc(item.email || '') + '\',' + (item.userid || 0) + ',\'\');event.stopPropagation()">' + icon('mail') + ' ' + esc(tr('message')) + '</button>'
            + '<button class="btn-ghost cl-detail-inline-close" type="button">' + esc(tr('close', 'Fechar')) + '</button>'
          + '</div>'
        + '</div>';
      }
    
      /* ════════════════════════════════════════════
         RENDER PRINCIPAL
      ════════════════════════════════════════════ */
      function toggleClassListView() {
        CL_VIEW = CL_VIEW === 'participation' ? 'activities' : 'participation';
        var btn = document.getElementById('clToggleBtn');
        if (btn) {
          btn.textContent = CL_VIEW === 'activities'
            ? icon('chart') + ' ' + tr('cl_view_participation')
            : icon('clipboard') + ' ' + tr('cl_view_activities');
          btn.classList.toggle('active', CL_VIEW === 'activities');
        }
        renderClassListUnified();
      }
    
      /* ── Filtro de busca (cliente, sem re-render) ── */
      function renderClassListUnified() {
        var dash = window.MWADashboard || {};
        var state = dash.state || {};
        var logs = state.logs || [];
        var grades = state.grades || [];
        CL_GRADE_ROWS = grades.filter(function(row) {
          return row && row.__mwa_type__ !== 'activity_names';
        });
        var allNames = getAllStudentNames(logs, grades, state.students || []);
        var tb = document.getElementById('clTableBody');
        if (!tb) return;
        if (!allNames.length) {
          CL_EXPORT_ITEMS = [];
          Store.renderHtml(tb, '<tr><td colspan="9" class="cl-empty">' + esc(tr('no_data')) + '</td></tr>');
          updateClassBulkAction();
          var emptyPagination = document.getElementById('clPagination');
          if (emptyPagination) Store.renderHtml(emptyPagination, '');
          return;
        }

        var sessionTimes = calcSessionTimes(logs);
        var activityLinks = (Store.getConfig().activitylinks || []);
        var resources = buildResourceCatalog(logs, activityLinks, grades);
        var sortMode = (document.getElementById('clSort') || {}).value || 'interactions';
        var entries = allNames.map(function (n) {
          var email = getEmailForStudent(n, logs, grades);
          var calc = EngagementCalc.calculateForStudent(n, email, logs, grades);
          var score = Math.round(calc.score || 0);
          var matchedStudent = (state.students || []).find(function (student) {
            var sameEmail = email && norm(student.email).toLowerCase() === norm(email).toLowerCase();
            var sameName = norm(student.name || student.fullname).toLowerCase() === norm(n).toLowerCase();
            return sameEmail || sameName;
          }) || null;
          var rosterStudent = matchedStudent || {};
          var directGradeRow = exportGradeRow(n, grades);
          var gradeMeta = (grades || []).find(function(row) {
            return row && row.__mwa_type__ === 'activity_names';
          }) || null;
          var calculatedDays = calc.daysWithoutAccess;
          var daysWithoutAccess = calculatedDays === null || calculatedDays === undefined || isNaN(Number(calculatedDays))
            ? Number(rosterStudent.daysWithoutAccess || 0)
            : Number(calculatedDays);
          var lastAccess = calc.last || rosterStudent.last || null;
          var moodleLastAccess = Number(rosterStudent.moodleLastAccess || 0);
          if (moodleLastAccess > 0) {
            var moodleLastDate = new Date(moodleLastAccess * 1000);
            if (!lastAccess || moodleLastDate > lastAccess) lastAccess = moodleLastDate;
            daysWithoutAccess = Math.max(0, Math.floor((Date.now() - moodleLastDate.getTime()) / 86400000));
          }
          var confirmedNever = matchedStudent
            ? Number(rosterStudent.moodleLastAccess || 0) === 0 && !rosterStudent.last
            : Number(calc.interactions || 0) === 0 && !calc.last;
          // Access has absolute precedence over grades and administrative events.
          // A grade (including zero), enrolment, group assignment or teacher grading
          // action may affect the student, but it does not prove that the student
          // accessed Moodle. Keep the learner in Never accessed until Moodle records
          // a real access timestamp for that learner.
          if (confirmedNever) score = 0;
          var item = {
            name: n,
            email: email,
            userid: getUserIdForStudent(n, email, state.students || [], logs),
            pictureurl: norm(rosterStudent.pictureurl || rosterStudent.profileimageurl || ''),
            count: calc.interactions || 0,
            calc: calc,
            score: score,
            gradeRow: rosterStudent.gradeRow || (Object.keys(directGradeRow).length ? directGradeRow : null),
            gradeMeta: gradeMeta,
            daysWithoutAccess: daysWithoutAccess,
            lastAccess: lastAccess,
            enrolmentCreated: Number(rosterStudent.enrolmentCreated || 0),
            hasCourseActivity: !confirmedNever && (Number(calc.interactions || rosterStudent.interactions || 0) > 0 ||
              !!rosterStudent.hasAcademicEvidence),
            confirmedNever: confirmedNever,
            studyTags: ''
          };
          item.approved = hasFinalCourseApproval(item);
          item.status = statusInfo(score, item.confirmedNever, item.approved, finalAcademicPercent(item));
          item.hasOverdue = hasOverdueDelivery(item, grades);
          item.hasOpenPending = hasOpenPendingActivity(item, grades);
          item.awaitingGrade = hasAwaitingGrade(item);
          item.followupReasons = followUpReasons(item, grades);
          // Approved students retain the informational reason icons, but those
          // reasons no longer place them in follow-up.
          item.followup = !item.approved && item.followupReasons.length > 0;
          item.effectiveStatusKey = item.followup ? 'followup' : item.status.key;
          var evaluation = ActionCenter.evaluateStudent(item);
          item.approved = evaluation.approved;
          item.followup = evaluation.followup;
          item.followupReasons = evaluation.reasons;
          item.effectiveStatusKey = evaluation.key;
          item.status = {key:evaluation.key,cls:evaluation.key,label:evaluation.label,
            color:({high:'#3aab7a',goal:'#2f80ed',never:'#7b8496',followup:'#c98a2a',medium:'#8b72d4'})[evaluation.key]};
          item.below60 = !item.confirmedNever && evaluation.below;
          item.studyTags = buildStudyTags(n, logs, item);
          return item;
        });

        assignWeeklyAchievements(entries, logs);
        CL_ALL_ITEMS = entries.slice();

        CL_FOLLOWUP_ITEMS = entries.filter(function(item) {
          return item.followup;
        }).map(function(item) {
          return {
            name: item.name,
            email: item.email,
            userid: item.userid,
            score: item.score,
            pictureurl: item.pictureurl,
            followupReasons: (item.followupReasons || []).map(function(reason) {
              return {tone: reason.tone, label: reason.label};
            })
          };
        });

        renderClassKpis(entries);
        var term = (CL_SEARCH || '').toLowerCase().trim();
        var accessFrom = CL_ACCESS_FROM ? new Date(CL_ACCESS_FROM + 'T00:00:00') : null;
        var accessTo = CL_ACCESS_TO ? new Date(CL_ACCESS_TO + 'T23:59:59.999') : null;
        var filtered = entries.filter(function (e) {
          var statusMatch = CL_FILTER === 'all' ||
            (CL_FILTER === 'engaged' ? e.score > 0 :
              CL_FILTER === 'interactions' ? e.hasCourseActivity :
                CL_FILTER === 'followup' ? e.followup :
                  CL_FILTER === 'awaitinggrade' ? e.awaitingGrade :
                  CL_FILTER === 'attentiontoday' ? (!!CL_ATTENTION_STUDENTS.ids[Number(e.userid || 0)] || !!CL_ATTENTION_STUDENTS.names[norm(e.name).toLowerCase()]) :
                  CL_FILTER === 'overdue' ? (e.followupReasons || []).some(function(reason) { return reason.tone === 'overdue'; }) :
                    CL_FILTER === 'inactive' ? (e.followupReasons || []).some(function(reason) { return reason.tone === 'inactive'; }) :
                      (CL_FILTER === 'grade' || CL_FILTER === 'below60') ? e.below60 :
                  CL_FILTER === e.effectiveStatusKey);
          var searchMatch = !term || e.name.toLowerCase().indexOf(term) !== -1 || (e.email || '').toLowerCase().indexOf(term) !== -1;
          var accessMatch = !accessFrom && !accessTo || (e.lastAccess instanceof Date && !isNaN(e.lastAccess.getTime()) &&
            (!accessFrom || e.lastAccess >= accessFrom) && (!accessTo || e.lastAccess <= accessTo));
          return statusMatch && searchMatch && accessMatch;
        });
        renderClassFilters(entries, filtered);

        filtered.sort(function (a, b) {
          switch (sortMode) {
            case 'alpha':
              return a.name.localeCompare(b.name, 'pt-BR');
            case 'risk':
              return a.score - b.score || a.name.localeCompare(b.name, 'pt-BR');
            case 'grade':
              var gradeA = a.calc && a.calc.grade !== null && a.calc.grade !== undefined
                ? Number(a.calc.grade) : null;
              var gradeB = b.calc && b.calc.grade !== null && b.calc.grade !== undefined
                ? Number(b.calc.grade) : null;
              if (gradeA !== null && isNaN(gradeA)) gradeA = null;
              if (gradeB !== null && isNaN(gradeB)) gradeB = null;
              if (gradeA === null && gradeB === null) return a.name.localeCompare(b.name, 'pt-BR');
              if (gradeA === null) return 1;
              if (gradeB === null) return -1;
              return gradeB - gradeA || a.name.localeCompare(b.name, 'pt-BR');
            case 'participation':
              return b.score - a.score;
            case 'time':
              return (sessionTimes[b.name] || 0) - (sessionTimes[a.name] || 0);
            default:
              return b.count - a.count;
          }
        });

        CL_EXPORT_ITEMS = filtered.slice();
        CL_EXPORT_SESSION_TIMES = sessionTimes;
        CL_EXPORT_GRADES = grades;
        CL_EXPORT_RESOURCES = resources;

        var totalFiltered = filtered.length;
        var totalPages = Math.max(1, Math.ceil(totalFiltered / CL_PAGE_SIZE));
        CL_PAGE = Math.max(1, Math.min(CL_PAGE, totalPages));
        var pageStart = (CL_PAGE - 1) * CL_PAGE_SIZE;
        var visibleEntries = filtered.slice(pageStart, pageStart + CL_PAGE_SIZE);

        CL_DETAIL_ITEMS = {};
        var html = visibleEntries.map(function (e, idx) {
          var n = e.name;
          var email = e.email;
          var picture = getPictureForStudent(n, email, logs, grades);
          var ms = sessionTimes[n] || 0;
          var tc = timeColor(ms);
          var detailId = 'cld' + idx + '_' + Math.abs(n.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0));
          var initials = n.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
          var ci = Math.abs((n.charCodeAt(0) || 0) + (n.charCodeAt(1) || 0)) % AV_COLORS.length;
          var avatarBg = AV_COLORS[ci];
          var activityProgressHtml = buildActDots(n, grades);
          var resourceProgressHtml = buildResourceDots(n, resources);
          var presence = presenceInfo(e.lastAccess);
          var currentGrade = e.calc && e.calc.grade !== null && e.calc.grade !== undefined
            ? Number(e.calc.grade) : null;
          if (currentGrade !== null && isNaN(currentGrade)) currentGrade = null;
          var gradeText = currentGrade === null ? '\u2014' : currentGrade.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          });
          var gradeTone = currentGrade === null ? 'empty' : (hasGradeAtOrAboveCurrentPartialTarget(e) ? 'approved' : 'below');
          CL_DETAIL_ITEMS[detailId] = e;
          var selectionKey = classSelectionKey(e);
          e.picture = picture;
          var circ = 2 * Math.PI * 26;
          var ringDash = Math.round((e.score / 100) * circ);
          var participationHtml = '<div class="cl-score-ring cl-score-ring-summary" style="--score-color:' + esc(e.status.color) + ';">'
            + '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26"></circle><circle class="fg" cx="32" cy="32" r="26" stroke-dasharray="' + ringDash + ' ' + circ + '"></circle></svg>'
            + '<span>' + e.score + '%</span>'
            + '</div>';
          var interventionIndicator = interventionIndicatorHtml(e.name);
          var statusHtml = e.followup
            ? '<div class="cl-status-stack cl-status-followup-only">'
              + '<span class="cl-part-chip followup">' + esc(tr('attention', 'Em acompanhamento')) + '</span>'
              + followUpReasonHtml(e.followupReasons, interventionIndicator)
              + '</div>'
            : '<div class="cl-status-stack">'
              + '<span class="cl-part-chip ' + e.status.cls + '">' + esc(e.status.label) + '</span>'
              + followUpReasonHtml(e.followupReasons, interventionIndicator)
              + '</div>';

          return '<tr class="cl-student-summary-row" data-student="' + esc(n) + '" onclick="window.MWAClassList&&window.MWAClassList.toggleDetail(\'' + esc(detailId) + '\')">'
            + '<td class="mwa-select-cell" data-label=""><input type="checkbox" class="mwa-student-select" data-detail-id="' + esc(detailId) + '"' + (CL_SELECTED[selectionKey] ? ' checked' : '') + ' onclick="event.stopPropagation()" onchange="event.stopPropagation();window.MWAClassList&&window.MWAClassList.toggleStudentSelection(this)" aria-label="' + esc(tr('select', 'Selecionar') + ' ' + n) + '"></td>'
            + '<td data-label="' + esc(tr('cl_th_participation')) + '" style="width:8%;text-align:center;padding:4px 2px;">' + participationHtml + '</td>'
            + '<td data-label="' + esc(tr('student')) + '" class="cl-student-summary-cell" style="width:20%;">'
              + '<div class="cl-student-cell">'
                + '<div class="cl-avatar' + (picture ? ' has-img' : '') + '" style="background:' + avatarBg + ';">' + (picture ? '<img src="' + esc(picture) + '" alt="' + esc(n) + '" loading="lazy">' : esc(initials)) + '</div>'
                + '<div class="cl-student-summary-text">'
                  + '<span class="cl-student-name">' + esc(n) + '</span>'
                  + '<span class="mwa-presence ' + presence.tone + '"><i aria-hidden="true"></i>' + esc(presence.label)
                    + '<span class="cl-presence-last"><span>' + esc(tr('cl_th_last_access', 'Último acesso')) + ':</span>'
                      + '<time>' + esc(e.lastAccess ? fmtDate(e.lastAccess) : '—') + '</time></span>'
                  + '</span>'
                + '</div>'
              + '</div>'
            + '</td>'
            + '<td data-label="' + esc(tr('cl_th_situation')) + '" class="cl-status-cell" style="width:14%;">' + statusHtml + '</td>'
            + '<td data-label="' + esc(tr('cl_th_activity_progress')) + '" style="width:19%;">' + activityProgressHtml + '</td>'
            + '<td data-label="' + esc(tr('cl_th_resource_progress')) + '" style="width:19%;">' + resourceProgressHtml + '</td>'
            + '<td data-label="' + esc(tr('sp_kpi_grade')) + '" style="width:7%;text-align:center;"><span class="cl-grade ' + gradeTone + '"><b>' + esc(gradeText) + '</b>' + (currentGrade === null ? '' : '<small>pts</small>') + '</span></td>'
            + '<td data-label="' + esc(tr('cl_th_total_time')) + '" style="width:9%;text-align:center;"><span class="cl-time" style="color:' + tc + ';">' + fmtTime(ms) + '</span></td>'
            + '<td style="width:4%;padding-right:.75rem;text-align:center;"><span class="cl-row-caret">&nearr;</span></td>'
          + '</tr>'
          + '<tr class="cl-student-detail-row" id="' + esc(detailId) + '" style="display:none;" data-student="' + esc(n) + '"><td colspan="9">' + buildStudentDetail(e, activityProgressHtml, resourceProgressHtml, detailId) + '</td></tr>';
        }).join('');

        Store.renderHtml(tb, html || '<tr><td colspan="9" class="cl-empty">' + esc(tr('no_data')) + '</td></tr>');
        updateClassBulkAction();
        renderClassPagination(totalFiltered);
        var cnt = document.getElementById('clCount');
        if (cnt) {
          var labelMap = {
            all: tr('ev_all', 'Todos'),
            engaged: tr('cl_filter_engaged', 'Com engajamento'),
            interactions: tr('with_course_activity', 'Com interações'),
            followup: tr('attention', 'Em acompanhamento'),
            attentiontoday: tr('attention_today_title', 'Atenção hoje'),
            awaitinggrade: tr('ac_kpi_awaiting_grades', 'Aguardando correção'),
            overdue: tr('cl_followup_overdue', 'Entrega atrasada'),
            inactive: tr('cl_followup_inactive', 'Sem participação há 7 dias ou mais'),
            grade: tr('cl_followup_grade', 'Aproveitamento parcial abaixo de 60%').replace('60', Number((Store.getConfig() || {}).approvalgrade) || 60),
            below60: tr('cl_filter_below_60_percent', 'Aproveitamento parcial abaixo de 60%').replace('60', Number((Store.getConfig() || {}).approvalgrade) || 60),
            never: tr('ev_never_access', 'Nunca acessou o Moodle'),
            medium: tr('ev_med_part', 'Em progressão'),
            goal: tr('cl_goal_reached', 'Meta alcançada'),
            high: tr('ev_high_part', 'Alta participação')
          };
          cnt.textContent = filtered.length + ' ' + tr('students', 'estudantes') + ' · ' + (labelMap[CL_FILTER] || labelMap.all);
        }
        document.querySelectorAll('#clKpiRow [data-cl-filter]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            CL_FILTER = btn.getAttribute('data-cl-filter') || 'all';
            CL_PAGE = 1;
            renderClassListUnified();
          });
        });
      }

      function filterClassListUnified(q) {
        CL_SEARCH = q || '';
        CL_PAGE = 1;
        renderClassListUnified();
      }
      function setAccessDateFilter(from, to) {
        CL_ACCESS_FROM = norm(from);
        CL_ACCESS_TO = norm(to);
        CL_PAGE = 1;
        renderClassListUnified();
      }

      function setClassListFilter(filter, search) {
        CL_FILTER = filter || 'all';
        CL_SEARCH = search || '';
        CL_PAGE = 1;
        var input = document.getElementById('clSearch');
        if (input) input.value = CL_SEARCH;
        renderClassListUnified();
      }

      function showAttentionStudents(students) {
        CL_ATTENTION_STUDENTS = {ids: {}, names: {}};
        (students || []).forEach(function(student) {
          var userid = Number(student.userid || 0);
          var name = norm(student.name || '').toLowerCase();
          if (userid > 0) CL_ATTENTION_STUDENTS.ids[userid] = true;
          if (name) CL_ATTENTION_STUDENTS.names[name] = true;
        });
        setClassListFilter('attentiontoday', '');
      }

      function goToClassPage(page) {
        CL_PAGE = Math.max(1, parseInt(page, 10) || 1);
        renderClassListUnified();
      }

      function setClassPageSize(size) {
        CL_PAGE_SIZE = [5, 10, 20, 50].indexOf(Number(size)) >= 0 ? Number(size) : 10;
        CL_PAGE = 1;
        renderClassListUnified();
      }

      function toggleDetail(id) {
        var row = document.getElementById(id);
        if (!row) return;
        var current = document.getElementById('clStudentDetailOverlay');
        function closeOverlay() {
          var overlay = document.getElementById('clStudentDetailOverlay');
          if (!overlay) return;
          var panel = overlay.querySelector('.cl-detail-panel');
          var source = document.getElementById(overlay.dataset.sourceId || '');
          var cell = source && source.querySelector('td');
          if (panel && cell) cell.appendChild(panel);
          overlay.remove();
          document.body.classList.remove('mwa-detail-modal-open');
        }
        if (current) {
          var same = current.dataset.sourceId === id;
          closeOverlay();
          if (same) return;
        }
        var panel = row.querySelector('.cl-detail-panel');
        if (!panel) return;
        var student = CL_DETAIL_ITEMS[id] || {};
        var overlay = document.createElement('div');
        overlay.id = 'clStudentDetailOverlay';
        overlay.className = 'block-mwa-dashboard-app cl-detail-overlay';
        overlay.dataset.sourceId = id;
        var modalPicture = norm(student.picture || '');
        var modalInitials = norm(student.name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) { return word[0]; }).join('').toUpperCase();
        var modalColorIndex = Math.abs(((student.name || '').charCodeAt(0) || 0) + ((student.name || '').charCodeAt(1) || 0)) % AV_COLORS.length;
        var modalAvatar = '<span class="cl-detail-head-avatar' + (modalPicture ? ' has-img' : '') + '" style="background:' + AV_COLORS[modalColorIndex] + ';">'
          + (modalPicture ? '<img src="' + esc(modalPicture) + '" alt="' + esc(student.name || tr('student', 'Estudante')) + '" loading="lazy">' : esc(modalInitials || '?'))
          + '</span>';
        document.body.appendChild(overlay);
        document.body.classList.add('mwa-detail-modal-open');
        Templates.render('block_mwa_dashboard/classlist_detail_modal', {
          title: tr('student', 'Estudante'),
          close: tr('snapshot_close', 'Fechar')
        }).then(function(html, js) {
          if (!document.body.contains(overlay)) return;
          Templates.replaceNodeContents(overlay, html, js);
          overlay.querySelector('.cl-detail-modal-body').appendChild(panel);
          overlay.querySelector('.cl-detail-modal-close').addEventListener('click', closeOverlay);
          overlay.querySelector('.cl-detail-inline-close').addEventListener('click', closeOverlay);
          overlay.querySelector('.cl-detail-modal-close').focus();
        }).catch(function() {
          closeOverlay();
        });
      }

      function openStudent(name) {
        var wanted = norm(name).toLowerCase();
        if (!wanted) return;
        CL_FILTER = 'all';
        CL_SEARCH = name || '';
        var search = document.getElementById('clSearch');
        if (search) search.value = name || '';
        renderClassListUnified();
        setTimeout(function () {
          var rows = document.querySelectorAll('#clTableBody tr.cl-student-summary-row');
          var target = null;
          rows.forEach(function (row) {
            var n = norm(row.getAttribute('data-student')).toLowerCase();
            if (!target && n === wanted) target = row;
          });
          if (!target) return;
          var detail = target.nextElementSibling;
          if (detail && detail.classList.contains('cl-student-detail-row')) {
            toggleDetail(detail.id);
          }
          target.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 80);
      }

      function closeAchievements() {
        var overlay = document.getElementById('clAchievementsOverlay');
        if (overlay) overlay.remove();
      }

      function openAchievements(button) {
        var detailId = button && button.getAttribute('data-detail-id');
        var item = detailId && CL_DETAIL_ITEMS[detailId];
        if (!item) return;
        closeAchievements();
        var data = item.achievements || {gold: 0, silver: 0, bronze: 0, total: 0, history: []};
        var descriptions = {
          gold: tr('cl_medal_gold_desc', 'Destaque da semana — melhor combinação de participação, atividades concluídas e desempenho.'),
          silver: tr('cl_medal_silver_desc', 'Evolução da semana — aluno que mais melhorou em relação à semana anterior.'),
          bronze: tr('cl_medal_bronze_desc', 'Consistência da semana — manteve boa participação, regularidade e entregas em dia.')
        };
        var labels = {gold: tr('cl_medal_gold', 'Destaque da semana'), silver: tr('cl_medal_silver', 'Evolução da semana'), bronze: tr('cl_medal_bronze', 'Consistência da semana')};
        var emojis = {gold: '🥇', silver: '🥈', bronze: '🥉'};
        var counters = ['gold', 'silver', 'bronze'].map(function(type) {
          return '<span class="cl-achievement-counter" tabindex="0" title="' + esc(descriptions[type]) + '" data-tooltip="' + esc(descriptions[type]) + '"><b aria-hidden="true">' + emojis[type] + '</b><strong>' + Number(data[type] || 0) + '</strong></span>';
        }).join('');
        var history = (data.history || []).slice().reverse().map(function(entry) {
          return '<div class="cl-achievement-history-item"><span aria-hidden="true">' + emojis[entry.type] + '</span><div><strong>' + esc(labels[entry.type]) + '</strong><small>' + esc(tr('cl_achievement_week', 'Semana de {date}').replace('{date}', entry.week)) + '</small></div></div>';
        }).join('');
        var overlay = document.createElement('div');
        overlay.id = 'clAchievementsOverlay';
        overlay.className = 'block-mwa-dashboard-app cl-achievements-overlay';
        Store.renderHtml(overlay, '<section class="cl-achievements-modal" role="dialog" aria-modal="true" aria-labelledby="clAchievementsTitle">'
          + '<header><div><span aria-hidden="true">🏅</span><div><h2 id="clAchievementsTitle">' + esc(tr('cl_achievements_title')) + '</h2></div></div><button type="button" onclick="window.MWAClassList.closeAchievements()" aria-label="' + esc(tr('close')) + '">&times;</button></header>'
          + '<div class="cl-achievements-body"><div class="cl-achievements-score"><strong>' + esc(item.name) + '</strong>' + counters + '</div>'
          + '<div class="cl-achievements-rules"><p title="' + esc(descriptions.gold) + '">🥇 <strong>' + esc(labels.gold) + '</strong></p><p title="' + esc(descriptions.silver) + '">🥈 <strong>' + esc(labels.silver) + '</strong></p><p title="' + esc(descriptions.bronze) + '">🥉 <strong>' + esc(labels.bronze) + '</strong></p></div>'
          + '<h3>' + esc(tr('cl_achievements_history')) + '</h3><div class="cl-achievement-history">' + (history || '<p class="cl-achievements-empty">' + esc(tr('cl_achievements_empty')) + '</p>') + '</div></div>'
          + '</section>');
        document.body.appendChild(overlay);
      }

      function openProfile(el) {
        var name = el && el.getAttribute('data-student');
        if (!name || !window.goToStudentProfile) return;
        var overlay = document.getElementById('clStudentDetailOverlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('mwa-detail-modal-open');
        window.goToStudentProfile(name);
      }

      function openGrades(el) {
        var name = el && el.getAttribute('data-student');
        if (!name || !window.MWAGrades) return;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        var show = function() {
          var grades = window.MWAGrades;
          if (!grades) return;
          if (grades.render) grades.render();
          if (grades.showDetail) grades.showDetail(name);
        };
        if (typeof window.MWAReloadData === 'function') {
          window.MWAReloadData(true).catch(function() {
            return null;
          }).then(show);
        } else {
          show();
        }
      }

      function openInterventionHistory(el) {
        var name = el && el.getAttribute('data-student');
        if (!name || !window.MWAInterventions || !window.MWAInterventions.openStudentHistory) return;
        var stats = window.MWAInterventions.getStudentStats ? window.MWAInterventions.getStudentStats(name) : {total: 0};
        if (!stats.total) return;
        var overlay = document.getElementById('clStudentDetailOverlay');
        if (overlay) overlay.remove();
        document.body.classList.remove('mwa-detail-modal-open');
        window.MWAInterventions.openStudentHistory(name);
      }

      function genAIClassList(id) {
        var item = CL_DETAIL_ITEMS[id];
        var box = document.getElementById('clai' + id);
        var cfg = Store.getConfig ? Store.getConfig() : {};
        var courseid = parseInt(cfg.courseid || 0, 10);
        var calc;
        var prompt;
        var aiButton = box && box.closest('.cl-detail-panel') ? box.closest('.cl-detail-panel').querySelector('.cl-ai-generate-btn') : null;
        if (!item || !box) return;
        if (aiButton && aiButton.disabled) return;
        if (aiButton) aiButton.disabled = true;
        if (!cfg.ia_enabled) {
          Store.renderHtml(box,
            '<div class="ai-box-text">' + esc(tr('ai_unavailable_message', '🔒 Os recursos de Inteligência Artificial estão indisponíveis. Configure uma chave de API válida na administração do MWA.')) + '</div>'
          );
          if (aiButton) aiButton.disabled = false;
          return;
        }
        calc = item.calc || {};
        Store.renderHtml(box,
          '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>'
          + '<span style="margin-left:.5rem;font-size:.78rem;color:var(--muted);">' + esc(tr('loading', 'Carregando...')) + '</span></div>'
        );
        prompt = [
          'Analise este aluno usando apenas os dados do painel da turma.',
          'Escreva em portugues, com orientacao pratica para o professor.',
          'Aluno: ' + item.name,
          'Participacao: ' + item.score + '% (' + item.status.label + ')',
          'Interacoes: ' + item.count,
          'Dias ativos: ' + (calc.activeDays || 0),
          'Ultimo acesso: ' + (calc.last ? fmtDate(calc.last) : '-'),
          'Dias sem acesso: ' + (calc.daysWithoutAccess || 0),
          'Atividades concluidas: ' + Math.round(calc.completion || 0) + '%',
          'Cobertura de conteudo: ' + Math.round(calc.coverage || 0) + '%',
          'Notas lancadas: ' + (calc.gradeLaunched || 0) + ' de ' + (calc.gradeItems || 0),
          'Responda com: 1) diagnostico curto, 2) acao recomendada, 3) mensagem sugerida ao aluno.'
        ].join('\n');
        Store.callAction('block_mwa_dashboard_get_ai_recommendation', {
          courseid: courseid,
          student_name: item.name,
          prompt: prompt
        }).then(function (res) {
          var text = (res && (res.recommendation || res.response || res.content)) || '';
          if (!text) throw new Error(tr('err_ajax_bridge', 'Resposta vazia'));
          if (/^\s*User Safety\s*:\s*(?:safe|unsafe)\s*$/i.test(text)) throw new Error('invalid_ai_response');
          text = Store.cleanAiText ? Store.cleanAiText(text) : text;
          text = esc(text).replace(/\n/g, '<br>');
          Store.renderHtml(box,
            '<div class="ai-box-text">' + text + '</div>'
          );
        }).catch(function () {
          Store.renderHtml(box,
            '<div class="ai-box-text">' + esc(tr('ev_ai_conn_error', 'Não foi possível gerar a recomendação agora.')) + '</div>'
            + '<button type="button" class="btn-ghost cl-ai-retry-btn" onclick="window.MWAClassList&&window.MWAClassList.genAI(\'' + esc(id) + '\')">&#8635; ' + esc(tr('retry', 'Tentar novamente')) + '</button>'
          );
        }).then(function () {
          if (aiButton) aiButton.disabled = false;
        });
      }
    
      /* Public API */
      window.MWAClassList = {
        render: renderClassListUnified,
        toggle: toggleClassListView,
        filter: filterClassListUnified,
        setAccessDateFilter: setAccessDateFilter,
        setFilter: setClassListFilter,
        showAttentionStudents: showAttentionStudents,
        goPage: goToClassPage,
        setPageSize: setClassPageSize,
        toggleDetail: toggleDetail,
        openStudent: openStudent,
        openProfile: openProfile,
        openGrades: openGrades,
        openAchievements: openAchievements,
        closeAchievements: closeAchievements,
        openInterventionHistory: openInterventionHistory,
        genAI: genAIClassList,
        exportSpreadsheet: exportClassSpreadsheet,
        exportMedalsReport: exportMedalsReport,
        closeMedalsReport: closeMedalsReport,
        printMedalsReport: printMedalsReport,
        toggleStudentSelection: toggleStudentSelection,
        toggleVisibleSelection: toggleVisibleSelection,
        messageSelected: messageSelected,
        clearFilters: clearClassFilters,
        getFollowUpStudents: function() {
          return CL_FOLLOWUP_ITEMS === null ? null : CL_FOLLOWUP_ITEMS.slice();
        }
      };
    
    })();

    return window.MWAClassList;
});
