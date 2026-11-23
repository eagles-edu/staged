// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Follow-up report based exclusively on intervention snapshots and later Moodle data.
 *
 * @module     block_mwa_dashboard/teacherfeedback
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['block_mwa_dashboard/dashboardstore'], function(Store) {
    'use strict';

    var data = [];
    var aiReport = '';
    var aiReportError = '';
    var aiReportLoading = false;
    var reportRenderGeneration = 0;
    var activeReportLoad = null;
    var filters = {from: '', to: '', reason: 'all', teacher: 'all', student: 'all'};
    var DAY = 86400;
    var REASONS = ['never', 'low', 'pending', 'difficult', 'other'];

    function tr(key) {
        var S = Store.getStrings() || {};
        var v = Object.prototype.hasOwnProperty.call(S, key) ? S[key] : '';
        if (typeof v === 'string' && v && !/^\[\[.*\]\]$/.test(v)) { return v; }
        return key;
    }

    var REASON_META = {
        never: {label: function() { return tr('int_motivo_never'); }, icon: 'ban', color: '#e5484d'},
        low: {label: function() { return tr('int_motivo_low'); }, icon: 'pulse', color: '#1769e0'},
        pending: {label: function() { return tr('int_motivo_pending'); }, icon: 'document', color: '#f28c00'},
        difficult: {label: function() { return tr('int_motivo_difficult'); }, icon: 'bars', color: '#198754'},
        other: {label: function() { return tr('int_motivo_other'); }, icon: 'bubble', color: '#7030a0'}
    };

    function svg(name, size) {
        var paths = {
            users: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M12 14.2A6 6 0 0 1 23 18v2"/>',
            refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8a7 7 0 0 1 11.7-1L20 12M4 12l2.2 5a7 7 0 0 0 11.7-1"/>',
            target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
            hourglass: '<path d="M7 3h10M7 21h10M8 3c0 4 1 6 4 9-3 3-4 5-4 9M16 3c0 4-1 6-4 9 3 3 4 5 4 9"/>',
            close: '<path d="M5 5l14 14M19 5L5 19"/>',
            trend: '<path d="M3 17l6-6 4 4 8-9M16 6h5v5"/>',
            grid: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 4v16"/>',
            engagement: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="7" r="2"/><path d="M2 19a6 6 0 0 1 12 0M14 13a5 5 0 0 1 8 4"/>',
            learning: '<path d="M3 7l9-4 9 4-9 4-9-4zM6 9v6c4 3 8 3 12 0V9"/>',
            interaction: '<path d="M4 5h12a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-2-3V8a3 3 0 0 1 2-3z"/><path d="M7 10h1M11 10h1M15 10h1"/>',
            permanence: '<path d="M7 7h10l-2-2M17 17H7l2 2M19 7l2 2-2 2M5 17l-2-2 2-2"/>',
            mediation: '<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M1 20v-2a5 5 0 0 1 10 0v2M13 20v-2a5 5 0 0 1 10 0v2M10 12h4"/>',
            trajectory: '<path d="M5 20V9M12 20V4M19 20v-7M3 20h18M4 5l4 2 4-4 5 4 4-3"/>',
            download: '<path d="M12 3v12M7 10l5 5 5-5M4 18v3h16v-3"/>',
            filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',
            calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
            info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
            shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3zM8 12l3 3 5-6"/>',
            person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
            message: '<path d="M4 4h16v12H8l-4 4V4z"/><path d="M8 9h1M12 9h1M16 9h1"/>',
            ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
            pulse: '<path d="M3 13h4l2-7 4 13 3-8 2 2h3"/>',
            document: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
            bars: '<path d="M5 20v-6M12 20V8M19 20V4M3 20h18"/>',
            bubble: '<path d="M4 4h16v13H8l-4 4V4z"/>',
            clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
            checkmark: '<path d="M7 12l3 3 7-7"/>',
            bang: '<path d="M12 6v8M12 18h.01"/>',
            exclamation: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
            stopwatch: '<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3-2M9 2h6M12 2v3M18 6l2-2"/>',
            login: '<path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/>',
            sparkles: '<path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14zM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13z"/>'
        };
        return '<svg class="fr-svg fr-svg-' + esc(name) + '" width="' + (size || 20) + '" height="' + (size || 20) +
            '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            (paths[name] || paths.info) + '</svg>';
    }

    function esc(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function norm(value) {
        return String(value === undefined || value === null ? '' : value).trim();
    }

    function lower(value) {
        return norm(value).toLowerCase();
    }

    function number(value) {
        if (value === '' || value === null || value === undefined) {
            return null;
        }
        var parsed = Number(value);
        return isNaN(parsed) ? null : parsed;
    }

    function round(value, decimals) {
        var factor = Math.pow(10, decimals || 0);
        return Math.round(value * factor) / factor;
    }

    function pct(value, total) {
        return total > 0 ? Math.round(value * 100 / total) : null;
    }

    function pctText(value, total) {
        var result = pct(value, total);
        return result === null ? '—' : result + '%';
    }

    function timestamp(log) {
        return Number(log && (log._ts || log.timecreated || 0)) || 0;
    }

    function reasonBucket(value) {
        var text = lower(value).normalize ? lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '') : lower(value);
        if (text.indexOf('nunca') >= 0 || text.indexOf('never') >= 0) { return 'never'; }
        if (text.indexOf('particip') >= 0 || text.indexOf('engaj') >= 0 || text.indexOf('acesso') >= 0 ||
                text.indexOf('evas') >= 0 || text.indexOf('reeng') >= 0) { return 'low'; }
        if (text.indexOf('pend') >= 0 || text.indexOf('entrega') >= 0 || text.indexOf('tarefa') >= 0) { return 'pending'; }
        if (text.indexOf('dific') >= 0 || text.indexOf('nota') >= 0 || text.indexOf('desempenho') >= 0) { return 'difficult'; }
        return 'other';
    }

    function parseSnapshot(row) {
        try {
            var parsed = JSON.parse(row.snapshot_data || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (ignore) {
            return {};
        }
    }

    function courseTotalGrade(data) {
        if (!data || data.gradeMetric !== 'course_total_points') { return null; }
        return number(data.courseTotalGrade);
    }

    function studentKey(row) {
        return Number(row.userid || 0) ? 'id:' + Number(row.userid) : 'email:' + lower(row.student_email || row.email || row.name);
    }

    function logMatches(log, row) {
        var logid = Number(log._userid || log.userid || log.relateduserid || 0);
        if (Number(row.userid || 0) && logid) { return Number(row.userid) === logid; }
        var email = lower(log.email);
        var name = lower(log.nomecompleto || log.student_name || log.userfullname);
        return (email && email === lower(row.student_email)) || (name && name === lower(row.student_name));
    }

    function findStudent(row, state) {
        var userid = Number(row.userid || 0);
        var email = lower(row.student_email);
        var name = lower(row.student_name);
        return (state.students || []).filter(function(student) {
            return (userid && Number(student.userid || 0) === userid) ||
                (email && lower(student.email) === email) || (name && lower(student.name) === name);
        })[0] || null;
    }

    function currentEngagement(row) {
        var studentValue = row && row.current ? number(row.current.score) : null;
        if (studentValue !== null) { return studentValue; }
        return row && row.currentIndicator ? number(row.currentIndicator.engagement) : null;
    }

    function eventText(log) {
        return lower([log.nomedoevento, log.eventname, log.action, log.componente, log.component,
            log.contextodoevento, log.eventcontext].join(' '));
    }

    function isAcademicAction(log) {
        var text = eventText(log);
        return isLearningModuleAccess(log) || isSubmission(log) ||
            /submit|submitted|submission|attempt|tentativa|completed|completion|conclu|graded|grade|avaliad|entrega|enviad|post created|discussion created/.test(text);
    }

    function isSubmission(log) {
        var text = eventText(log);
        return /submit|submitted|submission|attempt submitted|completed|completion|conclu|entrega|post created|discussion created/.test(text);
    }

    function isResourceAccess(log) {
        var module = lower(log && (log._modtype || log.modtype || log.module || ''));
        var component = lower(log && (log.component || log.componente || '')).replace(/^mod_/, '');
        if (!module) { module = component; }
        if (module === 'file' || module === 'arquivo') { module = 'resource'; }
        if (['resource', 'page', 'url', 'book', 'folder', 'imscp', 'wiki'].indexOf(module) < 0) { return false; }
        return /view|visualiz|open|abert|access|acess|read|leitur/.test(eventText(log));
    }

    function isLearningModuleAccess(log) {
        var module = lower(log && (log._modtype || log.modtype || log.module || ''));
        var rawComponent = lower(log && (log.component || log.componente || ''));
        var component = rawComponent.replace(/^mod_/, '');
        if (!module) { module = component; }
        if (!/view|visualiz|open|abert|access|acess|read|leitur/.test(eventText(log))) { return false; }
        if (!module || ['course', 'core', 'system', 'user', 'label'].indexOf(module) >= 0) { return false; }
        return rawComponent.indexOf('mod_') === 0 || [
            'resource', 'file', 'page', 'url', 'book', 'folder', 'imscp',
            'assign', 'assignment', 'quiz', 'forum', 'lesson', 'h5pactivity', 'scorm', 'choice',
            'choicegroup', 'groupselect', 'glossary', 'workshop', 'data', 'chat', 'feedback', 'survey',
            'questionnaire', 'game', 'attendance', 'board', 'journal', 'vpl', 'bigbluebuttonbn', 'webconf'
        ].indexOf(module) >= 0;
    }

    function parseTargets(row) {
        try {
            var parsed = JSON.parse(row.target_items || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (ignore) {
            return [];
        }
    }

    function sameTarget(log, target) {
        var cmid = Number(log.cmid || log._cmid || log.contextinstanceid || 0);
        var targetid = Number(target.cmid || 0);
        var context = lower(log.contextodoevento || log.eventcontext || log.context || '');
        var name = lower(target.name);
        return (targetid && cmid === targetid) || (name && context.indexOf(name) >= 0);
    }

    function trackedActivityDone(target, current, afterLogs) {
        var gradeRow = current && current.gradeRow;
        if (gradeRow && target.seq) {
            var mod = lower(target.mod || target.modtype || '');
            var hasCurrent = Object.prototype.hasOwnProperty.call(gradeRow, 'act_current_' + target.seq);
            var currentCount = hasCurrent ? Number(gradeRow['act_current_' + target.seq] || 0) : null;
            var currentGrade = parseFloat(String(gradeRow['act_' + target.seq] || '').replace(',', '.'));
            if (hasCurrent) {
                return mod === 'forum' ? currentCount > 0 : (currentCount > 0 || (!isNaN(currentGrade) && currentGrade > 0));
            }
            if (!isNaN(currentGrade) && currentGrade > 0) { return true; }
        }
        return (afterLogs || []).some(function(log) { return isSubmission(log) && sameTarget(log, target); });
    }

    function trackedActivityOverdue(target, done) {
        if (done) { return false; }
        var closedAt = Number(target.availableuntil || 0);
        return closedAt > 0 && closedAt < Math.floor(Date.now() / 1000);
    }

    function analyseRow(row, state, currentIndicators) {
        var snapshot = parseSnapshot(row);
        var captured = Number(row.snapshot_timecreated || row.timesent || 0);
        var current = findStudent(row, state);
        var currentIndicator = currentIndicators[String(row.userid)] || null;
        var after = (state.logs || []).filter(function(log) {
            return timestamp(log) > captured && logMatches(log, row);
        }).sort(function(a, b) { return timestamp(a) - timestamp(b); });
        var academic = after.filter(isAcademicAction);
        var submissions = after.filter(isSubmission);
        var reason = reasonBucket(row.snapshot_reason || row.intervention_reason);
        var trackedItems = norm(row.target_type) === 'activity_completion' ? parseTargets(row).map(function(target) {
            var done = trackedActivityDone(target, current, after);
            return {
                key: studentKey(row) + ':' + (target.cmid || target.seq || lower(target.name)),
                name: norm(target.name),
                done: done,
                hasDeadline: Number(target.duedate || target.availableuntil || 0) > 0,
                overdue: trackedActivityOverdue(target, done)
            };
        }) : [];
        var trackedResources = norm(row.target_type) === 'resource_access' ? parseTargets(row).map(function(target) {
            return {
                key: studentKey(row) + ':' + (target.cmid || target.seq || lower(target.name)),
                name: norm(target.name),
                done: after.some(function(log) { return sameTarget(log, target); })
            };
        }) : [];
        // Keep the report status aligned with the Interventions tab: any real
        // Moodle access after the intervention starts the follow-up process.
        var response = after.length > 0;
        var reached = null;
        var initial = null;
        var currentValue = null;

        var allTracked = trackedItems.concat(trackedResources);
        if (allTracked.length) {
            reached = allTracked.every(function(item) { return item.done; });
        } else if (reason === 'never') {
            initial = courseTotalGrade(snapshot);
            currentValue = currentIndicator ? courseTotalGrade(currentIndicator) : null;
            reached = initial !== null && currentValue !== null ? currentValue > initial : null;
        } else if (reason === 'low') {
            initial = number(snapshot.engagement);
            currentValue = currentEngagement({current: current, currentIndicator: currentIndicator});
            reached = initial !== null && currentValue !== null ? currentValue > initial : null;
        } else if (reason === 'pending') {
            var completedTracked = trackedItems.filter(function(item) { return item.done; }).length;
            initial = trackedItems.length || number(snapshot.pendingActivities);
            currentValue = trackedItems.length ? Math.max(0, trackedItems.length - completedTracked) :
                (currentIndicator ? number(currentIndicator.pendingActivities) : null);
            reached = initial !== null && currentValue !== null ? currentValue < initial : null;
        } else if (reason === 'difficult' || reason === 'other') {
            initial = courseTotalGrade(snapshot);
            currentValue = currentIndicator ? courseTotalGrade(currentIndicator) : null;
            reached = initial !== null && currentValue !== null ? currentValue > initial : null;
        } else {
            reached = null;
        }

        // A return to Moodle is already a partial response. Academic actions
        // remain measured separately in the second response-time indicator.
        var completedTracked = allTracked.filter(function(item) { return item.done; }).length;
        var partialResponse = response && reached !== true && (allTracked.length ? completedTracked > 0 : academic.length > 0);
        var returnedOnly = response && reached !== true && !partialResponse;
        var firstResponse = response ? timestamp(after[0]) : 0;
        var latest = after.length ? timestamp(after[after.length - 1]) : 0;
        return {
            raw: row,
            snapshot: snapshot,
            key: studentKey(row),
            reason: reason,
            current: current,
            currentIndicator: currentIndicator,
            captured: captured,
            after: after,
            academic: academic,
            submissions: submissions,
            trackedItems: trackedItems,
            trackedResources: trackedResources,
            response: response,
            partialResponse: partialResponse,
            returnedOnly: returnedOnly,
            reached: reached,
            firstResponse: firstResponse,
            latest: latest,
            initial: initial,
            currentValue: currentValue
        };
    }

    function groupStudents(rows) {
        var groups = {};
        rows.forEach(function(row) {
            if (!groups[row.key]) { groups[row.key] = {key: row.key, rows: [], name: row.raw.student_name}; }
            groups[row.key].rows.push(row);
        });
        return Object.keys(groups).map(function(key) {
            var group = groups[key];
            group.latest = group.rows.slice().sort(function(a, b) { return b.captured - a.captured; })[0];
            group.responded = group.latest.response;
            group.reached = group.latest.reached === true;
            group.partialResponse = group.latest.partialResponse === true;
            group.returnedOnly = group.latest.returnedOnly === true;
            group.unknownGoal = group.latest.reached === null;
            return group;
        });
    }

    function progressState(item) {
        if (item && item.reached === true) { return 'integral'; }
        if (item && item.partialResponse === true) { return 'partial'; }
        if (item && item.returnedOnly === true) { return 'returned'; }
        return 'awaiting';
    }

    function avg(values) {
        var clean = values.filter(function(value) { return value !== null && value !== undefined && !isNaN(value); });
        if (!clean.length) { return null; }
        return clean.reduce(function(sum, value) { return sum + Number(value); }, 0) / clean.length;
    }

    function formatNumber(value, suffix) {
        if (value === null || value === undefined || isNaN(value)) { return '—'; }
        return Number(value) === 0 ? '0' : round(value, 1) + (suffix || '');
    }

    function formatDate(ts) {
        if (!ts) { return '—'; }
        return new Date(ts * 1000).toLocaleDateString();
    }

    function formatDateTime(ts) {
        if (!ts) { return '—'; }
        return new Date(ts * 1000).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'});
    }

    function localDateKey(ts) {
        var date = ts instanceof Date ? ts : new Date(Number(ts) * 1000);
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }

    function duration(seconds) {
        if (seconds === null || seconds === undefined || !isFinite(seconds)) { return '—'; }
        var hours = seconds / 3600;
        if (hours < 1) { return Math.round(seconds / 60) + ' min'; }
        if (hours < 48) { return round(hours, 1) + ' h'; }
        return round(hours / 24, 1) + ' dias';
    }

    function filterRows(rows) {
        var from = filters.from ? new Date(filters.from + 'T00:00:00').getTime() / 1000 : 0;
        var to = filters.to ? new Date(filters.to + 'T23:59:59').getTime() / 1000 : Number.MAX_SAFE_INTEGER;
        return rows.filter(function(row) {
            return row.captured >= from && row.captured <= to &&
                (filters.reason === 'all' || row.reason === filters.reason) &&
                (filters.teacher === 'all' || String(row.raw.teacherid) === filters.teacher) &&
                (filters.student === 'all' || row.key === filters.student);
        });
    }

    function option(value, label, selected) {
        return '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
    }

    function filtersHtml(rows) {
        var teachers = {};
        var students = {};
        rows.forEach(function(row) { teachers[String(row.raw.teacherid)] = row.raw.teacher_name; });
        rows.forEach(function(row) { students[row.key] = row.raw.student_name || row.raw.student_email || tr('tf_student_fallback'); });
        var teacherOptions = option('all', tr('tf_filter_all_teachers'), filters.teacher);
        Object.keys(teachers).sort(function(a, b) { return teachers[a].localeCompare(teachers[b]); }).forEach(function(id) {
            teacherOptions += option(id, teachers[id], filters.teacher);
        });
        var studentOptions = option('all', tr('tf_filter_all_students'), filters.student);
        Object.keys(students).sort(function(a, b) { return students[a].localeCompare(students[b]); }).forEach(function(key) {
            studentOptions += option(key, students[key], filters.student);
        });
        var reasonOptions = option('all', tr('tf_filter_all_reasons'), filters.reason);
        REASONS.forEach(function(key) { reasonOptions += option(key, REASON_META[key].label(), filters.reason); });
        return '<div class="fr-toolbar open">' +
            '<div class="fr-toolbar-row fr-toolbar-main-row">' +
              '<div class="fr-filter fr-reason-filter"><label>' + esc(tr('tf_filter_reason')) + '</label><select id="frReason">' + reasonOptions + '</select></div>' +
              '<div class="fr-filter fr-teacher-filter"><label>' + esc(tr('tf_filter_teacher')) + '</label><select id="frTeacher">' + teacherOptions + '</select></div>' +
              '<div class="fr-filter fr-student-filter"><label>' + esc(tr('tf_filter_student')) + '</label><select id="frStudent">' + studentOptions + '</select></div>' +
              '<button type="button" class="fr-btn fr-clear" id="frClear"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-trash"></use></svg> ' + esc(tr('clearfilters')) + '</button>' +
            '</div>' +
            '<div class="fr-toolbar-row fr-toolbar-period-row">' +
              '<div class="fr-filter fr-date-filter"><label>' + esc(tr('tf_filter_start_period')) + '</label><input id="frFrom" type="date" value="' + esc(filters.from) + '"></div>' +
              '<div class="fr-filter fr-date-filter"><label>' + esc(tr('tf_filter_end_period')) + '</label><input id="frTo" type="date" value="' + esc(filters.to) + '"></div>' +
              '<button type="button" class="fr-btn fr-export" id="frExport">' + svg('download', 16) + ' ' + esc(tr('tf_export_pdf')) + '</button>' +
            '</div></div>';
    }

    function headerActionsHtml() {
        return '';
    }

    function kpi(icon, label, value, sub, color, help) {
        return '<div class="fr-kpi" style="--fr-color:' + color + '"><div class="fr-kpi-head"><span class="fr-kpi-icon">' + svg(icon, 27) + '</span>' +
            '<span class="fr-kpi-label">' + esc(label) + (help ? '<span class="mwa-help-tip fr-kpi-help" tabindex="0" role="img" aria-label="' + esc(help) + '" title="' + esc(help) + '" data-tooltip="' + esc(help) + '">?</span>' : '') + '</span></div>' +
            '<strong class="fr-kpi-value">' + esc(value) + '</strong><small class="fr-kpi-sub">' + esc(sub) + '</small>' +
            '</div>';
    }

    function card(title, body, scope, extra) {
        return '<section class="fr-card ' + (extra || '') + '" data-fr-scope="' + scope + '"><h2>' + title + '</h2>' + body + '</section>';
    }

    function info(text) {
        return '<div class="fr-info">' + svg('info', 16) + '<p>' + esc(text) + '</p></div>';
    }

    function reasonChart(rows) {
        rows = Array.isArray(rows) ? rows : [];

        var data = REASONS.map(function(reason) {
            var meta = REASON_META[reason];
            var subset = rows.filter(function(row) { return row.reason === reason; });
            var responded = subset.filter(function(row) { return row.response; }).length;
            var engagementPairs = metricPairs(subset).engagement;
            var engagementDelta = avg(engagementPairs.map(function(pair) { return pair.after - pair.before; }));
            function uniqueNames(items) {
                var seen = {};
                return items.map(function(item) { return norm(item && item.raw ? item.raw.student_name : item && item.name).trim(); })
                    .filter(function(name) {
                        if (!name || seen[name]) { return false; }
                        seen[name] = true;
                        return true;
                    });
            }
            return {
                label: meta.label(),
                color: meta.color,
                icon: meta.icon,
                total: subset.length,
                respondedPct: subset.length ? pct(responded, subset.length) : null,
                delta: engagementDelta,
                interventionNames: uniqueNames(subset),
                respondedNames: uniqueNames(subset.filter(function(row) { return row.response; })),
                engagementNames: uniqueNames(engagementPairs)
            };
        });

        if (data.every(function(d) { return d.total === 0; })) {
            return '<div class="fr-no-data">' + tr('tf_reason_no_data') + '</div>';
        }

        /* SVG dimensions */
        var W = 1200, H = 200;
        var padL = 48, padR = 20, padT = 20, padB = 44;
        var chartW = W - padL - padR;
        var chartH = H - padT - padB;
        var n = data.length;
        var groupW = chartW / n;
        var barW = Math.min(22, groupW / 3.5);
        var gap = barW * 0.6;

        /* Scales: left axis 0-100, right axis for delta (-100 to +100). */
        var maxTotal = Math.max.apply(null, data.map(function(d) { return d.total; })) || 1;
        var scalePct = function(v) { return chartH - (v / 100) * chartH; };
        var scaleCount = function(v) { return chartH - (v / (maxTotal * 1.25)) * chartH; };
        var scaleDelta = function(v) {
            if (v === null) return null;
            var abs = Math.max.apply(null, data.map(function(d) { return d.delta !== null ? Math.abs(d.delta) : 0; })) || 1;
            return chartH / 2 - (v / (abs * 1.5)) * (chartH / 2);
        };

        /* Grid lines */
        var grid = [0, 25, 50, 75, 100].map(function(v) {
            var y = padT + scalePct(v);
            return '<line class="fr-grid-line" x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '"/>' +
                '<text class="fr-axis-label" x="' + (padL - 4) + '" y="' + (y + 4) + '" text-anchor="end">' + v + '</text>';
        }).join('');

        /* Bars */
        var bars = data.map(function(d, i) {
            var cx = padL + i * groupW + groupW / 2;

            /* Bar 1: interventions (count, grey-blue). */
            var hTotal = d.total > 0 ? Math.max(4, scaleCount(0) - scaleCount(d.total)) : 0;
            var yTotal = padT + chartH - hTotal;
            var detail1 = esc(JSON.stringify({series: tr('tf_reason_interventions'), label: d.label, value: d.total, students: d.interventionNames, color: '#d99a00'}));
            var b1 = d.total > 0
                ? '<rect class="fr-reason-bar" tabindex="0" role="button" data-fr-reason-detail="' + detail1 + '" x="' + (cx - barW - gap) + '" y="' + yTotal + '" width="' + barW + '" height="' + hTotal + '" rx="3" fill="#d99a00" opacity=".92"/>' +
                  '<text class="fr-bar-val" x="' + (cx - barW / 2 - gap) + '" y="' + (yTotal - 4) + '" text-anchor="middle">' + d.total + '</text>'
                : '';

            /* Bar 2: Returned students percentage (blue). */
            var rPct = d.respondedPct !== null ? d.respondedPct : 0;
            var hResp = rPct > 0 ? Math.max(4, scalePct(0) - scalePct(rPct)) : 0;
            var yResp = padT + chartH - hResp;
            var detail2 = esc(JSON.stringify({series: tr('tf_reason_responded_pct'), label: d.label, value: rPct + '%', students: d.respondedNames, color: '#1769e0'}));
            var b2 = d.respondedPct !== null
                ? '<rect class="fr-reason-bar" tabindex="0" role="button" data-fr-reason-detail="' + detail2 + '" x="' + cx + '" y="' + yResp + '" width="' + barW + '" height="' + hResp + '" rx="3" fill="#1769e0" opacity=".8"/>' +
                  (rPct > 0 ? '<text class="fr-bar-val" x="' + (cx + barW / 2) + '" y="' + (yResp - 4) + '" text-anchor="middle">' + rPct + '%</text>' : '')
                : '';

            /* Bar 3: engagement change (green/red, centered at midpoint). */
            var b3 = '';
            if (d.delta !== null) {
                var midY = padT + chartH / 2;
                var dy = scaleDelta(d.delta);
                if (dy !== null) {
                    var yBar = dy < chartH / 2 ? padT + dy : midY;
                    var hBar = Math.abs(midY - (padT + dy));
                    hBar = Math.max(hBar, 3);
                    var dColor = d.delta >= 0 ? '#15935f' : '#d93025';
                    var detail3 = esc(JSON.stringify({series: tr('tf_reason_engage_delta'), label: d.label, value: (d.delta > 0 ? '+' : '') + formatNumber(d.delta), students: d.engagementNames, color: dColor}));
                    b3 = '<rect class="fr-reason-bar" tabindex="0" role="button" data-fr-reason-detail="' + detail3 + '" x="' + (cx + barW + gap) + '" y="' + yBar + '" width="' + barW + '" height="' + hBar + '" rx="3" fill="' + dColor + '" opacity=".8"/>' +
                        '<text class="fr-bar-val" x="' + (cx + barW * 1.5 + gap) + '" y="' + (Math.min(yBar, midY) - 4) + '" text-anchor="middle" fill="' + dColor + '">' +
                        (d.delta > 0 ? '+' : '') + formatNumber(d.delta) + '</text>';
                }
            }

            /* Full X label, split into two balanced lines when needed. */
            var words = d.label.split(/\s+/);
            var labelLines = [d.label];
            if (d.label.length > 16 && words.length > 1) {
                var midpoint = Math.ceil(words.length / 2);
                labelLines = [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
            }
            var xLabel = '<text class="fr-axis-label fr-axis-label-x" x="' + cx + '" y="' + (H - 17) + '" text-anchor="middle">' +
                labelLines.map(function(line, lineIndex) {
                    return '<tspan x="' + cx + '" dy="' + (lineIndex ? 11 : 0) + '">' + esc(line) + '</tspan>';
                }).join('') + '</text>';

            return b1 + b2 + b3 + xLabel;
        }).join('');

        /* Zero line for delta */
        var zeroY = padT + chartH / 2;
        var zeroLine = '<line class="fr-zero-line" x1="' + padL + '" y1="' + zeroY + '" x2="' + (W - padR) + '" y2="' + zeroY + '" stroke-dasharray="3 3" opacity=".4"/>';

        /* Legend */
        var legend = '<span><i style="background:#d99a00"></i>' + tr('tf_reason_interventions') + '</span>' +
            '<span><i style="background:#1769e0"></i>' + tr('tf_reason_responded_pct') + '</span>' +
            '<span><i style="background:linear-gradient(#15935f 50%,#d93025 50%)"></i>' + tr('tf_reason_engage_delta') + '</span>';

        var svgStyle = '<style>' +
            '.fr-grid-line{stroke:#e8ecf5;stroke-width:1}' +
            '.fr-zero-line{stroke:#b0b8cc;stroke-width:1}' +
            '.fr-axis-label{font-size:10px;fill:#6b7394;font-family:inherit}' +
            '.fr-axis-label-x{font-size:9.5px;fill:#2a3250;font-weight:700}' +
            '.fr-bar-val{font-size:9px;fill:#2a3250;font-family:inherit;font-weight:700}' +
            '.fr-reason-bar{cursor:pointer;outline:none}.fr-reason-bar:hover,.fr-reason-bar:focus,.fr-reason-bar.active{opacity:1!important;stroke:#07154f;stroke-width:1.5}' +
            '</style>';

        return '<div class="fr-line-chart fr-reason-chart">' +
            '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(tr('tf_reason_chart_title')) + '" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;overflow:visible">' +
            svgStyle + '<g class="grid">' + grid + '</g>' + zeroLine + bars +
            '</svg>' +
            '<div class="fr-legend fr-reason-legend">' + legend + '</div></div>' +
            '<div class="fr-chart-detail" id="frReasonDetail"><strong>' + esc(tr('tf_chart_click_bar')) + '</strong><span>' + esc(tr('tf_chart_students_hint')) + '</span></div>' +
            '<div class="fr-reason-info-gap" aria-hidden="true"></div>' +
            info(tr('tf_reason_engage_note'));
    }

    function donutHtml(groups) {
        var total = groups.length;
        var reachedGroups = groups.filter(function(group) { return group.reached; });
        var monitoringGroups = groups.filter(function(group) { return progressState(group) === 'partial'; });
        var returnedGroups = groups.filter(function(group) { return progressState(group) === 'returned'; });
        var noResponseGroups = groups.filter(function(group) { return progressState(group) === 'awaiting'; });
        var reached = reachedGroups.length;
        var monitoring = monitoringGroups.length;
        var returned = returnedGroups.length;
        var noResponse = noResponseGroups.length;
        var pr = pct(reached, total) || 0;
        var pm = pct(monitoring, total) || 0;
        var pret = pct(returned, total) || 0;
        var pn = Math.max(0, 100 - pr - pm - pret);
        var slices = [{label: tr('tf_kpi_evolved'), count: reached, percent: pr, color: '#198754', names: reachedGroups.map(function(group) { return group.name; })},
            {label: tr('tf_kpi_tracking'), count: monitoring, percent: pm, color: '#ff8a00', names: monitoringGroups.map(function(group) { return group.name; })},
            {label: tr('int_status_returned'), count: returned, percent: pret, color: '#e1ad21', names: returnedGroups.map(function(group) { return group.name; })},
            {label: tr('int_status_awaiting'), count: noResponse, percent: pn, color: '#e32929', names: noResponseGroups.map(function(group) { return group.name; })}];
        return '<div class="fr-donut-wrap"><div class="fr-donut" data-fr-donut="' + esc(JSON.stringify(slices)) +
            '" style="background:conic-gradient(#198754 0 ' + pr + '%,#ff8a00 ' + pr + '% ' + (pr + pm) + '%,#e1ad21 ' + (pr + pm) + '% ' + (pr + pm + pret) + '%,#e32929 ' + (pr + pm + pret) + '% 100%)">' +
            '<span class="fr-donut-tooltip" hidden></span>' +
            '<div><strong class="fr-donut-center-value">' + pr + '%</strong><span class="fr-donut-center-label">' + tr('tf_donut_rate_label') + '</span></div></div>' +
            '<ul><li title="' + reached + ' (' + pr + '%)"><i style="background:#198754"></i>' + tr('tf_kpi_evolved') + '</li>' +
            '<li title="' + monitoring + ' (' + pm + '%)"><i style="background:#ff8a00"></i>' + tr('tf_kpi_tracking') + '</li>' +
            '<li title="' + returned + ' (' + pret + '%)"><i style="background:#e1ad21"></i>' + tr('int_status_returned') + '</li>' +
            '<li title="' + noResponse + ' (' + pn + '%)"><i style="background:#e32929"></i>' + tr('int_status_awaiting') + '</li></ul></div>' +
            '<div class="fr-donut-detail" id="frDonutDetail"><strong>' + tr('tf_donut_select_prompt') + '</strong><span>' + tr('tf_donut_select_sub') + '</span></div>' +
            info(tr('tf_donut_info'));
    }

    function metricPairs(rows) {
        var pairs = {engagement: [], grade: [], approval: [], activities: [], resources: []};
        var activitiesByStudent = {};
        var gradeByStudent = {};
        var engagementByStudent = {};
        var resourcesByStudent = {};
        function numericIds(value) {
            return Array.isArray(value) ? value.map(function(id) { return Number(id); }).filter(function(id) {
                return isFinite(id) && id > 0;
            }) : [];
        }
        function idMap(value) {
            return numericIds(value).reduce(function(result, id) {
                result[String(id)] = true;
                return result;
            }, {});
        }
        rows.forEach(function(row) {
            var snap = row.snapshot;
            var cur = row.currentIndicator;
            if (!cur) { return; }
            var initialEngagement = number(snap.engagement);
            var currentEngagementValue = currentEngagement(row);
            if (initialEngagement !== null && currentEngagementValue !== null &&
                    (!engagementByStudent[row.key] || row.captured < engagementByStudent[row.key].captured)) {
                engagementByStudent[row.key] = {
                    before: initialEngagement,
                    after: currentEngagementValue,
                    captured: row.captured,
                    name: row.raw.student_name
                };
            }
            var initialGrade = courseTotalGrade(snap);
            var currentGrade = courseTotalGrade(cur);
            var reference = number(snap.gradeReference);
            reference = reference === null ? 60 : reference;
            if (initialGrade !== null && currentGrade !== null &&
                    (!gradeByStudent[row.key] || row.captured < gradeByStudent[row.key].captured)) {
                gradeByStudent[row.key] = {
                    before: initialGrade,
                    after: currentGrade,
                    reference: reference,
                    captured: row.captured,
                    name: row.raw.student_name
                };
            }
            var initialActivitiesDone = number(snap.activitiesCompleted);
            var initialActivitiesTotal = number(snap.activitiesTotal);
            var currentActivitiesDone = number(cur.activitiesCompleted);
            var initialPendingActivityIds = numericIds(snap.pendingActivityCmids);
            var currentCompletedActivityIds = idMap(cur.completedActivityCmids);
            /* target_items is the authoritative set selected in the intervention.
               It includes both items still pending and items completed afterwards,
               so totals stay aligned with the intervention detail. */
            if (row.trackedItems && row.trackedItems.length &&
                    (!activitiesByStudent[row.key] || row.captured < activitiesByStudent[row.key].captured)) {
                var trackedActivitiesDone = row.trackedItems.filter(function(item) { return item.done; }).length;
                var trackedActivitiesOverdue = row.trackedItems.filter(function(item) { return item.overdue; }).length;
                activitiesByStudent[row.key] = {
                    before: row.trackedItems.length,
                    after: trackedActivitiesDone,
                    remaining: Math.max(0, row.trackedItems.length - trackedActivitiesDone),
                    trackedOverdue: trackedActivitiesOverdue,
                    overdue: Math.max(0, Number(cur.overdueDeliveries || 0)),
                    pending: Math.max(0, row.trackedItems.length - trackedActivitiesDone - trackedActivitiesOverdue),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            } else if (initialPendingActivityIds.length &&
                    (!activitiesByStudent[row.key] || row.captured < activitiesByStudent[row.key].captured)) {
                var exactActivitiesDone = initialPendingActivityIds.filter(function(id) {
                    return currentCompletedActivityIds[String(id)];
                }).length;
                var completedAtIntervention = Math.max(0, initialActivitiesDone || 0);
                var trackedActivitiesTotal = initialActivitiesTotal !== null
                    ? Math.max(0, initialActivitiesTotal)
                    : initialPendingActivityIds.length + completedAtIntervention;
                var completedActivitiesNow = Math.min(trackedActivitiesTotal,
                    completedAtIntervention + exactActivitiesDone);
                activitiesByStudent[row.key] = {
                    before: trackedActivitiesTotal,
                    after: completedActivitiesNow,
                    remaining: Math.max(0, trackedActivitiesTotal - completedActivitiesNow),
                    trackedOverdue: Math.min(Math.max(0, trackedActivitiesTotal - completedActivitiesNow), Math.max(0, Number(cur.overdueDeliveries || 0))),
                    overdue: Math.max(0, Number(cur.overdueDeliveries || 0)),
                    pending: Math.max(0, trackedActivitiesTotal - completedActivitiesNow - Math.min(Math.max(0, trackedActivitiesTotal - completedActivitiesNow), Math.max(0, Number(cur.overdueDeliveries || 0)))),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            } else if (initialActivitiesDone !== null && initialActivitiesTotal !== null && currentActivitiesDone !== null &&
                    (!activitiesByStudent[row.key] || row.captured < activitiesByStudent[row.key].captured)) {
                // Compatibility for snapshots captured before item identifiers
                // were stored: retain the complete intervention baseline and use
                // the current completed count as its live state.
                var activitiesTracked = Math.max(0, initialActivitiesTotal);
                var activitiesCompletedNow = Math.min(activitiesTracked, Math.max(0, currentActivitiesDone));
                activitiesByStudent[row.key] = {
                    before: activitiesTracked,
                    after: activitiesCompletedNow,
                    remaining: Math.max(0, activitiesTracked - activitiesCompletedNow),
                    trackedOverdue: Math.min(Math.max(0, activitiesTracked - activitiesCompletedNow), Math.max(0, Number(cur.overdueDeliveries || 0))),
                    overdue: Math.max(0, Number(cur.overdueDeliveries || 0)),
                    pending: Math.max(0, activitiesTracked - activitiesCompletedNow - Math.min(Math.max(0, activitiesTracked - activitiesCompletedNow), Math.max(0, Number(cur.overdueDeliveries || 0)))),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            }
            // Keep the KPI based on each intervened student's pending resources.
            // The indicators already exclude modules marked as not tracked in the
            // Activities and resources tab, so only currently monitored resources
            // are included in the total.
            var initialResourcesAccessed = number(snap.resourcesAccessed);
            var initialResourcesTotal = number(snap.resourcesTotal);
            var currentResourcesAccessed = number(cur.resourcesAccessed);
            var initialPendingResourceIds = numericIds(snap.pendingResourceCmids);
            var currentAccessedResourceIds = idMap(cur.accessedResourceCmids);
            if (row.trackedResources && row.trackedResources.length &&
                    (!resourcesByStudent[row.key] || row.captured < resourcesByStudent[row.key].captured)) {
                var trackedResourcesDone = row.trackedResources.filter(function(item) { return item.done; }).length;
                resourcesByStudent[row.key] = {
                    before: row.trackedResources.length,
                    after: trackedResourcesDone,
                    remaining: Math.max(0, row.trackedResources.length - trackedResourcesDone),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            } else if (initialPendingResourceIds.length &&
                    (!resourcesByStudent[row.key] || row.captured < resourcesByStudent[row.key].captured)) {
                var exactResourcesAccessed = initialPendingResourceIds.filter(function(id) {
                    return currentAccessedResourceIds[String(id)];
                }).length;
                var accessedAtIntervention = Math.max(0, initialResourcesAccessed || 0);
                var trackedResourcesTotal = initialResourcesTotal !== null
                    ? Math.max(0, initialResourcesTotal)
                    : initialPendingResourceIds.length + accessedAtIntervention;
                var accessedResourcesNow = Math.min(trackedResourcesTotal,
                    accessedAtIntervention + exactResourcesAccessed);
                resourcesByStudent[row.key] = {
                    before: trackedResourcesTotal,
                    after: accessedResourcesNow,
                    remaining: Math.max(0, trackedResourcesTotal - accessedResourcesNow),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            } else if (initialResourcesAccessed !== null && initialResourcesTotal !== null && currentResourcesAccessed !== null &&
                    (!resourcesByStudent[row.key] || row.captured < resourcesByStudent[row.key].captured)) {
                var resourcesTracked = Math.max(0, initialResourcesTotal);
                var resourcesAccessedNow = Math.min(resourcesTracked, Math.max(0, currentResourcesAccessed));
                resourcesByStudent[row.key] = {
                    before: resourcesTracked,
                    after: resourcesAccessedNow,
                    remaining: Math.max(0, resourcesTracked - resourcesAccessedNow),
                    captured: row.captured,
                    name: row.raw.student_name
                };
            }
        });
        Object.keys(engagementByStudent).forEach(function(key) {
            pairs.engagement.push(engagementByStudent[key]);
        });
        Object.keys(gradeByStudent).forEach(function(key) {
            var gradePair = gradeByStudent[key];
            pairs.grade.push(gradePair);
            pairs.approval.push({
                before: gradePair.before >= gradePair.reference ? 100 : 0,
                after: gradePair.after >= gradePair.reference ? 100 : 0,
                captured: gradePair.captured,
                name: gradePair.name
            });
        });
        Object.keys(resourcesByStudent).forEach(function(key) {
            pairs.resources.push(resourcesByStudent[key]);
        });
        Object.keys(activitiesByStudent).forEach(function(key) {
            pairs.activities.push(activitiesByStudent[key]);
        });
        return pairs;
    }

    function analyticalSummaryHtml(rows, groups, pairs) {
        function summarize(items) {
            var valid = items.filter(function(item) { return number(item.before) !== null && number(item.after) !== null; });
            return {
                count: valid.length,
                average: avg(valid.map(function(item) { return Number(item.after) - Number(item.before); })),
                improved: valid.filter(function(item) { return Number(item.after) > Number(item.before); }),
                declined: valid.filter(function(item) { return Number(item.after) < Number(item.before); })
            };
        }
        function names(items) {
            var unique = {};
            items.forEach(function(item) {
                var name = norm(item.name || (item.latest && item.latest.raw.student_name));
                if (name) { unique[name] = true; }
            });
            var list = Object.keys(unique);
            return list.length ? list.slice(0, 12).join(', ') + (list.length > 12 ? ' e mais ' + (list.length - 12) : '') : 'nenhum estudante identificado';
        }
        function metricSentence(label, summary) {
            if (!summary.count) { return 'Não há pares comparáveis suficientes para avaliar ' + label + ' no recorte.'; }
            var direction = summary.average > 0.05 ? 'aumentou' : summary.average < -0.05 ? 'diminuiu' : 'permaneceu estável';
            return 'Na comparação antes × depois, ' + label + ' ' + direction + ' em média ' +
                formatNumber(Math.abs(summary.average), ' pontos') + '. ' + summary.improved.length + ' de ' + summary.count +
                ' estudantes melhoraram e ' + summary.declined.length + ' apresentaram queda.';
        }
        var total = groups.length;
        var responded = groups.filter(function(group) { return group.responded; });
        var evolved = groups.filter(function(group) { return group.reached; });
        var partial = groups.filter(function(group) { return progressState(group) === 'partial'; });
        var noResponse = groups.filter(function(group) { return !group.responded; });
        var engagement = summarize(pairs.engagement), grade = summarize(pairs.grade);
        var reasonResults = REASONS.map(function(reason) {
            var reasonGroups = groupStudents(rows.filter(function(row) { return row.reason === reason; }));
            return {label: REASON_META[reason].label(), total: reasonGroups.length,
                responded: reasonGroups.filter(function(group) { return group.responded; }).length};
        }).filter(function(item) { return item.total > 0; });
        reasonResults.sort(function(a, b) { return (b.responded / b.total) - (a.responded / a.total); });
        var sustained = sustainedAfterSeven(groups);
        var findings = [
            'Foram acompanhados ' + total + ' estudantes. ' + responded.length + ' (' + pctText(responded.length, total) +
                ') retornaram ao Moodle após a intervenção; ' + evolved.length + ' (' + pctText(evolved.length, total) +
                ') atingiram integralmente o objetivo observado.',
            metricSentence('o engajamento', engagement),
            metricSentence('a nota', grade)
        ];
        if (sustained.eligible) {
            findings.push(sustained.count + ' de ' + sustained.eligible + ' estudantes elegíveis (' +
                pctText(sustained.count, sustained.eligible) + ') mantiveram atividade após sete dias.');
        }
        if (reasonResults.length) {
            var best = reasonResults[0], weakest = reasonResults.length > 1 ? reasonResults[reasonResults.length - 1] : null;
            findings.push('O maior retorno foi observado em “' + best.label + '”: ' + best.responded + ' de ' + best.total +
                ' (' + pctText(best.responded, best.total) + ').' + (weakest ? ' O menor ocorreu em “' + weakest.label + '”: ' +
                    weakest.responded + ' de ' + weakest.total + ' (' + pctText(weakest.responded, weakest.total) + ').' : ''));
        }
        var recommendations = [];
        if (noResponse.length) { recommendations.push('Priorizar novo contato com ' + names(noResponse) + ', que ainda não retornaram após a intervenção.'); }
        if (partial.length) { recommendations.push('Reavaliar a estratégia de ' + names(partial) + ', que retornaram, mas ainda não alcançaram o resultado integral.'); }
        if (grade.declined.length || engagement.declined.length) { recommendations.push('Revisar individualmente os casos com queda: ' + names(grade.declined.concat(engagement.declined)) + '.'); }
        if (!recommendations.length) { recommendations.push('Manter o acompanhamento periódico para confirmar a continuidade dos avanços observados.'); }
        var improved = engagement.improved.concat(grade.improved);
        var issuedAt = new Date().toLocaleString([], {dateStyle: 'long', timeStyle: 'short'});
        var period = filters.from || filters.to ? (filters.from ? new Date(filters.from + 'T00:00:00').toLocaleDateString() : 'início') +
            ' a ' + (filters.to ? new Date(filters.to + 'T00:00:00').toLocaleDateString() : 'hoje') : 'Todo o período disponível';
        var interventionRows = rows.slice().sort(function(a, b) { return b.captured - a.captured; }).map(function(row) {
            var status = !row.response ? 'Sem retorno' : row.reached === true ? 'Objetivo alcançado' : 'Em acompanhamento';
            return '<tr><td>' + esc(formatDateTime(row.captured)) + '</td><td>' + esc(row.raw.student_name || row.raw.student_email || 'Não identificado') +
                '</td><td>' + esc(REASON_META[row.reason].label()) + '</td><td>' + esc(row.raw.teacher_name || row.raw.teachername || row.raw.sender_name || '—') +
                '</td><td>' + esc(status) + '</td><td>' + esc(row.firstResponse ? duration(row.firstResponse - row.captured) : 'Sem retorno') + '</td></tr>';
        }).join('');
        return '<section class="fr-card fr-analytical-summary fr-export-only" data-fr-scope="overview"><header class="fr-export-report-head">' +
            '<div><small>MWA DASHBOARD · RELATÓRIO ANALÍTICO</small><h1>Relatório de Acompanhamento e Evolução da Aprendizagem</h1></div>' +
            '<dl><div><dt>Data de expedição</dt><dd>' + esc(issuedAt) + '</dd></div><div><dt>Período analisado</dt><dd>' + esc(period) +
            '</dd></div><div><dt>Intervenções analisadas</dt><dd>' + rows.length + '</dd></div><div><dt>Estudantes acompanhados</dt><dd>' + total + '</dd></div></dl></header>' +
            '<div class="fr-analytical-title">' + svg('sparkles', 20) + '<div><h2>Análise pedagógica do período</h2><p>Leitura automática dos dados antes e depois das intervenções.</p></div></div>' +
            '<div class="fr-analytical-grid"><div><h3>O que está acontecendo</h3><ul>' + findings.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('') +
            '</ul></div><div><h3>O que melhorou</h3><p>' + (improved.length ? 'Houve melhora mensurável para: ' + esc(names(improved)) + '.' :
                'Ainda não há melhora mensurável nos pares comparáveis deste recorte.') + '</p><h3>Pontos de atenção e próximos passos</h3><ul>' +
            recommendations.map(function(item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul></div></div>' +
            '<section class="fr-export-interventions"><h2>Intervenções incluídas no relatório</h2><p>Relação cronológica das ações do recorte e do retorno observado posteriormente no Moodle.</p>' +
            '<table><thead><tr><th>Data da intervenção</th><th>Estudante</th><th>Motivo</th><th>Responsável</th><th>Situação observada</th><th>Tempo até o retorno</th></tr></thead><tbody>' +
            interventionRows + '</tbody></table></section>' +
            '<p class="fr-analytical-note">As variações mostram associação temporal após as intervenções e não comprovam causalidade. A leitura depende da disponibilidade de dados comparáveis.</p></section>';
    }

    function deltaCard(label, pairs, suffix, invert, mode, detail) {
        var aggregate = mode === 'sum' ? function(values) {
            return values.length ? values.reduce(function(total, value) { return total + Number(value || 0); }, 0) : null;
        } : avg;
        var before = aggregate(pairs.map(function(pair) { return pair.before; }));
        var after = aggregate(pairs.map(function(pair) { return pair.after; }));
        if (detail === 'tracked' || detail === 'resources') {
            var remainingAtIntervention = before === null ? 0 : before;
            var completedAfter = after === null ? 0 : after;
            var hasExplicitRemaining = pairs.length && pairs.every(function(pair) {
                return number(pair.remaining) !== null;
            });
            var remainingNow = hasExplicitRemaining ? pairs.reduce(function(total, pair) {
                return total + Math.max(0, Number(pair.remaining || 0));
            }, 0) : Math.max(0, remainingAtIntervention - completedAfter);
            var trackedTotal = remainingNow + completedAfter;
            var overdueNow = detail === 'tracked' ? pairs.reduce(function(total, pair) {
                var trackedOverdue = number(pair.trackedOverdue);
                return total + Math.max(0, trackedOverdue === null ? Number(pair.overdue || 0) : trackedOverdue);
            }, 0) : 0;
            overdueNow = Math.min(remainingNow, overdueNow);
            var pendingNow = Math.max(0, remainingNow - overdueNow);
            var progressChip = '<small class="up">↑ ' + formatNumber(completedAfter) + '</small>';
            if (detail === 'tracked') {
                // The aggregate follow-up KPI measures actionable progress only.
                // Expired activities remain visible in the individual report,
                // but are excluded from this total and from the KPI breakdown.
                var actionableTotal = pendingNow + completedAfter;
                return '<div class="fr-delta fr-activity-delta"><span class="fr-delta-label">' + label + '</span>' +
                    '<div class="fr-status-grid is-three"><strong class="total"><b>' + formatNumber(actionableTotal) + '</b><small>' + esc(tr('tf_ir_total')) + '</small></strong>' +
                    '<strong class="pending"><b>' + formatNumber(pendingNow) + '</b><small>' + esc(tr('tf_ir_pending')) + '</small></strong>' +
                    '<strong class="completed"><b>' + formatNumber(completedAfter) + '</b><small>' + esc(tr('tf_ir_completed')) + '</small></strong></div>' + progressChip + '</div>';
            }
            return '<div class="fr-delta fr-activity-delta"><span class="fr-delta-label">' + label + '</span>' +
                '<div class="fr-status-grid is-three"><strong class="total"><b>' + formatNumber(trackedTotal) + '</b><small>' + esc(tr('tf_ir_total')) + '</small></strong>' +
                '<strong class="pending"><b>' + formatNumber(remainingNow) + '</b><small>' + esc(tr('tf_ir_pending')) + '</small></strong>' +
                '<strong class="completed"><b>' + formatNumber(completedAfter) + '</b><small>' + esc(tr('tf_ir_accessed')) + '</small></strong></div>' + progressChip + '</div>';
        }
        var gradeMetric = lower(label).indexOf('nota') >= 0;
        function metricValue(value, valueSuffix) {
            if (value === null || value === undefined || isNaN(value)) { return '—'; }
            return gradeMetric ? Number(value).toFixed(1) + (valueSuffix || '') : formatNumber(value, valueSuffix);
        }
        var delta = before !== null && after !== null ? after - before : null;
        var good = delta !== null && (invert ? delta < 0 : delta > 0);
        var deltaText = delta === null ? tr('tf_no_tracked_items') : delta === 0 ? '0' :
            (delta > 0 ? '↑ +' : '↓ ') + metricValue(delta, suffix);
        var detailClass = null;
        if (detail === 'approval') {
            var approvedBefore = pairs.filter(function(pair) { return pair.before >= 100; }).length;
            var approvedAfter = pairs.filter(function(pair) { return pair.after >= 100; }).length;
            var approvalRate = pairs.length ? Math.round(approvedAfter * 1000 / pairs.length) / 10 : null;
            var approvalGain = approvedAfter - approvedBefore;
            var approvalChip = '<small class="up">↑ ' + Math.max(0, approvalGain) + '</small>';
            return '<div class="fr-delta fr-approval-delta"><span class="fr-delta-label">' + label + '</span>' +
                '<div class="fr-situation-grid"><strong class="total"><b>' + pairs.length + '</b><small>' + tr('tf_ir_total') + '</small></strong>' +
                '<strong class="approved"><b>' + approvedAfter + '</b><small>' + tr('tf_visual_approved') + '</small></strong></div>' + approvalChip + '</div>';
        }
        var beforeClass = before === 0 ? 'zero' : '';
        var afterClass = after === 0 ? 'zero' : (invert ? 'neutral' : 'positive');
        var afterText = after === 0 && suffix ? '0' + suffix : metricValue(after, suffix);
        return '<div class="fr-delta"><span class="fr-delta-label">' + label + '</span><strong><b class="' + beforeClass + '">' + metricValue(before, suffix) + '</b><em>→</em><b class="' + afterClass + '">' + afterText + '</b></strong>' +
            '<small class="' + (detailClass !== null ? detailClass : delta === null ? '' : delta === 0 ? 'zero' : good ? 'up' : 'down') + '">' +
            deltaText + '</small></div>';
    }

    function lineChart(pairs) {
        function namesThatImproved(values) {
            var seen = {};
            return values.filter(function(value) { return value.after > value.before && norm(value.name); })
                .map(function(value) { return norm(value.name); })
                .filter(function(name) {
                    var key = lower(name);
                    if (seen[key]) { return false; }
                    seen[key] = true;
                    return true;
                });
        }
        var series = [
            {label: tr('tf_chart_engagement'), color: '#0b5be7', values: pairs.engagement, visual: 'engagement'},
            {label: tr('tf_chart_grade'), color: '#11813b', values: pairs.grade, visual: 'grade'},
            {label: tr('tf_chart_approval'), color: '#6423a5', values: pairs.approval, approval: true, visual: 'approval'},
            {label: tr('tf_progress_activities_label'), color: '#d88700', values: pairs.activities, total: true, progress: true, actionable: true},
            {label: tr('tf_progress_resources_label'), color: '#008f95', values: pairs.resources, total: true, progress: true}
        ].filter(function(item) { return item.values.length; });
        if (!series.length) { return '<div class="fr-no-data">Sem pares snapshot × atual elegíveis para o gráfico.</div>'; }
        function weekKey(timestampValue) {
            var date = new Date(Number(timestampValue) * 1000);
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
            return localDateKey(date);
        }
        var timelineWeeks = {};
        series.forEach(function(item) {
            item.values.forEach(function(value) { timelineWeeks[weekKey(value.captured)] = true; });
        });
        var weeks = Object.keys(timelineWeeks).sort();
        var panels = weeks.map(function(week, weekIndex) {
            var startDate = new Date(week + 'T12:00:00');
            var endDate = new Date(startDate.getTime());
            endDate.setDate(endDate.getDate() + 6);
            var dateLabel = startDate.toLocaleDateString([], {day: '2-digit', month: '2-digit'}) + ' – ' +
                endDate.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
            var metrics = series.map(function(item) {
                // Weekly panels are cumulative. This keeps the latest panel on
                // the same student base as the summary KPIs above it. Using
                // only records first captured in the selected week made the
                // summary show 1 approved out of 2 while the chart showed 100%
                // because only the newly added approved learner was included.
                var values = item.values.filter(function(value) { return weekKey(value.captured) <= week; });
                if (!values.length) { return ''; }
                var before = item.approval ? (pct(values.filter(function(value) { return value.before >= 100; }).length, values.length) || 0) :
                    item.total ? values.reduce(function(total, value) {
                        var initial = Number(value.before || 0);
                        var trackedOverdue = number(value.trackedOverdue);
                        var expired = trackedOverdue === null ? Number(value.overdue || 0) : trackedOverdue;
                        return total + (item.actionable ? Math.max(0, initial - expired) : initial);
                    }, 0) :
                        (avg(values.map(function(value) { return value.before; })) || 0);
                var after = item.approval ? (pct(values.filter(function(value) { return value.after >= 100; }).length, values.length) || 0) :
                    item.total ? values.reduce(function(total, value) { return total + Number(value.after || 0); }, 0) :
                        (avg(values.map(function(value) { return value.after; })) || 0);
                var delta = item.progress ? round(after, 1) : round(after - before, 1);
                var students = item.approval ? values.filter(function(value) { return value.after >= 100 && norm(value.name); })
                    .map(function(value) { return norm(value.name); }) : item.progress ? values.filter(function(value) {
                        return Number(value.after || 0) > 0 && norm(value.name);
                    }).map(function(value) { return norm(value.name); }) : namesThatImproved(values);
                var detail = JSON.stringify({series: item.label, label: dateLabel, value: round(after, 1), before: round(before, 1),
                    after: round(after, 1), delta: delta, students: students, approval: !!item.approval,
                    comparison: true, color: item.color});
                if (item.progress) {
                    var progressPercent = before > 0 ? Math.max(0, Math.min(100, Math.round(after / before * 100))) : 0;
                    var pendingPercent = Math.max(0, 100 - progressPercent);
                    var completedLabel = item.actionable ? tr('tf_ir_completed') : tr('tf_ir_accessed');
                    return '<button type="button" class="fr-chart-point fr-vcompare-metric fr-share-metric" data-fr-chart-detail="' + esc(detail) +
                        '" style="--metric-color:' + item.color + '" aria-label="' + esc(item.label + ', ' + progressPercent + '%') + '">' +
                        '<span class="fr-share-percent">' + progressPercent + '%</span>' +
                        '<span class="fr-share-track"><i class="done" style="width:' + progressPercent + '%"></i><i class="pending" style="width:' + pendingPercent + '%"></i></span>' +
                        '<span class="fr-share-labels"><small><i class="done"></i>' + esc(completedLabel) + ' ' + progressPercent + '%</small>' +
                        '<small><i class="pending"></i>' + esc(tr('tf_ir_pending')) + ' ' + pendingPercent + '%</small></span>' +
                        '<span class="fr-vcompare-name"><i></i>' + esc(item.label) + '</span></button>';
                }
                if (item.visual) {
                    var visualPercent;
                    var visualHeadline;
                    var doneVisualLabel;
                    var remainingVisualLabel;
                    if (item.visual === 'grade') {
                        var gradeTarget = avg(values.map(function(value) { return Number(value.reference || 60); })) || 60;
                        visualPercent = gradeTarget > 0 ? Math.max(0, Math.min(100, Math.round(after / gradeTarget * 100))) : 0;
                        var missingGradePoints = Math.max(0, gradeTarget - after);
                        visualHeadline = missingGradePoints > 0
                            ? tr('tf_visual_missing_points').replace('{points}', formatNumber(missingGradePoints))
                            : tr('tf_visual_goal_reached');
                        doneVisualLabel = tr('tf_visual_current_points').replace('{points}', formatNumber(after));
                        remainingVisualLabel = tr('tf_visual_goal_points').replace('{points}', formatNumber(gradeTarget));
                    } else if (item.visual === 'approval') {
                        visualPercent = Math.max(0, Math.min(100, Math.round(after)));
                        visualHeadline = visualPercent + '%';
                        doneVisualLabel = tr('tf_visual_approved');
                        remainingVisualLabel = tr('tf_visual_not_approved');
                    } else {
                        visualPercent = Math.max(0, Math.min(100, Math.round(after)));
                        visualHeadline = visualPercent + '%';
                        doneVisualLabel = tr('tf_visual_current');
                        remainingVisualLabel = tr('tf_visual_to_100');
                    }
                    var visualRemaining = Math.max(0, 100 - visualPercent);
                    return '<button type="button" class="fr-chart-point fr-vcompare-metric fr-share-metric" data-fr-chart-detail="' + esc(detail) +
                        '" style="--metric-color:' + item.color + '" aria-label="' + esc(item.label + ', ' + visualPercent + '%') + '">' +
                        '<span class="fr-share-percent">' + esc(visualHeadline) + '</span>' +
                        '<span class="fr-share-track"><i class="done" style="width:' + visualPercent + '%"></i><i class="pending" style="width:' + visualRemaining + '%"></i></span>' +
                        '<span class="fr-share-labels"><small><i class="done"></i>' + esc(doneVisualLabel) + '</small>' +
                        '<small><i class="pending"></i>' + esc(remainingVisualLabel) + '</small></span>' +
                        '<span class="fr-vcompare-name"><i></i>' + esc(item.label) + '</span></button>';
                }
                var scaleMaximum = item.total ? Math.max(1, before, after) : 100;
                var beforeHeight = Math.max(0, Math.min(100, before / scaleMaximum * 100));
                var afterHeight = Math.max(0, Math.min(100, after / scaleMaximum * 100));
                var deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'zero';
                return '<button type="button" class="fr-chart-point fr-vcompare-metric" data-fr-chart-detail="' + esc(detail) +
                    '" style="--metric-color:' + item.color + '" aria-label="' + esc(item.label + ', ' + dateLabel) + '">' +
                    '<span class="fr-vcompare-delta ' + deltaClass + '">' + (delta > 0 ? '+' : '') + formatNumber(delta) + '</span>' +
                    '<span class="fr-vcompare-bars"><i class="before" style="height:' + beforeHeight + '%"><b>' + formatNumber(before) + '</b></i>' +
                    '<i class="after" style="height:' + afterHeight + '%"><b>' + formatNumber(after) + '</b></i></span>' +
                    '<span class="fr-vcompare-name"><i></i>' + esc(item.label) + '</span></button>';
            }).join('');
            return '<section class="fr-vcompare-week' + (weekIndex === weeks.length - 1 ? ' active' : '') + '" data-fr-week="' + weekIndex + '">' +
                '<div class="fr-vcompare-metrics">' + metrics + '</div></section>';
        }).join('');
        var weekLabels = weeks.map(function(week) {
            var start = new Date(week + 'T12:00:00');
            var end = new Date(start.getTime());
            end.setDate(end.getDate() + 6);
            return start.toLocaleDateString([], {day: '2-digit', month: '2-digit'}) + ' – ' +
                end.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
        });
        var controls = '<div class="fr-vcompare-controls" data-fr-week-index="' + (weeks.length - 1) + '" data-fr-week-total="' + weeks.length +
            '" data-fr-week-labels="' + esc(JSON.stringify(weekLabels)) + '"><button type="button" data-fr-week-nav="prev" aria-label="' +
            esc(tr('tf_week_previous')) + '">‹</button><strong><span>' + esc(tr('tf_week')) + ' ' + weeks.length + ' ' + esc(tr('tf_week_of')) +
            ' ' + weeks.length + '</span><small>' + esc(weekLabels[weeks.length - 1]) + '</small></strong><button type="button" data-fr-week-nav="next" disabled aria-label="' +
            esc(tr('tf_week_next')) + '">›</button></div>';
        return '<div class="fr-line-chart fr-vcompare-chart"><div class="fr-vcompare-head">' +
            controls + '</div><div class="fr-vcompare-stage">' + panels + '</div>' +
            '<div class="fr-chart-detail" id="frChartDetail"><strong>' + tr('tf_linechart_select') + '</strong><span>' + tr('tf_linechart_select_sub') + '</span></div></div>';
    }

    function interactionHtml(rows, groups) {
        var unique = groups.length;
        function rowStudentNames(test) {
            var names = {};
            rows.forEach(function(row) {
                if (test(row)) { names[row.key] = row.raw.student_name || 'Estudante'; }
            });
            return Object.keys(names).map(function(key) { return names[key]; });
        }
        var activities = rowStudentNames(function(row) {
            // This card represents graded activities only. Course accesses,
            // forum reads and other academic logs must not mark a student as
            // having completed an activity.
            var before = number(row.snapshot && row.snapshot.activitiesCompleted);
            var current = number(row.currentIndicator && row.currentIndicator.activitiesCompleted);
            return before !== null && current !== null && current > before;
        });
        var resources = rowStudentNames(function(row) {
            return row.after.some(isResourceAccess);
        });
        var attempts = rowStudentNames(function(row) {
            return row.after.some(function(log) { return /attempt|tentativa/.test(eventText(log)); });
        });
        var items = [['learning', activities, tr('tf_journey_activities'), '#1769e0'],
            ['document', resources, tr('tf_journey_resources'), '#198754'],
            ['refresh', attempts, tr('tf_journey_attempts'), '#7030a0']];
        return '<div class="fr-interaction-compact">' + items.map(function(item) {
            var percent = pct(item[1].length, unique) || 0;
            return '<button type="button" class="fr-interaction-clickable" data-fr-interaction="' +
                esc(JSON.stringify({label: item[2], names: item[1], color: item[3]})) + '" style="--interaction-color:' + item[3] + '">' +
                '<span class="fr-interaction-label"><i>' + svg(item[0], 17) + '</i>' + esc(item[2]) + '</span>' +
                '<span class="fr-interaction-track"><i style="width:' + percent + '%"></i></span>' +
                '<strong>' + item[1].length + ' <small>(' + percent + '%)</small></strong></button>';
        }).join('') + '</div><div class="fr-interaction-detail" id="frInteractionDetail"><strong>' + tr('tf_interaction_select') + '</strong><span>' + tr('tf_interaction_select_sub') + '</span></div>' +
            info(tr('tf_interaction_info'));
    }

    function continuity(groups, startDays, endDays) {
        var now = Date.now() / 1000;
        var eligible = groups.filter(function(group) { return now - group.latest.captured >= endDays * DAY; });
        var activeGroups = eligible.filter(function(group) {
            var start = group.latest.captured + startDays * DAY;
            var end = group.latest.captured + endDays * DAY;
            return group.latest.after.some(function(log) {
                var time = timestamp(log);
                return (startDays === 0 ? time >= start : time > start) && time <= end;
            });
        });
        return {count: activeGroups.length, eligible: eligible.length, groups: activeGroups};
    }

    function sustainedAfterSeven(groups) {
        var now = Date.now() / 1000;
        var eligible = groups.filter(function(group) {
            return now - group.latest.captured >= 7 * DAY;
        });
        var sustainedGroups = eligible.filter(function(group) {
            var start = group.latest.captured + 7 * DAY;
            return group.latest.after.some(function(log) { return timestamp(log) > start; });
        });
        return {count: sustainedGroups.length, eligible: eligible.length, groups: sustainedGroups, eligibleGroups: eligible};
    }

    function continuityHtml(groups) {
        var sustained = sustainedAfterSeven(groups);
        var total = groups.length;
        var now = Date.now() / 1000;
        var observing = groups.filter(function(group) {
            return now - group.latest.captured < 7 * DAY;
        });
        var notSustainedGroups = sustained.eligibleGroups.filter(function(group) {
            return sustained.groups.indexOf(group) < 0;
        });
        var notSustained = Math.max(0, sustained.eligible - sustained.count);
        var segments = [
            {label: tr('tf_cont_sustained'), count: sustained.count, names: sustained.groups.map(function(group) { return group.name; }), color: '#198754', sub: tr('tf_cont_sustained_sub')},
            {label: tr('tf_cont_observing'), count: observing.length, names: observing.map(function(group) { return group.name; }), color: '#ff8a00', sub: tr('tf_cont_observing_sub')},
            {label: tr('tf_cont_not_sustained'), count: notSustained, names: notSustainedGroups.map(function(group) { return group.name; }), color: '#e32929', sub: tr('tf_cont_not_sustained_sub')}
        ];
        var bar = segments.map(function(segment) {
            var percent = pct(segment.count, total) || 0;
            if (!percent) { return ''; }
            return '<button type="button" class="fr-cont-clickable" style="width:' + percent + '%;--continuity-color:' + segment.color + '" data-fr-continuity="' +
                esc(JSON.stringify({label: segment.label, names: segment.names, color: segment.color})) + '" title="' + esc(segment.label + ': ' + segment.count + ' (' + percent + '%)') + '">' +
                '<strong>' + segment.count + '</strong><span>' + percent + '%</span></button>';
        }).join('');
        var legend = segments.map(function(segment) {
            var percent = pct(segment.count, total) || 0;
            return '<button type="button" class="fr-continuity-key fr-cont-clickable" style="--continuity-color:' + segment.color + '" data-fr-continuity="' +
                esc(JSON.stringify({label: segment.label, names: segment.names, color: segment.color})) + '"><i></i><span><strong>' + esc(segment.label) +
                '</strong><small>' + esc(segment.sub) + '</small></span><b>' + segment.count + ' · ' + percent + '%</b></button>';
        }).join('');
        return '<div class="fr-continuity-compact"><div class="fr-continuity-evaluated"><span>' + tr('tf_cont_window_label') + '</span><strong>' +
            tr('tf_cont_window_students').replace('{eligible}', sustained.eligible).replace('{total}', total) + '</strong></div>' +
            '<div class="fr-continuity-stack">' + bar + '</div><div class="fr-continuity-keys">' + legend + '</div></div>' +
            '<div class="fr-continuity-detail" id="frContinuityDetail"><strong>' + tr('tf_cont_select_prompt') + '</strong><span>' + tr('tf_cont_select_sub') + '</span></div>' +
            info(tr('tf_cont_info'));
    }

    function aiReportHtml() {
        var config = Store.getConfig ? Store.getConfig() : {};
        var body = '';
        if (!aiReport && !aiReportLoading && !aiReportError && config.ia_enabled) {
            return '<section class="ai-box fr-ai-standard-box" data-fr-scope="overview">' +
                '<div class="ai-box-title">&#10022; ' + tr('tf_ai_report_title') + '</div>' +
                '<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>' +
                '<span>' + tr('tf_ai_generate_hint') + '</span></div>' +
                '<div class="fr-ai-standard-actions"><button type="button" class="btn-accent fr-ai-generate" id="frAiGenerate">' +
                svg('sparkles', 16) + ' ' + tr('tf_ai_generate_btn') + '</button></div></section>';
        }
        if (aiReportLoading) {
            body = '<div class="fr-ai-loading"><span class="spinner"></span><p>' + tr('tf_ai_loading') + '</p></div>';
        } else if (aiReportError) {
            body = '<div class="fr-ai-error">' + svg('exclamation', 18) + '<p>' + esc(aiReportError) + '</p></div>';
        } else if (aiReport) {
            body = '<div class="fr-ai-content">' + formatAiReport(aiReport) + '</div>';
        } else if (!config.ia_enabled) {
            body = '<div class="fr-ai-empty">' + svg('sparkles', 28) + '<div><b>' + tr('tf_ai_not_configured') + '</b><p>' + tr('tf_ai_not_configured_sub') + '</p></div></div>';
        }
        return '<section class="fr-card fr-ai-report" data-fr-scope="overview"><div class="fr-ai-title"><div><span>' +
            svg('sparkles', 20) + '</span><h2>' + tr('tf_ai_report_title') + '</h2></div>' +
            (aiReport ? '<button type="button" class="fr-btn fr-ai-generate" id="frAiRegenerate">' + svg('refresh', 15) + ' ' + tr('tf_ai_regen_btn') + '</button>' : '') +
            '</div>' + body + info(tr('tf_ai_report_notice')) + '</section>';
    }

    function formatAiReport(text) {
        var html = '';
        var listType = '';
        var sectionTitles = [
            'síntese executiva', 'sintese executiva', 'avanços observados', 'avancos observados',
            'alunos que precisam de novo acompanhamento', 'estudantes que precisam de novo acompanhamento',
            'padrões por motivo', 'padroes por motivo', 'recomendações práticas', 'recomendacoes praticas',
            'limitações dos dados', 'limitacoes dos dados', 'conclusão', 'conclusao',
            'executive summary', 'observed progress', 'students requiring follow-up',
            'patterns by reason', 'practical recommendations', 'data limitations', 'conclusion'
        ];
        function comparable(value) {
            var plain = norm(value).replace(/^\d+[.)]\s*/, '').replace(/:$/, '').toLowerCase();
            if (plain.normalize) { plain = plain.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
            return plain;
        }
        function clean(value) {
            return esc(norm(value).replace(/^#{1,6}\s*/, '').replace(/^\*\*(.*?)\*\*:?$/, '$1:')
                .replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/`([^`]*)`/g, '$1'));
        }
        function closeList() {
            if (listType) { html += '</' + listType + '>'; listType = ''; }
        }
        function upperFirst(value) {
            return value ? value.charAt(0).toLocaleUpperCase() + value.slice(1) : value;
        }
        norm(text).split(/\r?\n/).forEach(function(rawLine) {
            var line = norm(rawLine);
            if (!line) { closeList(); return; }
            var bullet = line.match(/^[-*•]\s+(.+)$/);
            var numbered = line.match(/^\d+[.)]\s+(.+)$/);
            var isKnownTitle = sectionTitles.some(function(title) {
                return comparable(title) === comparable(line);
            });
            if (bullet || (numbered && !isKnownTitle)) {
                var desired = numbered ? 'ol' : 'ul';
                if (listType !== desired) { closeList(); listType = desired; html += '<' + desired + '>'; }
                html += '<li>' + clean((bullet || numbered)[1]) + '</li>';
                return;
            }
            closeList();
            var isMarkdownTitle = /^#{1,6}\s+/.test(line) || /^\*\*.*\*\*:?$/.test(line);
            var isPlainTitle = line.length <= 90 && (/:$/.test(line) || isKnownTitle);
            if (isMarkdownTitle || isPlainTitle) {
                html += '<h3>' + upperFirst(clean(line).replace(/^\d+[.)]\s*/, '').replace(/:$/, '')) + '</h3>';
            } else {
                html += '<p>' + clean(line) + '</p>';
            }
        });
        closeList();
        return html;
    }

    function buildAiPrompt(rows) {
        var groups = groupStudents(rows);
        var lines = groups.slice(0, 100).map(function(group) {
            var row = group.latest;
            var snapshot = row.snapshot || {};
            var beforeEngagement = number(snapshot.engagement);
            var afterEngagement = currentEngagement(row);
            var beforeGrade = courseTotalGrade(snapshot);
            var afterGrade = row.currentIndicator ? courseTotalGrade(row.currentIndicator) : null;
            return [
                'Estudante: ' + norm(row.raw.student_name || row.raw.student_email || 'Não identificado'),
                tr('tf_ai_motivo').replace('{v}', REASON_META[row.reason].label()),
                tr('tf_ai_intervencao').replace('{v}', formatDateTime(row.captured)),
                tr('tf_ai_engagement_delta').replace('{before}', formatNumber(beforeEngagement, '%')).replace('{after}', formatNumber(afterEngagement, '%')),
                tr('tf_ai_grade_delta').replace('{before}', formatNumber(beforeGrade, '')).replace('{after}', formatNumber(afterGrade, '')),
                tr('tf_ai_after_events').replace('{n}', row.after.length),
                tr('tf_ai_after_academic').replace('{n}', row.academic.length),
                tr('tf_ai_first_return').replace('{v}', row.firstResponse ? duration(row.firstResponse - row.captured) : tr('tf_ai_no_return')),
                tr('tf_ai_result').replace('{v}', !row.response ? tr('tf_ai_result_none') : row.reached === true ? tr('tf_ai_result_full') : tr('tf_ai_result_partial')),
                tr('tf_ai_continuity').replace('{v}', row.after.some(function(log) { return timestamp(log) > row.captured + 7 * DAY; }) ? tr('tf_ai_continuity_yes') : tr('tf_ai_continuity_no'))
            ].join(' | ');
        });
        return 'Crie um relatório pedagógico em português brasileiro comparando os dados antes e depois das intervenções. ' +
            'Use exclusivamente os dados fornecidos, não invente causas nem informações. Diferencie associação de causalidade. ' +
            'Estruture em: síntese executiva; avanços observados; alunos que precisam de novo acompanhamento; padrões por motivo; ' +
            'recomendações práticas; limitações dos dados. Destaque números e nomes somente quando estiverem nos dados. ' +
            'Não use Markdown, hashtags, asteriscos, tabelas ou blocos de código. Escreva títulos simples em linhas separadas, parágrafos curtos e listas claras.\n\n' +
            'Recorte: ' + rows.length + ' intervenções e ' + groups.length + ' estudantes únicos.\n' + lines.join('\n');
    }

    function generateAiReport(allRows) {
        var config = Store.getConfig ? Store.getConfig() : {};
        var rows = filterRows(allRows);
        if (!config.ia_enabled) {
            aiReportError = tr('ai_unavailable_message', '🔒 Os recursos de Inteligência Artificial estão indisponíveis. Configure uma chave de API válida na administração do MWA.');
            aiReport = '';
            renderReport(allRows);
            return;
        }
        if (!rows.length) {
            aiReportError = 'Não há dados no recorte atual para analisar.';
            aiReport = '';
            renderReport(allRows);
            return;
        }
        aiReportLoading = true;
        aiReportError = '';
        renderReport(allRows);
        Store.callAction('block_mwa_dashboard_get_ai_recommendation', {
            courseid: Number(config.courseid || 0),
            student_name: 'Turma acompanhada',
            prompt: buildAiPrompt(rows)
        }).then(function(result) {
            aiReport = Store.cleanAiText
                ? Store.cleanAiText(result && (result.recommendation || result.response || result.content))
                : norm(result && (result.recommendation || result.response || result.content));
            aiReportError = aiReport ? '' : 'A IA não retornou conteúdo para este relatório.';
        }).catch(function(error) {
            aiReport = '';
            aiReportError = 'Não foi possível gerar o relatório com IA. ' + norm(error && error.message);
        }).then(function() {
            aiReportLoading = false;
            renderReport(allRows);
        });
    }

    function accessJourneyHtml(rows, groups) {
        var journeys = (groups || groupStudents(rows)).map(function(group) { return group.latest; })
            .filter(function(row) { return row && row.captured; });
        var dayCount = 16;
        var access = [], academic = [];
        for (var day = 0; day < dayCount; day++) {
            access.push({count: 0, students: {}});
            academic.push({count: 0, students: {}});
        }
        function collect(row, logs, buckets) {
            (logs || []).forEach(function(log) {
                var elapsed = timestamp(log) - row.captured;
                var relativeDay = Math.floor(elapsed / DAY);
                if (elapsed < 0 || relativeDay < 0 || relativeDay >= dayCount) { return; }
                buckets[relativeDay].count++;
                var name = norm(row.raw.student_name || row.raw.student_email || 'Estudante');
                if (name) { buckets[relativeDay].students[name] = true; }
            });
        }
        journeys.forEach(function(row) {
            collect(row, row.after, access);
            collect(row, row.academic, academic);
        });
        var hasEvents = access.some(function(item) { return item.count > 0; });
        if (!hasEvents) {
            return '<div class="fr-journey-empty"><div class="fr-no-data">' + tr('tf_journey_empty') + '</div>' +
                info(tr('tf_journey_info')) + '</div>';
        }

        var maxValue = Math.max.apply(null, access.concat(academic).map(function(item) { return item.count; }).concat([1]));
        var tickStep = Math.max(1, Math.ceil(maxValue / 4));
        var chartMax = tickStep * 4;
        var left = 48, right = 690, top = 20, bottom = 158;
        var xStep = (right - left) / (dayCount - 1);
        function x(index) { return left + (xStep * index); }
        function y(value) { return bottom - (value / chartMax) * (bottom - top); }
        var ticks = [0, 1, 2, 3, 4].map(function(index) {
            var value = tickStep * index;
            var ypos = y(value);
            return '<line x1="' + left + '" y1="' + ypos + '" x2="' + right + '" y2="' + ypos +
                '"/><text x="5" y="' + (ypos + 4) + '">' + value + '</text>';
        }).join('');
        var singleStudent = filters.student !== 'all' && journeys.length === 1;
        function dayLabel(index) {
            if (!singleStudent) { return 'D+' + index; }
            return 'D+' + index + ' · ' + formatDate(journeys[0].captured + index * DAY);
        }
        function seriesPath(values) {
            return values.map(function(item, index) {
                return (index ? 'L ' : 'M ') + x(index) + ' ' + y(item.count);
            }).join(' ');
        }
        function points(values, label, color) {
            return values.map(function(item, index) {
                var students = Object.keys(item.students);
                var detail = JSON.stringify({series: label, day: dayLabel(index), value: item.count, students: students, color: color});
                var title = label + ' · ' + dayLabel(index) + ': ' + item.count;
                return '<circle class="fr-journey-point" tabindex="0" role="button" cx="' + x(index) + '" cy="' +
                    y(item.count) + '" r="4.2" fill="' + color + '" data-fr-journey-detail="' + esc(detail) +
                    '" aria-label="' + esc(title) + '"><title>' + esc(title) + '</title></circle>';
            }).join('');
        }
        var accessPath = seriesPath(access);
        var academicPath = seriesPath(academic);
        var areaPath = accessPath + ' L ' + right + ' ' + bottom + ' L ' + left + ' ' + bottom + ' Z';
        var labels = access.map(function(unused, index) {
            if (index % 3 !== 0 && index !== dayCount - 1) { return ''; }
            return '<text class="axis" text-anchor="middle" x="' + x(index) + '" y="177">D+' + index + '</text>';
        }).join('');
        return '<div class="fr-chart-title">' + tr('tf_journey_title') + '</div>' +
            '<div class="fr-line-chart fr-journey-chart"><svg viewBox="0 0 710 188" role="img" aria-label="' + esc(tr('tf_journey_aria')) + '">' +
            '<g class="grid">' + ticks + '</g><path class="fr-journey-area" d="' + areaPath + '"/>' +
            '<line class="fr-intervention-line" x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + bottom + '"/>' +
            '<text class="fr-intervention-label" x="' + (left + 7) + '" y="31">' + tr('tf_journey_d0') + '</text>' +
            '<g class="lines"><path d="' + accessPath + '" stroke="#2da873"/><path d="' + academicPath + '" stroke="#1769e0"/></g>' +
            points(access, tr('tf_journey_access'), '#2da873') + points(academic, tr('tf_journey_academic'), '#1769e0') + labels +
            '</svg><div class="fr-legend"><span><i style="background:#2da873"></i>' + tr('tf_journey_access') + '</span>' +
            '<span><i style="background:#1769e0"></i>' + tr('tf_journey_academic') + '</span></div>' +
            '<div class="fr-chart-detail" id="frJourneyDetail"><strong>' + tr('tf_journey_select') + '</strong>' +
            '<span>' + tr('tf_journey_select_sub') + '</span></div></div>' +
            info(tr('tf_journey_info'));
    }

    function renderReport(allRows) {
        var box = document.getElementById('teacherFeedbackWrap');
        if (!box) { return; }
        var rows = filterRows(allRows);
        var groups = groupStudents(rows);
        var total = groups.length;
        var responded = groups.filter(function(group) { return group.responded; }).length;
        var reached = groups.filter(function(group) { return group.reached; }).length;
        var monitoring = groups.filter(function(group) { return progressState(group) === 'partial'; }).length;
        var noResponse = groups.filter(function(group) { return !group.responded; }).length;
        var sustained = sustainedAfterSeven(groups);
        var pairs = metricPairs(rows);
        var ignored = data.filter(function(row) { return !row.raw.snapshot_timecreated; }).length;

        var html = headerActionsHtml() + '<div class="fr-kpis">' +
            kpi('users', tr('tf_kpi_students_tracked'), String(total), total ? tr('tf_kpi_students_all') : tr('tf_kpi_students_none'), '#1769e0', tr('tf_kpi_students_tracked_tip')) +
            kpi('refresh', tr('tf_kpi_responded'), String(responded), pctText(responded, total) + ' ' + tr('tf_of_total'), '#1769e0', tr('tf_kpi_responded_tip')) +
            kpi('target', tr('tf_kpi_evolved'), String(reached), pctText(reached, total) + ' ' + tr('tf_of_total'), '#198754', tr('tf_kpi_evolved_tip')) +
            kpi('hourglass', tr('tf_kpi_tracking'), String(monitoring), pctText(monitoring, total) + ' ' + tr('tf_of_total'), '#ff7a00', tr('tf_kpi_tracking_tip')) +
            kpi('close', tr('tf_kpi_no_response'), String(noResponse), pctText(noResponse, total) + ' ' + tr('tf_of_total'), '#ed0000', tr('tf_kpi_no_response_tip')) +
            kpi('trend', tr('tf_kpi_sustained'), sustained.eligible ? String(sustained.count) : '—', sustained.eligible ? pctText(sustained.count, sustained.eligible) + ' ' + tr('tf_of_eligible') : tr('tf_no_eligible_after'), '#7030a0', tr('tf_kpi_sustained_tip')) +
            '</div>' + filtersHtml(allRows);

        if (!rows.length) {
            html += '<div class="fr-empty"><span>▥</span><h2>' + tr('tf_empty_eligible') + '</h2><p>' + tr('tf_empty_eligible_desc') + '</p></div>';
            if (ignored) { html += info(ignored + ' intervenção(ões) anterior(es) ao snapshot foram preservadas, mas não entram em comparações antes × depois.'); }
            Store.renderHtml(box, html);
            bind(allRows);
            return;
        }

        html += analyticalSummaryHtml(rows, groups, pairs);
        html += '<div class="fr-grid fr-grid-top">' +
            card(tr('tf_reason_chart_title'), reasonChart(rows), 'overview engagement', 'fr-span-14 fr-result-card') + '</div>';
        html += '<div class="fr-grid fr-grid-middle">' +
            card(tr('tf_progress_card_title'), '<div class="fr-deltas">' +
                deltaCard(tr('tf_progress_engagement_label'), pairs.engagement, '', false) + deltaCard(tr('tf_progress_grade_label'), pairs.grade, '', false) +
                deltaCard(tr('tf_progress_approved_label'), pairs.approval, '%', false, null, 'approval') + deltaCard(tr('tf_progress_activities_label'), pairs.activities, '', false, 'sum', 'tracked') +
                deltaCard(tr('tf_progress_resources_label'), pairs.resources, '', false, 'sum', 'resources') +
                '</div>' + lineChart(pairs) + info(tr('tf_progress_info')), 'overview learning', 'fr-span-14') + '</div>';
        html += '<div class="fr-grid fr-grid-insights">' +
            card(tr('tf_card_synthesis'), donutHtml(groups), 'overview', 'fr-summary-card') +
            card(tr('tf_card_continuity'), continuityHtml(groups), 'overview continuity', 'fr-continuity-card') +
            card(tr('tf_card_student_interaction'), interactionHtml(rows, groups), 'overview interaction', 'fr-interaction-card') + '</div>';
        html += '<div class="fr-grid fr-grid-bottom">' +
            card(tr('tf_card_journey'), accessJourneyHtml(rows, groups), 'overview', 'fr-span-14 fr-journey-card') + '</div>';
        html += aiReportHtml();
        if (ignored) { html += info(ignored + ' intervenção(ões) sem snapshot foram excluídas das métricas comparativas.'); }
        Store.renderHtml(box, html);
        bind(allRows);
    }

    function bind(rows) {
        var from = document.getElementById('frFrom');
        var to = document.getElementById('frTo');
        var reason = document.getElementById('frReason');
        var teacher = document.getElementById('frTeacher');
        var student = document.getElementById('frStudent');
        [from, to, reason, teacher, student].forEach(function(element) {
            if (!element) { return; }
            element.addEventListener('change', function() {
                filters.from = from.value; filters.to = to.value; filters.reason = reason.value;
                filters.teacher = teacher.value; filters.student = student.value;
                renderReport(rows);
            });
        });
        var clear = document.getElementById('frClear');
        if (clear) { clear.addEventListener('click', function() { filters = {from: '', to: '', reason: 'all', teacher: 'all', student: 'all'}; renderReport(rows); }); }
        var exportButton = document.getElementById('frExport');
        if (exportButton) { exportButton.addEventListener('click', function() {
            document.body.classList.add('mwa-print-analytical-report');
            var cleanup = function() { document.body.classList.remove('mwa-print-analytical-report'); };
            window.addEventListener('afterprint', cleanup, {once: true});
            window.print();
            window.setTimeout(cleanup, 1200);
        }); }
        var aiButton = document.getElementById('frAiGenerate');
        var aiRegenerate = document.getElementById('frAiRegenerate');
        if (aiButton) { aiButton.disabled = aiReportLoading; aiButton.addEventListener('click', function() { generateAiReport(rows); }); }
        if (aiRegenerate) { aiRegenerate.disabled = aiReportLoading; aiRegenerate.addEventListener('click', function() { generateAiReport(rows); }); }
        function appendStudentTags(panel, names, emptyText, labelText, color) {
            names = Array.isArray(names) ? names.filter(Boolean) : [];
            if (!names.length) {
                var empty = document.createElement('span');
                empty.textContent = emptyText;
                panel.appendChild(empty);
                return;
            }
            if (labelText) {
                var label = document.createElement('span');
                label.className = 'fr-chart-detail-label';
                label.textContent = labelText;
                panel.appendChild(label);
            }
            var tags = document.createElement('div');
            tags.className = 'fr-student-tags';
            tags.style.setProperty('--fr-tag-color', color || '#249768');
            names.forEach(function(name) {
                var tag = document.createElement('button');
                tag.type = 'button';
                tag.className = 'fr-student-tag';
                tag.textContent = norm(name).split(/\s+/)[0] + ' ✓';
                tag.title = name;
                tag.setAttribute('aria-label', name);
                tag.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    var dashboardWindow = Store.windowFacade ? Store.windowFacade() : window;
                    if (dashboardWindow && typeof dashboardWindow.goToStudentProfile === 'function') {
                        dashboardWindow.goToStudentProfile(name);
                    } else if (typeof window.goToStudentProfile === 'function') {
                        window.goToStudentProfile(name);
                    }
                });
                tags.appendChild(tag);
            });
            panel.appendChild(tags);
        }
        function showChartDetail(point) {
            var panel = document.getElementById('frChartDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(point.getAttribute('data-fr-chart-detail') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.students) ? detail.students : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = detail.comparison
                ? (detail.series || 'Indicador')
                : (detail.series || 'Indicador') + ' · ' + (detail.label || '') + ' · ' +
                    (detail.approval ? detail.value + (Number(detail.value) === 1 ? ' estudante' : ' estudantes') : 'valor ' + detail.value);
            panel.appendChild(title);
            appendStudentTags(panel, names, detail.approval ? tr('tf_no_student_approved') : tr('tf_no_student_improved'),
                detail.approval ? tr('tf_students_approved') : tr('tf_students_improved'), detail.color);
            document.querySelectorAll('.fr-chart-point').forEach(function(item) {
                item.classList.toggle('active', item === point);
            });
        }
        document.querySelectorAll('.fr-chart-point').forEach(function(point) {
            point.addEventListener('click', function() { showChartDetail(point); });
            point.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showChartDetail(point); }
            });
        });
        document.querySelectorAll('.fr-vcompare-controls').forEach(function(controls) {
            var labels = [];
            try { labels = JSON.parse(controls.getAttribute('data-fr-week-labels') || '[]'); } catch (ignore) { labels = []; }
            var total = Number(controls.getAttribute('data-fr-week-total') || labels.length || 1);
            function selectWeek(index) {
                index = Math.max(0, Math.min(total - 1, index));
                controls.setAttribute('data-fr-week-index', index);
                document.querySelectorAll('.fr-vcompare-week').forEach(function(panel) {
                    panel.classList.toggle('active', Number(panel.getAttribute('data-fr-week')) === index);
                });
                var summary = controls.querySelector('strong span');
                var period = controls.querySelector('strong small');
                if (summary) { summary.textContent = tr('tf_week') + ' ' + (index + 1) + ' ' + tr('tf_week_of') + ' ' + total; }
                if (period) { period.textContent = labels[index] || ''; }
                var previous = controls.querySelector('[data-fr-week-nav="prev"]');
                var next = controls.querySelector('[data-fr-week-nav="next"]');
                if (previous) { previous.disabled = index <= 0; }
                if (next) { next.disabled = index >= total - 1; }
            }
            controls.querySelectorAll('[data-fr-week-nav]').forEach(function(button) {
                button.addEventListener('click', function() {
                    var current = Number(controls.getAttribute('data-fr-week-index') || 0);
                    selectWeek(current + (button.getAttribute('data-fr-week-nav') === 'next' ? 1 : -1));
                });
            });
            selectWeek(Number(controls.getAttribute('data-fr-week-index') || total - 1));
        });
        function showReasonDetail(bar) {
            var panel = document.getElementById('frReasonDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(bar.getAttribute('data-fr-reason-detail') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.students) ? detail.students.filter(Boolean) : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = (detail.series || 'Indicador') + ' · ' + (detail.label || '') + ' · ' + (detail.value || '0');
            panel.appendChild(title);
            appendStudentTags(panel, names, tr('tf_no_student_counted'), tr('tf_students_label'), detail.color);
            document.querySelectorAll('.fr-reason-bar').forEach(function(item) {
                item.classList.toggle('active', item === bar);
            });
        }
        document.querySelectorAll('.fr-reason-bar').forEach(function(bar) {
            bar.addEventListener('click', function() { showReasonDetail(bar); });
            bar.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showReasonDetail(bar); }
            });
        });
        function showJourneyDetail(point) {
            var panel = document.getElementById('frJourneyDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(point.getAttribute('data-fr-journey-detail') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.students) ? detail.students : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = (detail.series || 'Eventos') + ' · ' + (detail.day || '') + ': ' + Number(detail.value || 0);
            panel.appendChild(title);
            appendStudentTags(panel, names, tr('tf_no_student_point'), tr('tf_students_label'), detail.color);
            document.querySelectorAll('.fr-journey-point').forEach(function(item) {
                item.classList.toggle('active', item === point);
            });
        }
        document.querySelectorAll('.fr-journey-point').forEach(function(point) {
            point.addEventListener('click', function() { showJourneyDetail(point); });
            point.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showJourneyDetail(point); }
            });
        });
        function showContinuityNames(row) {
            var panel = document.getElementById('frContinuityDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(row.getAttribute('data-fr-continuity') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.names) ? detail.names.filter(Boolean) : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = detail.label || 'Classificação';
            panel.appendChild(title);
            appendStudentTags(panel, names, tr('tf_no_student_here'), tr('tf_students_label'), detail.color);
            document.querySelectorAll('.fr-cont-clickable').forEach(function(item) {
                item.classList.toggle('active', item === row);
            });
        }
        document.querySelectorAll('.fr-cont-clickable').forEach(function(row) {
            row.addEventListener('click', function() { showContinuityNames(row); });
            row.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showContinuityNames(row); }
            });
        });
        function showFunnelNames(step) {
            var panel = document.getElementById('frContinuityDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(step.getAttribute('data-fr-funnel') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.names) ? detail.names.filter(Boolean) : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = detail.label || 'Etapa do funil';
            panel.appendChild(title);
            appendStudentTags(panel, names, tr('tf_no_student_here'), tr('tf_students_label'), detail.color);
            document.querySelectorAll('.fr-funnel-step').forEach(function(item) {
                item.classList.toggle('active', item === step);
            });
            document.querySelectorAll('.fr-cont-clickable').forEach(function(item) {
                item.classList.remove('active');
            });
        }
        document.querySelectorAll('.fr-funnel-step').forEach(function(step) {
            step.addEventListener('click', function() { showFunnelNames(step); });
            step.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showFunnelNames(step); }
            });
        });
        function showInteractionNames(cardNode) {
            var panel = document.getElementById('frInteractionDetail');
            if (!panel) { return; }
            var detail = {};
            try { detail = JSON.parse(cardNode.getAttribute('data-fr-interaction') || '{}'); } catch (ignore) { detail = {}; }
            var names = Array.isArray(detail.names) ? detail.names.filter(Boolean) : [];
            panel.replaceChildren();
            var title = document.createElement('strong');
            title.textContent = detail.label || 'Indicador';
            panel.appendChild(title);
            appendStudentTags(panel, names, tr('tf_no_student_counted'), tr('tf_students_label'), detail.color);
            document.querySelectorAll('.fr-interaction-clickable').forEach(function(item) {
                item.classList.toggle('active', item === cardNode);
            });
        }
        document.querySelectorAll('.fr-interaction-clickable').forEach(function(cardNode) {
            cardNode.addEventListener('click', function() { showInteractionNames(cardNode); });
            cardNode.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showInteractionNames(cardNode); }
            });
        });
        document.querySelectorAll('[data-fr-donut]').forEach(function(donut) {
            var slices = [];
            try { slices = JSON.parse(donut.getAttribute('data-fr-donut') || '[]'); } catch (ignore) { slices = []; }
            var tooltip = donut.querySelector('.fr-donut-tooltip');
            var sliceAt = function(event) {
                if (!slices.length) { return null; }
                var rect = donut.getBoundingClientRect();
                var x = event.clientX - rect.left;
                var y = event.clientY - rect.top;
                var dx = x - rect.width / 2;
                var dy = y - rect.height / 2;
                var distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < rect.width * .15 || distance > rect.width * .5) { return null; }
                var position = ((Math.atan2(dy, dx) * 180 / Math.PI) + 450) % 360 / 3.6;
                var accumulated = 0;
                var slice = slices[slices.length - 1];
                slices.some(function(item) {
                    accumulated += Number(item.percent || 0);
                    if (position <= accumulated) { slice = item; return true; }
                    return false;
                });
                return {slice: slice, x: x, y: y};
            };
            donut.addEventListener('mousemove', function(event) {
                if (!tooltip) { return; }
                var selected = sliceAt(event);
                if (!selected) { tooltip.hidden = true; return; }
                var slice = selected.slice;
                tooltip.textContent = slice.label + ': ' + slice.count + ' (' + slice.percent + '%)';
                tooltip.style.left = selected.x + 'px';
                tooltip.style.top = selected.y + 'px';
                tooltip.hidden = false;
            });
            donut.addEventListener('click', function(event) {
                var selected = sliceAt(event);
                if (!selected) { return; }
                var value = donut.querySelector('.fr-donut-center-value');
                var label = donut.querySelector('.fr-donut-center-label');
                if (value) {
                    value.textContent = selected.slice.percent + '%';
                    value.style.color = selected.slice.color || '#07154f';
                }
                if (label) { label.textContent = selected.slice.label; }
                var panel = document.getElementById('frDonutDetail');
                if (panel) {
                    var names = Array.isArray(selected.slice.names) ? selected.slice.names.filter(Boolean) : [];
                    panel.replaceChildren();
                    var title = document.createElement('strong');
                    title.textContent = selected.slice.label;
                    panel.appendChild(title);
                    appendStudentTags(panel, names, tr('tf_no_student_here'), tr('tf_students_label'), selected.slice.color);
                }
            });
            donut.addEventListener('mouseleave', function() { if (tooltip) { tooltip.hidden = true; } });
        });
    }

    function requestReportData() {
        var config = Store.getConfig ? Store.getConfig() : {};
        var courseid = Number(config.courseid || 0);
        var groupid = Number(config.groupid || 0);
        return Store.callAction('block_mwa_dashboard_get_interventions', {
            courseid: courseid,
            groupid: groupid
        }).then(function(result) {
            var interventions = [];
            if (Array.isArray(result.interventions)) {
                interventions = result.interventions;
            } else {
                try { interventions = JSON.parse(result.interventions || '[]'); } catch (ignore) { interventions = []; }
            }
            var userids = interventions.filter(function(row) { return Number(row.snapshot_timecreated || 0) > 0; })
                .map(function(row) { return Number(row.userid || 0); })
                .filter(function(userid, index, list) { return userid > 0 && list.indexOf(userid) === index; });
            return Store.callAction('block_mwa_dashboard_get_followup_indicators', {
                courseid: courseid,
                groupid: groupid,
                userids: JSON.stringify(userids)
            }).then(function(currentResult) {
                var indicators = {};
                try { indicators = JSON.parse(currentResult.indicators || '{}'); } catch (ignore) { indicators = {}; }
                return {interventions: interventions, indicators: indicators};
            });
        });
    }

    function loadReportData() {
        if (activeReportLoad) { return activeReportLoad; }
        activeReportLoad = requestReportData().catch(function(firstError) {
            return new Promise(function(resolve) {
                window.setTimeout(resolve, 300);
            }).then(function() {
                return requestReportData();
            }).catch(function(secondError) {
                throw secondError || firstError;
            });
        }).then(function(result) {
            activeReportLoad = null;
            return result;
        }, function(error) {
            activeReportLoad = null;
            throw error;
        });
        return activeReportLoad;
    }

    function closeIndividualReport() {
        var overlay = document.getElementById('frIndividualReportOverlay');
        if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
        document.body.classList.remove('mwa-print-student-report');
    }

    function printIndividualReport() {
        document.body.classList.add('mwa-print-student-report');
        window.print();
        window.setTimeout(function() { document.body.classList.remove('mwa-print-student-report'); }, 500);
    }

    function individualMetric(label, values, suffix, sumValues, showAfter) {
        var before = values.length ? (sumValues ? values.reduce(function(total, item) { return total + Number(item.before || 0); }, 0) : avg(values.map(function(item) { return item.before; }))) : null;
        var after = showAfter && values.length ? (sumValues ? values.reduce(function(total, item) { return total + Number(item.after || 0); }, 0) : avg(values.map(function(item) { return item.after; }))) : null;
        var formatMetric = function(value) {
            if (value === null || value === undefined || isNaN(value)) { return '—'; }
            return lower(label).indexOf('nota') >= 0 ? Number(value).toFixed(1) + (suffix || '') : formatNumber(value, suffix || '');
        };
        return '<div class="fr-ir-metric"><span>' + esc(label) + '</span><strong>' +
            esc(formatMetric(before)) + '<em>→</em>' + esc(formatMetric(after)) + '</strong></div>';
    }

    function individualApprovalMetric(label, values, showAfter) {
        var beforeValue = values.length ? avg(values.map(function(item) { return item.before; })) : null;
        var afterValue = showAfter && values.length ? avg(values.map(function(item) { return item.after; })) : null;
        var beforeApproved = beforeValue === null ? null : beforeValue >= 100;
        var afterApproved = afterValue === null ? null : afterValue >= 100;
        function state(value) {
            if (value === null) { return '<b class="is-neutral">—</b>'; }
            return '<b class="' + (value ? 'is-approved' : 'is-not-approved') + '">' +
                esc(tr(value ? 'snapshot_yes' : 'snapshot_no')) + '</b>';
        }
        var transition = state(beforeApproved);
        if (afterApproved !== null && afterApproved !== beforeApproved) {
            transition += '<em>→</em>' + state(afterApproved);
        }
        return '<div class="fr-ir-metric fr-ir-approval-metric"><span>' + esc(label) + '</span><strong>' + transition + '</strong></div>';
    }

    function trackedMetric(label, values, doneLabel, includeOverdue) {
        var valid = (values || []).filter(function(item) {
            return number(item.before) !== null && number(item.after) !== null;
        });
        var total = valid.reduce(function(sum, item) {
            return sum + Math.max(0, Number(item.before || 0));
        }, 0);
        var done = valid.reduce(function(sum, item) {
            return sum + Math.min(Math.max(0, Number(item.before || 0)), Math.max(0, Number(item.after || 0)));
        }, 0);
        var explicitRemaining = valid.every(function(item) { return number(item.remaining) !== null; });
        var remaining = explicitRemaining ? valid.reduce(function(sum, item) {
            return sum + Math.max(0, Number(item.remaining || 0));
        }, 0) : Math.max(0, total - done);
        var overdue = includeOverdue ? valid.reduce(function(sum, item) {
            return sum + Math.max(0, Number(item.overdue || 0));
        }, 0) : 0;
        var trackedOverdue = includeOverdue ? valid.reduce(function(sum, item) {
            var exact = number(item.trackedOverdue);
            return sum + Math.max(0, exact === null ? Number(item.overdue || 0) : exact);
        }, 0) : 0;
        trackedOverdue = Math.min(remaining, trackedOverdue);
        var pending = Math.max(0, remaining - trackedOverdue);
        if (includeOverdue) {
            var actionableTotal = pending + done;
            return '<div class="fr-ir-metric fr-ir-tracked-metric"><span>' + esc(label) + '</span>' +
                '<div class="fr-ir-status-grid"><strong class="total"><b>' + actionableTotal + '</b><em>' + esc(tr('tf_ir_total')) + '</em></strong>' +
                '<strong class="pending"><b>' + pending + '</b><em>' + esc(tr('tf_ir_pending')) + '</em></strong>' +
                '<strong class="completed"><b>' + done + '</b><em>' + esc(doneLabel) + '</em></strong>' +
                '<strong class="overdue"><b>' + overdue + '</b><em>' + esc(tr('tf_ir_overdue')) + '</em></strong></div></div>';
        }
        return '<div class="fr-ir-metric fr-ir-tracked-metric"><span>' + esc(label) + '</span>' +
            '<div class="fr-ir-status-grid is-three"><strong class="total"><b>' + total + '</b><em>' + esc(tr('tf_ir_total')) + '</em></strong>' +
            '<strong class="pending"><b>' + remaining + '</b><em>' + esc(tr('tf_ir_pending')) + '</em></strong>' +
            '<strong class="completed"><b>' + done + '</b><em>' + esc(doneLabel) + '</em></strong></div></div>';
    }

    function renderIndividualReport(studentName, rows) {
        var overlay = document.getElementById('frIndividualReportOverlay');
        if (!overlay) { return; }
        var pairs = metricPairs(rows);
        var groups = groupStudents(rows);
        var group = groups[0] || null;
        var hasVerifiedResponse = rows.some(function(row) { return row.response && row.after && row.after.length; });
        function metricSummary(label, values, suffix, sumValues, deltaLabel, booleanState) {
            if (!values.length) { return null; }
            var before = sumValues ? values.reduce(function(total, item) { return total + Number(item.before || 0); }, 0) : avg(values.map(function(item) { return item.before; }));
            var after = sumValues ? values.reduce(function(total, item) { return total + Number(item.after || 0); }, 0) : avg(values.map(function(item) { return item.after; }));
            if (before === null || after === null) { return null; }
            var isGrade = lower(label).indexOf('nota') >= 0;
            if (booleanState) {
                before = before >= 100 ? 1 : 0;
                after = after >= 100 ? 1 : 0;
            }
            var format = function(value) {
                if (booleanState) { return tr(value ? 'snapshot_yes' : 'snapshot_no'); }
                return isGrade ? Number(value).toFixed(1) + (suffix || '') : formatNumber(value, suffix || '');
            };
            return {label: label, before: before, after: after, delta: after - before, format: format,
                deltaLabel: deltaLabel, booleanState: !!booleanState};
        }
        function completedActivitiesSummary(values) {
            if (!values.length) { return null; }
            // In activity pairs, "before" is the number pending at the
            // intervention and "after" is how many were completed afterwards.
            // The historical completed total therefore starts at zero.
            var completed = values.reduce(function(total, item) {
                return total + Math.max(0, Number(item.after || 0));
            }, 0);
            return {
                label: tr('tf_ir_completed_activities'),
                before: 0,
                after: completed,
                delta: completed,
                format: function(value) { return formatNumber(value, ''); },
                deltaLabel: tr('tf_ir_activities_unit'),
                booleanState: false
            };
        }
        var approvalMetric = metricSummary(tr('tf_ir_approval'), pairs.approval, '', false, '', true);
        var reportMetrics = [
            metricSummary(tr('tf_ir_engagement'), pairs.engagement, '', false, tr('tf_ir_engagement_points')),
            metricSummary(tr('tf_ir_average_grade'), pairs.grade, '', false, tr('tf_ir_points')),
            completedActivitiesSummary(pairs.activities)
        ].filter(Boolean);
        var improved = hasVerifiedResponse ? reportMetrics.filter(function(metric) { return metric.delta > 0.0001; }) : [];
        var declined = hasVerifiedResponse ? reportMetrics.filter(function(metric) { return metric.delta < -0.0001; }) : [];
        var stable = hasVerifiedResponse ? reportMetrics.filter(function(metric) { return Math.abs(metric.delta) <= 0.0001; }) : [];
        var classification = !rows.length ? tr('tf_ir_insufficient_data') : !hasVerifiedResponse ? tr('tf_ir_awaiting_return') : group && group.reached ? tr('tf_ir_full_progress') :
            group && group.returnedOnly ? tr('int_status_returned') : (improved.length || (group && group.partialResponse)) ? tr('tf_ir_partial_progress') : tr('tf_ir_no_change');
        var classificationClass = classification === tr('tf_ir_full_progress') ? 'integral' :
            classification === tr('tf_ir_partial_progress') ? 'partial' : 'neutral';
        var ordered = rows.slice().sort(function(a, b) { return a.captured - b.captured; });
        var interventionRows = ordered.map(function(row) {
            var reason = REASON_META[row.reason] ? REASON_META[row.reason].label() : row.reason;
            return '<tr><td>' + esc(formatDateTime(row.captured)) + '</td><td>' + esc(reason) + '</td><td>' +
                esc(row.raw.teacher_name || '—') + '</td><td>' + (row.response ? tr('tf_ir_responded') : tr('tf_ir_no_response')) + '</td></tr>';
        }).join('');
        var timeline = [];
        ordered.forEach(function(row) {
            timeline.push({time: row.captured, title: tr('tf_ir_intervention_done'), detail: REASON_META[row.reason] ? REASON_META[row.reason].label() : row.reason, icon: 'message'});
            if (row.firstResponse) { timeline.push({time: row.firstResponse, title: tr('tf_ir_student_response'), detail: tr('tf_ir_response_recorded'), icon: 'refresh'}); }
            if (row.academic && row.academic.length) { timeline.push({time: timestamp(row.academic[0]), title: tr('tf_ir_academic_activity'), detail: tr('tf_ir_activity_recorded'), icon: 'check'}); }
        });
        timeline.sort(function(a, b) { return a.time - b.time; });
        var timelineHtml = timeline.length ? timeline.map(function(item) {
            return '<div class="fr-ir-timeline-item"><span><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-' + item.icon + '"></use></svg></span><div><strong>' + esc(item.title) + '</strong><small>' + esc(formatDateTime(item.time)) + ' · ' + esc(item.detail || '') + '</small></div></div>';
        }).join('') : '<div class="fr-ir-empty">' + esc(tr('tf_ir_no_events')) + '</div>';
        function joinPhrases(items) {
            if (items.length < 2) { return items.join(''); }
            return items.slice(0, -1).join('; ') + '; ' + tr('tf_ir_and') + ' ' + items[items.length - 1];
        }
        var conclusion = tr('tf_ir_not_enough_snapshots');
        if (rows.length && !hasVerifiedResponse) {
            conclusion = tr('tf_ir_awaiting_return_text');
        } else if (rows.length) {
            var sentences = [tr('tf_ir_conclusion_classification').replace('{count}', rows.length).replace('{classification}', classification.toLowerCase())];
            if (improved.length) {
                sentences.push(tr('tf_ir_improvements') + ' ' + joinPhrases(improved.map(function(metric) {
                    var change = tr('tf_ir_changed_from').replace('{metric}', lower(metric.label)).replace('{before}', metric.format(metric.before)).replace('{after}', metric.format(metric.after));
                    return metric.booleanState ? change : change + ' (+' + formatNumber(metric.delta) + ' ' + metric.deltaLabel + ')';
                })) + '.');
            }
            if (declined.length) {
                sentences.push(tr('tf_ir_declines') + ' ' + joinPhrases(declined.map(function(metric) {
                    var change = tr('tf_ir_changed_from').replace('{metric}', lower(metric.label)).replace('{before}', metric.format(metric.before)).replace('{after}', metric.format(metric.after));
                    return metric.booleanState ? change : change + ' (' + formatNumber(metric.delta) + ' ' + metric.deltaLabel + ')';
                })) + '.');
            }
            if (stable.length) {
                sentences.push(tr('tf_ir_stable') + ' ' + joinPhrases(stable.map(function(metric) {
                    return tr('tf_ir_stayed_at').replace('{metric}', lower(metric.label)).replace('{value}', metric.format(metric.after));
                })) + '.');
            }
            if (approvalMetric) {
                if (approvalMetric.before === 0 && approvalMetric.after === 1) {
                    sentences.push(tr('tf_ir_approved_after_intervention'));
                } else if (approvalMetric.after === 0) {
                    sentences.push(tr('tf_ir_still_not_approved'));
                } else {
                    sentences.push(tr('tf_ir_remains_approved'));
                }
            }
            conclusion = sentences.join(' ');
        }

        Store.renderHtml(overlay, '<section class="fr-ir-modal" role="dialog" aria-modal="true" aria-labelledby="frIrTitle">' +
            '<header class="fr-ir-head"><div><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-chart"></use></svg><div><small>' + esc(tr('tf_ir_title')) + '</small><h2 id="frIrTitle">' + esc(tr('tf_ir_evolution_of').replace('{student}', studentName)) + '</h2></div></div>' +
            '<div class="fr-ir-actions"><button type="button" onclick="window.MWATeacherFeedback.printIndividualReport()"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-download"></use></svg> ' + esc(tr('tf_ir_export_pdf')) + '</button><button type="button" class="fr-ir-close" aria-label="' + esc(tr('close')) + '" onclick="window.MWATeacherFeedback.closeIndividualReport()"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-close"></use></svg></button></div></header>' +
            '<div class="fr-ir-body"><div class="fr-ir-summary"><div><span>' + esc(tr('student')) + '</span><strong>' + esc(studentName) + '</strong></div><div><span>' + esc(tr('tf_ir_period')) + '</span><strong>' + (ordered.length ? esc(formatDate(ordered[0].captured)) + ' ' + esc(tr('tf_ir_to')) + ' ' + esc(formatDate(Math.floor(Date.now() / 1000))) : '—') + '</strong></div><div><span>' + esc(tr('tf_ir_interventions')) + '</span><strong>' + rows.length + '</strong></div><div><span>' + esc(tr('tf_ir_classification')) + '</span><strong class="' + classificationClass + '">' + esc(classification) + '</strong></div></div>' +
            '<section class="fr-ir-section"><h3>' + esc(tr('tf_ir_before_after')) + '</h3><div class="fr-ir-metrics">' +
            individualMetric(tr('tf_ir_engagement'), pairs.engagement, '', false, hasVerifiedResponse) + individualMetric(tr('tf_ir_average_grade'), pairs.grade, '', false, hasVerifiedResponse) +
            individualApprovalMetric(tr('tf_ir_approval'), pairs.approval, hasVerifiedResponse) +
            trackedMetric(tr('tf_ir_tracked_activities'), pairs.activities, tr('tf_ir_completed'), true) +
            trackedMetric(tr('tf_ir_tracked_resources'), pairs.resources, tr('tf_ir_accessed')) + '</div></section>' +
            '<div class="fr-ir-grid"><section class="fr-ir-section"><h3>' + esc(tr('tf_ir_timeline')) + '</h3><div class="fr-ir-timeline">' + timelineHtml + '</div></section>' +
            '<section class="fr-ir-section"><h3>' + esc(tr('tf_ir_registered_interventions')) + '</h3><div class="fr-ir-table-wrap"><table><thead><tr><th>' + esc(tr('tf_ir_date')) + '</th><th>' + esc(tr('tf_ir_reason')) + '</th><th>' + esc(tr('tf_ir_teacher')) + '</th><th>' + esc(tr('tf_ir_return')) + '</th></tr></thead><tbody>' + interventionRows + '</tbody></table></div></section></div>' +
            '<section class="fr-ir-conclusion"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-lightbulb"></use></svg><div><strong>' + esc(hasVerifiedResponse ? tr('tf_ir_conclusion') : tr('tf_ir_followup')) + '</strong><p>' + esc(conclusion) + '</p></div></section>' +
            '<p class="fr-ir-note">' + esc(tr('tf_ir_causality_note')) + '</p></div></section>');
    }

    function openIndividualReport(studentName) {
        closeIndividualReport();
        var overlay = document.createElement('div');
        overlay.id = 'frIndividualReportOverlay';
        overlay.className = 'fr-ir-overlay';
        var loading = document.createElement('div');
        loading.className = 'fr-loading';
        var spinner = document.createElement('div');
        spinner.className = 'spinner';
        var loadingText = document.createElement('p');
        loadingText.textContent = tr('tf_ir_preparing');
        loading.appendChild(spinner);
        loading.appendChild(loadingText);
        overlay.appendChild(loading);
        (document.getElementById('block-mwa-dashboard-app') || document.body).appendChild(overlay);
        var dashboard = (Store.getModule && Store.getModule('MWADashboard')) || window.MWADashboard || {};
        var state = dashboard.state || {logs: [], grades: [], students: []};
        loadReportData().then(function(result) {
            var analysed = (result.interventions || []).map(function(row) { return analyseRow(row, state, result.indicators || {}); });
            var key = lower(studentName);
            renderIndividualReport(studentName, analysed.filter(function(row) {
                return lower(row.raw.student_name || row.raw.student_email) === key && Number(row.raw.snapshot_timecreated || 0) > 0 && row.raw.status === 'sent';
            }));
        }).catch(function(error) {
            closeIndividualReport();
            Store.notify((error && error.message) || tr('tf_ir_generation_error'), 'error');
        });
    }

    function render() {
        var box = document.getElementById('teacherFeedbackWrap');
        if (!box) { return; }
        var generation = ++reportRenderGeneration;
        Store.renderHtml(box, '<div class="fr-loading"><div class="spinner"></div><p>' + tr('tf_loading_consolidate') + '</p></div>');
        var dashboard = (Store.getModule && Store.getModule('MWADashboard')) || window.MWADashboard || {};
        var state = dashboard.state || {logs: [], grades: [], students: []};
        loadReportData().then(function(result) {
            if (generation !== reportRenderGeneration) { return; }
            data = (result.interventions || []).map(function(row) { return analyseRow(row, state, result.indicators || {}); });
            var eligible = data.filter(function(row) {
                return Number(row.raw.snapshot_timecreated || 0) > 0 && row.raw.status === 'sent';
            });
            renderReport(eligible);
        }).catch(function() {
            if (generation !== reportRenderGeneration) { return; }
            Store.renderHtml(box, '<div class="fr-empty"><span>!</span><h2>' + tr('tf_error_load') + '</h2><p>' + tr('tf_error_load_sub') + '</p></div>');
        });
    }

    function refresh() {
        // A newly saved intervention must not reuse an older concurrent load.
        // The render generation prevents that older response from replacing
        // the fresh report when it eventually finishes.
        activeReportLoad = null;
        render();
    }

    var api = {render: render, refresh: refresh, openIndividualReport: openIndividualReport, closeIndividualReport: closeIndividualReport, printIndividualReport: printIndividualReport};
    window.MWATeacherFeedback = api;
    Store.register('MWATeacherFeedback', api);
    return api;
});
