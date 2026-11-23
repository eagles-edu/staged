// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Configurable alerts displayed on the Action Center.
 *
 * @module     block_mwa_dashboard/attentiontoday
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['block_mwa_dashboard/dashboardstore', 'core/templates'], function(Store, Templates) {
    'use strict';

    var preferences = {inactive: true, awaitinggrade: true,
        message: true, lowgrade: true, days: 7, grade: 60};
    var loaded = false;
    var loading = false;
    var filter = 'all';
    var fullFilter = 'all';
    var fullType = 'all';
    var fullSearch = '';
    var fullSort = 'priority';
    var resolved = {};
    var seen = {};
    var monitoredCmids = {};
    var monitoredLoaded = false;
    var serverHistory = [];
    var historySyncing = false;
    var historyHash = '';

    function tr(key, fallback) {
        var strings = Store.getStrings() || {};
        var value = Object.prototype.hasOwnProperty.call(strings, key) ? strings[key] : '';
        return value && !/^\[\[/.test(value) ? value : (fallback || key);
    }
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(character) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character];
        });
    }
    function renderTemplate(node, name, context, callback) {
        return Templates.renderForPromise('block_mwa_dashboard/' + name, context).then(function(result) {
            Templates.replaceNodeContents(node, result.html, result.js);
            if (callback) { callback(); }
        });
    }
    function config() { return Store.getConfig() || {}; }
    function dashboard() { return Store.getModule('MWADashboard') || {}; }
    function activityUrl(module, cmid, fallback) {
        var root = String(config().wwwroot || '').replace(/\/$/, '');
        module = String(module || '').toLowerCase();
        if (fallback) { return fallback; }
        if (!root || !cmid || !module) { return ''; }
        return root + '/mod/' + module + '/view.php?id=' + cmid;
    }
    function storageKey() { return 'mwa_attention_resolved_' + Number(config().courseid || 0); }
    function seenStorageKey() { return 'mwa_attention_seen_' + Number(config().courseid || 0); }
    function loadResolved() {
        try { resolved = JSON.parse(window.localStorage.getItem(storageKey()) || '{}') || {}; } catch (ignore) { resolved = {}; }
        try { seen = JSON.parse(window.localStorage.getItem(seenStorageKey()) || '{}') || {}; } catch (ignore) { seen = {}; }
    }
    function saveResolved() {
        try { window.localStorage.setItem(storageKey(), JSON.stringify(resolved)); } catch (ignore) {}
    }
    function saveSeen() {
        try { window.localStorage.setItem(seenStorageKey(), JSON.stringify(seen)); } catch (ignore) {}
    }
    function syncHistory(items) {
        var payload = (items || []).filter(function(item) { return !item.persisted; }).map(function(item) {
            return {id: item.id, kind: item.kind, priority: item.priority, student: item.student,
                text: item.text, time: item.time, action: item.action, url: item.url || '', activity: item.activity || ''};
        });
        var nextHash = JSON.stringify(payload.map(function(item) { return item.id; }).sort());
        if (historySyncing || nextHash === historyHash) { return; }
        historySyncing = true;
        historyHash = nextHash;
        Store.callAction('block_mwa_dashboard_sync_notice_history', {
            courseid: Number(config().courseid || 0), notices: JSON.stringify(payload)
        }).then(function(response) {
            try { serverHistory = JSON.parse(response.history || '[]') || []; } catch (ignore) { serverHistory = []; }
            var actions = window.MWAActionCenter;
            if (actions && actions.render) { actions.render(); }
            var page = document.getElementById('page-alerts');
            if (page && page.classList.contains('active')) { renderFull(); }
        }).catch(function() { historyHash = ''; }).then(function() { historySyncing = false; });
    }
    function setResolved(id, value) {
        if (value) { resolved[id] = Date.now(); } else { delete resolved[id]; }
        serverHistory.forEach(function(record) {
            if (record.noticekey === id) {
                record.status = value ? 'resolved' : 'active';
                record.resolution = value ? 'manual' : '';
                record.timeresolved = value ? Math.floor(Date.now() / 1000) : 0;
            }
        });
        saveResolved();
        Store.callAction('block_mwa_dashboard_resolve_notice', {
            courseid: Number(config().courseid || 0), noticekey: id, resolved: !!value
        }).catch(function() { /* Local state remains available if the history request temporarily fails. */ });
    }
    function loadPreferences() {
        if (loaded || loading) { return Promise.resolve(preferences); }
        loading = true;
        return Store.callAction('block_mwa_dashboard_get_alert_preferences', {
            courseid: Number(config().courseid || 0)
        }).then(function(response) {
            var saved = JSON.parse(response.preferences || '{}');
            Object.keys(preferences).forEach(function(key) {
                if (saved[key] !== undefined) { preferences[key] = saved[key]; }
            });
            loaded = true;
            return preferences;
        }).catch(function() { return preferences; }).then(function(result) {
            loading = false;
            return result;
        });
    }
    function loadMonitored() {
        if (monitoredLoaded) { return Promise.resolve(monitoredCmids); }
        return Store.callAction('block_mwa_dashboard_get_monitored_activities', {
            courseid: Number(config().courseid || 0)
        }).then(function(response) {
            monitoredCmids = {};
            (response.cmids || []).forEach(function(cmid) { monitoredCmids[Number(cmid)] = true; });
            monitoredLoaded = true;
            var actions = window.MWAActionCenter;
            if (actions && actions.render) { actions.render(); }
            var alertsPage = document.getElementById('page-alerts');
            if (alertsPage && alertsPage.classList.contains('active')) { renderFull(); }
            return monitoredCmids;
        }).catch(function() { monitoredLoaded = true; return monitoredCmids; });
    }
    function syncMonitoring(cmid, active) {
        cmid = Number(cmid || 0);
        if (!cmid) { return; }
        if (active) { monitoredCmids[cmid] = true; } else { delete monitoredCmids[cmid]; }
        var actions = window.MWAActionCenter;
        if (actions && actions.render) { actions.render(); }
    }
    function isMonitoredDelivery(log) {
        var module = String(log._modtype || log.modtype || log.component || log.componente || '').toLowerCase();
        var event = String([log.action, log.nomedoevento, log.eventname].join(' ')).toLowerCase();
        if (/viewed|started|launched|graded/.test(event)) { return false; }
        if (/submit|submitted|submission|entreg|upload|post|discussion|record created|record updated|entry created|entry updated|content created|response submitted|answer submitted|completed|conclu/.test(event)) {
            return true;
        }
        if (/assign|assignment|forum|workshop|data|database|glossary|feedback|quiz|h5p|hvp/.test(module)) {
            return /created|updated/.test(event);
        }
        return false;
    }
    function studentAvatar(student) {
        var url = student.pictureurl || student.profileimageurl || '';
        return url ? '<img src="' + esc(url) + '" alt="">' : '<span aria-hidden="true">&#128100;</span>';
    }
    function lastAccess(student) {
        var value = student.last || student.lastAccess || student.lastaccess || student.moodleLastAccess || null;
        if (value instanceof Date) { return value; }
        if (typeof value === 'number' && value > 0) { return new Date(value > 100000000000 ? value : value * 1000); }
        if (value) { var date = new Date(value); return isNaN(date.getTime()) ? null : date; }
        return null;
    }
    function activityMeta() {
        var grades = (dashboard().state || {}).grades || [];
        return grades.find(function(row) { return row && row.__mwa_type__ === 'activity_names'; }) || {};
    }
    function requiresManualGrading(module) {
        return ['assign', 'assignment', 'forum', 'workshop', 'data', 'database', 'glossary']
            .indexOf(String(module || '').toLowerCase()) !== -1;
    }
    function awaitingAlerts() {
        var state = dashboard().state || {};
        var meta = activityMeta();
        var sequences = Object.keys(meta).map(function(key) {
            var match = key.match(/^act_(\d+)$/); return match ? match[1] : null;
        }).filter(Boolean);
        var alerts = [];
        (state.students || []).forEach(function(student) {
            var row = student.gradeRow || {};
            sequences.forEach(function(sequence) {
                var module = String(meta['act_module_' + sequence] || '');
                if (!requiresManualGrading(module)) { return; }
                if (Number(row['act_current_' + sequence] || 0) <= 0) { return; }
                var raw = row['act_' + sequence];
                var submitted = Number(row['act_submissiontime_' + sequence] || 0);
                var graded = Number(row['act_gradetime_' + sequence] || 0);
                var hasGrade = raw !== null && raw !== undefined && String(raw).trim() !== '' && String(raw).trim() !== '-';
                if (hasGrade && !(submitted > 0 && graded > 0 && submitted > graded)) { return; }
                var activity = meta['act_' + sequence] || tr('activity', 'Atividade');
                var cmid = Number(meta['act_cmid_' + sequence] || 0);
                var activityLink = (config().activitylinks || []).find(function(item) { return Number(item.cmid || 0) === cmid; });
                var targetUrl = activityUrl(module, cmid, activityLink && activityLink.url ? activityLink.url : '');
                alerts.push({id: 'grade-' + (student.userid || student.name) + '-' + sequence,
                    kind: 'awaitinggrade', priority: 'warning', student: student,
                    text: tr('attention_today_awaiting_grade', '{name} entregou {activity} e aguarda correção.')
                        .replace('{name}', student.name).replace('{activity}', activity),
                    time: submitted || 0, action: 'grade', url: targetUrl, activity: activity});
            });
        });
        return alerts;
    }
    function viewedNotDeliveredAlerts() {
        var activities = Store.getModule('MWAActivities');
        if (activities && typeof activities.getViewedNotDelivered === 'function') {
            return activities.getViewedNotDelivered().map(function(item) {
                var student = item.student || {};
                var activityName = item.activity || tr('activity', 'Atividade');
                var cmid = Number(item.cmid || 0);
                var targetUrl = item.url || activityUrl(item.module || '', cmid, '');
                return {
                    id: 'viewed-not-delivered-' + (student.userid || student.name) + '-' + (cmid || activityName),
                    kind: 'viewednotdelivered', priority: 'warning', student: student,
                    time: Number(item.time || 0),
                    text: tr('attention_today_viewed_not_delivered', '{name} viu, mas não entregou {activity}.')
                        .replace('{name}', student.name || '').replace('{activity}', activityName),
                    action: targetUrl ? 'activity' : 'student', url: targetUrl, activity: activityName
                };
            });
        }
        var state = dashboard().state || {};
        var meta = activityMeta();
        var now = Math.floor(Date.now() / 1000);
        var sequences = Object.keys(meta).map(function(key) {
            var match = key.match(/^act_(\d+)$/); return match ? match[1] : null;
        }).filter(Boolean);
        var viewed = {};
        (state.logs || []).forEach(function(log) {
            var cmid = Number(log._cmid || log.contextinstanceid || 0);
            var userid = Number(log._userid || log.userid || 0);
            var event = String([log.action, log.nomedoevento, log.eventname].join(' ')).toLowerCase();
            if (!cmid || !userid || !/viewed|visualiz|acess/.test(event)) { return; }
            var key = cmid + ':' + userid;
            viewed[key] = Math.max(Number(viewed[key] || 0), Number(log._ts || log.timecreated || 0));
        });
        var alerts = [];
        (state.students || []).forEach(function(student) {
            var row = student.gradeRow || {};
            sequences.forEach(function(sequence) {
                var cmid = Number(meta['act_cmid_' + sequence] || 0);
                var closedAt = Number(meta['act_duedate_' + sequence] || 0) ||
                    Number(meta['act_availableuntil_' + sequence] || 0);
                var viewedAt = Number(row['act_viewed_' + sequence] ||
                    viewed[cmid + ':' + Number(student.userid || 0)] || 0);
                if (!cmid || !closedAt || closedAt >= now || !viewedAt) { return; }
                var rawGrade = row['act_' + sequence];
                var current = Number(row['act_current_' + sequence] || 0);
                var gradeText = rawGrade === null || rawGrade === undefined ? '' : String(rawGrade).trim();
                var grade = parseFloat(gradeText.replace(',', '.'));
                var hasPositiveGrade = gradeText !== '' && gradeText !== '-' && !isNaN(grade) && grade > 0;
                if (current > 0 || hasPositiveGrade) { return; }
                var activityName = meta['act_' + sequence] || tr('activity', 'Atividade');
                var activity = (config().activitylinks || []).find(function(item) {
                    return Number(item.cmid || 0) === cmid;
                });
                var module = String(meta['act_module_' + sequence] || (activity && activity.modname) || '');
                var targetUrl = activityUrl(module, cmid, activity && activity.url ? activity.url : '');
                alerts.push({id: 'viewed-not-delivered-' + (student.userid || student.name) + '-' + sequence + '-' + closedAt,
                    kind: 'viewednotdelivered', priority: 'warning', student: student, time: closedAt,
                    text: tr('attention_today_viewed_not_delivered', '{name} viu, mas não entregou {activity}.')
                        .replace('{name}', student.name).replace('{activity}', activityName),
                    action: targetUrl ? 'activity' : 'student', url: targetUrl, activity: activityName});
            });
        });
        return alerts;
    }
    function buildAlerts(includeResolved) {
        var state = dashboard().state || {};
        var now = Date.now();
        var alerts = [];
        if (preferences.inactive) {
            (state.students || []).forEach(function(student) {
                var events = (state.logs || []).filter(function(log) {
                    return Number(log._userid || log.userid || 0) === Number(student.userid || 0);
                }).map(function(log) { return Number(log._ts || log.timecreated || 0); }).filter(Boolean).sort(function(a, b) { return b - a; });
                if (events.length < 2 || events[0] < Math.floor(now / 1000) - 86400) { return; }
                var previous = events.find(function(timestamp) { return events[0] - timestamp >= 86400; });
                var gap = previous ? Math.floor((events[0] - previous) / 86400) : 0;
                if (gap >= Number(preferences.days)) {
                    alerts.push({id: 'returned-' + (student.userid || student.name) + '-' + events[0], kind: 'returned', priority: 'info',
                        student: student, time: events[0], text: tr('attention_today_returned', '{name} retornou após {days} dias inativo.')
                            .replace('{name}', student.name).replace('{days}', String(gap)), action: 'student'});
                }
            });
        }
        if (preferences.awaitinggrade) { alerts = alerts.concat(awaitingAlerts()); }
        alerts = alerts.concat(viewedNotDeliveredAlerts());
        if (preferences.message) {
            var module = Store.getModule('MWAMoodleMessages');
            var conversations = module && module.getConversations ? module.getConversations() : [];
            conversations.filter(function(item) { return Number(item.unread || 0) > 0; }).forEach(function(item) {
                alerts.push({id: 'message-' + item.userid + '-' + item.lasttime, kind: 'message', priority: 'info',
                    student: {userid: item.userid, name: item.name, avatar: item.avatar}, time: Number(item.lasttime || 0),
                    text: tr('attention_today_message_reply', '{name} enviou uma mensagem.').replace('{name}', item.name),
                    action: 'reply'});
            });
        }
        var persisted = {};
        serverHistory.forEach(function(record) { persisted[record.noticekey] = record; });
        alerts.forEach(function(item) {
            var persistedRecord = persisted[item.id] || null;
            var manuallyResolved = persistedRecord && persistedRecord.status === 'resolved' &&
                persistedRecord.resolution === 'manual';
            item.resolved = !!resolved[item.id] || !!manuallyResolved;
            item.seen = !!seen[item.id];
        });
        var present = {};
        alerts.forEach(function(item) { present[item.id] = true; });
        serverHistory.forEach(function(record) {
            if (present[record.noticekey] || (record.status === 'resolved' && !includeResolved)) { return; }
            if (record.status !== 'active' && record.status !== 'resolved') { return; }
            try {
                var archived = JSON.parse(record.payload || '{}');
                archived.resolved = record.status === 'resolved';
                archived.seen = archived.resolved || !!seen[archived.id];
                archived.resolution = record.resolution || '';
                archived.resolvedtime = Number(record.timeresolved || 0);
                archived.persisted = true;
                alerts.push(archived);
            } catch (ignore) {}
        });
        return alerts.filter(function(item) { return includeResolved || !item.resolved; }).sort(function(a, b) {
            var rank = {urgent: 0, warning: 1, info: 2};
            return rank[a.priority] - rank[b.priority] || Number(b.time) - Number(a.time);
        });
    }
    function formatTime(timestamp) {
        if (!timestamp) { return tr('updated_now', 'Agora'); }
        var date = new Date(Number(timestamp) * 1000);
        var today = new Date();
        var sameDay = date.toDateString() === today.toDateString();
        return (sameDay ? tr('today', 'Hoje') + ', ' : '') + date.toLocaleString(undefined,
            sameDay ? {hour: '2-digit', minute: '2-digit'} : {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
    }
    function icon(kind) {
        return {inactive: 'warning', returned: 'refresh', awaitinggrade: 'clipboard', submission: 'clipboard',
            message: 'message', viewednotdelivered: 'eye'}[kind] || 'bell';
    }
    function actionLabel(action) {
        return action === 'reply' ? tr('attention_today_reply', 'Responder') :
            (action === 'grade' ? tr('attention_today_grade', 'Corrigir') :
                (action === 'activity' ? tr('attention_today_open_activity', 'Abrir atividade') : tr('attention_today_view_student', 'Ver aluno')));
    }
    function requiresAction(item) {
        return item && (item.kind === 'awaitinggrade' || item.kind === 'viewednotdelivered');
    }
    function render() {
        var root = document.getElementById('mwaAttentionToday');
        loadMonitored();
        loadResolved();
        if (!loaded && !loading) { loadPreferences().then(render); }
        var alerts = buildAlerts(false);
        syncHistory(alerts);
        var navBadge = document.getElementById('navAlertBadge');
        if (navBadge) { navBadge.textContent = String(alerts.length); navBadge.hidden = alerts.length === 0; }
        if (!root) { return; }
        var visible = alerts.filter(function(item) {
            return filter === 'all' || (filter === 'action' && requiresAction(item)) || (filter === 'unread' && !item.seen);
        });
        var rows = visible.slice(0, 6).map(function(item) {
            var avatar = item.student.avatar ? item.student.avatar : studentAvatar(item.student);
            return '<article class="mwa-att-row is-' + esc(item.priority) + ' is-kind-' + esc(item.kind) + '"><i class="mwa-att-unread"></i>' +
                '<span class="mwa-att-kind"><svg class="mwa-ui-icon"><use href="#mwa-icon-' + icon(item.kind) + '"></use></svg></span>' +
                '<span class="mwa-att-avatar">' + avatar + '</span><span class="mwa-att-copy"><strong>' + esc(item.text) +
                '</strong><small>' + esc(formatTime(item.time)) + '</small></span>' +
                '<button type="button" class="mwa-att-action" data-att-action="' + esc(item.action) + '" data-alertid="' + esc(item.id) + '" data-url="' + esc(item.url || '') + '" data-userid="' + Number(item.student.userid || 0) + '" data-student="' + esc(item.student.name || '') + '">' + esc(actionLabel(item.action)) + '</button>' +
                '<button type="button" class="mwa-att-resolve" data-att-resolve="' + esc(item.id) + '" title="' + esc(tr('attention_today_mark_resolved')) + '">&#10003;</button></article>';
        }).join('');
        renderTemplate(root, 'attentiontoday_card', {
            title: tr('attention_today_title', 'Atenção hoje'),
            pendingcount: alerts.length,
            pendinglabel: tr('attention_today_pending', 'pendentes'),
            configurelabel: tr('attention_today_configure', 'Configurar avisos'),
            filters: [['all', 'attention_today_all'], ['unread', 'attention_today_unread'],
                ['action', 'attention_today_urgent']].map(function(item) {
                return {value: item[0], label: tr(item[1]), active: filter === item[0]};
            }),
            rowshtml: rows,
            empty: !rows,
            emptylabel: tr('attention_today_empty'),
            hasalerts: alerts.length > 0,
            viewalllabel: tr('attention_today_view_all').replace('{count}', alerts.length),
            viewstudentslabel: tr('attention_today_view_students')
        }, function() { bind(root); });
    }
    function performAction(button) {
        var action = button.getAttribute('data-att-action');
        var alertid = button.getAttribute('data-alertid');
        if (alertid) { seen[alertid] = Date.now(); saveSeen(); }
        var targetUrl = button.getAttribute('data-url') || '';
        if ((action === 'grade' || action === 'activity') && targetUrl) {
            window.location.assign(targetUrl);
        } else if (action === 'reply') {
            var messages = Store.getModule('MWAMoodleMessages');
            if (messages) { messages.openUnread(); }
            Store.callHandler('showPage', 'moodlemessages');
        } else if (action === 'student' && window.goToStudentProfile) {
            window.goToStudentProfile(button.getAttribute('data-student') || '',
                Number(button.getAttribute('data-userid') || 0));
        } else {
            var classList = window.MWAClassList;
            if (classList && action === 'grade') { classList.setFilter('awaitinggrade', ''); }
            Store.callHandler('showPage', 'classlist');
        }
    }
    function renderFull() {
        var root = document.getElementById('mwaAttentionAll');
        if (!root) { return; }
        loadMonitored();
        loadResolved();
        if (!loaded && !loading) { loadPreferences().then(renderFull); }
        var allAlerts = buildAlerts(true);
        syncHistory(allAlerts.filter(function(item) { return !item.resolved; }));
        var active = allAlerts.filter(function(item) { return !item.resolved; });
        var actionRequired = active.filter(requiresAction).length;
        var resolvedCount = allAlerts.length - active.length;
        var visible = allAlerts.filter(function(item) {
            if (fullFilter === 'resolved' && !item.resolved) { return false; }
            if (fullFilter === 'action' && (item.resolved || !requiresAction(item))) { return false; }
            if (fullFilter === 'all' && item.resolved) { return false; }
            if (fullType !== 'all' && item.kind !== fullType) { return false; }
            return !fullSearch || String(item.student.name || '').toLowerCase().indexOf(fullSearch.toLowerCase()) !== -1 ||
                String(item.text || '').toLowerCase().indexOf(fullSearch.toLowerCase()) !== -1;
        });
        if (fullSort === 'date') {
            visible.sort(function(a, b) { return Number(b.time || 0) - Number(a.time || 0); });
        }
        var rows = visible.map(function(item) {
            var avatar = item.student.avatar ? item.student.avatar : studentAvatar(item.student);
            return '<article class="mwa-att-row mwa-att-full-row is-' + esc(item.priority) + ' is-kind-' + esc(item.kind) + (item.resolved ? ' is-resolved' : '') + '">' +
                '<i class="mwa-att-unread"></i><span class="mwa-att-kind"><svg class="mwa-ui-icon"><use href="#mwa-icon-' + icon(item.kind) + '"></use></svg></span>' +
                '<span class="mwa-att-avatar">' + avatar + '</span><span class="mwa-att-copy"><strong>' + esc(item.text) + '</strong><small>' + esc(formatTime(item.time)) + '</small></span>' +
                '<button type="button" class="mwa-att-action" data-att-action="' + esc(item.action) + '" data-alertid="' + esc(item.id) + '" data-url="' + esc(item.url || '') + '" data-userid="' + Number(item.student.userid || 0) + '" data-student="' + esc(item.student.name || '') + '">' + esc(actionLabel(item.action)) + '</button>' +
                '<button type="button" class="mwa-att-resolve" data-att-toggle="' + esc(item.id) + '" data-att-resolved="' + (item.resolved ? '1' : '0') + '" title="' + esc(item.resolved ? tr('attention_today_resolved') : tr('attention_today_mark_resolved')) + '">' + (item.resolved ? '&#8635;' : '&#10003;') + '</button></article>';
        }).join('');
        var typeOptions = [['all', 'attention_today_type_all'], ['returned', 'attention_today_type_returned'],
            ['awaitinggrade', 'attention_today_type_awaiting'], ['message', 'attention_today_type_message'],
            ['viewednotdelivered', 'attention_today_type_viewed_not_delivered']];
        renderTemplate(root, 'attentiontoday_full', {
            totalLabel: tr('attention_today_total'), total: active.length,
            totalSub: tr('attention_today_total_sub'),
            totalActive: fullFilter === 'all',
            actionLabel: tr('attention_today_urgent_count'), actionCount: actionRequired,
            actionSub: tr('attention_today_action_sub'),
            actionActive: fullFilter === 'action',
            resolvedLabel: tr('attention_today_resolved_count'), resolvedCount: resolvedCount,
            resolvedSub: tr('attention_today_resolved_sub'),
            resolvedActive: fullFilter === 'resolved',
            filters: [['all', 'attention_today_all'], ['action', 'attention_today_urgent'],
                ['resolved', 'attention_today_resolved']].map(function(item) {
                return {value: item[0], label: tr(item[1]), active: fullFilter === item[0]};
            }),
            configurelabel: tr('attention_today_configure'), search: fullSearch,
            searchplaceholder: tr('attention_today_search'),
            types: typeOptions.map(function(option) {
                return {value: option[0], label: tr(option[1]), selected: fullType === option[0]};
            }),
            prioritylabel: tr('attention_today_sort_priority'), datelabel: tr('attention_today_sort_date'),
            priorityselected: fullSort === 'priority', dateselected: fullSort === 'date',
            rowshtml: rows, empty: !rows, emptylabel: tr('attention_today_empty')
        }, function() {
        root.querySelector('.mwa-att-config').onclick = openSettings;
        root.querySelectorAll('[data-att-full-filter]').forEach(function(button) { button.onclick = function() { fullFilter = button.getAttribute('data-att-full-filter'); renderFull(); }; });
        root.querySelectorAll('[data-att-kpi-filter]').forEach(function(card) {
            var applyKpiFilter = function() {
                fullFilter = card.getAttribute('data-att-kpi-filter');
                renderFull();
            };
            card.onclick = applyKpiFilter;
            card.onkeydown = function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    applyKpiFilter();
                }
            };
        });
        root.querySelectorAll('[data-att-action]').forEach(function(button) { button.onclick = function() { performAction(button); }; });
        root.querySelectorAll('[data-att-toggle]').forEach(function(button) { button.onclick = function() { var id = button.getAttribute('data-att-toggle'); seen[id] = Date.now(); setResolved(id, button.getAttribute('data-att-resolved') !== '1'); saveSeen(); render(); renderFull(); }; });
        root.querySelector('#mwaAttSearch').oninput = function(event) { fullSearch = event.target.value || ''; window.clearTimeout(renderFull.searchTimer); renderFull.searchTimer = window.setTimeout(renderFull, 180); };
        root.querySelector('#mwaAttType').onchange = function(event) { fullType = event.target.value; renderFull(); };
        root.querySelector('#mwaAttSort').onchange = function(event) { fullSort = event.target.value; renderFull(); };
        });
    }
    function openSettings() {
        var overlay = document.createElement('div');
        overlay.className = 'mwa-att-overlay';
        var rules = [
            ['inactive', 'alert_rule_returned', 'alert_rule_returned_desc'],
            ['awaitinggrade', 'alert_rule_awaiting_grade', 'alert_rule_awaiting_grade_desc'],
            ['message', 'alert_rule_message', 'alert_rule_message_desc'],
            ['lowgrade', 'alert_rule_viewed_not_delivered', 'alert_rule_viewed_not_delivered_desc']
        ];
        document.body.appendChild(overlay);
        renderTemplate(overlay, 'attentiontoday_settings', {
            title: tr('alert_settings_title'), subtitle: tr('alert_settings_subtitle'),
            rules: rules.map(function(rule) {
                return {name: rule[0], label: tr(rule[1]), description: tr(rule[2]), checked: !!preferences[rule[0]]};
            }),
            dayslabel: tr('alert_return_days_label'), days: Number(preferences.days), grade: Number(preferences.grade),
            cancellabel: tr('alert_settings_cancel'), savelabel: tr('alert_settings_save')
        }, function() {
        overlay.querySelectorAll('[data-att-close]').forEach(function(button) { button.onclick = function() { overlay.remove(); }; });
        overlay.onclick = function(event) { if (event.target === overlay) { overlay.remove(); } };
        overlay.querySelector('form').onsubmit = function(event) {
            event.preventDefault();
            var form = event.currentTarget;
            var data = {courseid: Number(config().courseid || 0)};
            rules.forEach(function(rule) { data[rule[0]] = !!form.elements[rule[0]].checked; });
            data.days = Number(form.elements.days.value || 7); data.grade = Number(form.elements.grade.value || 60);
            var submit = form.querySelector('[type="submit"]'); submit.disabled = true;
            Store.callAction('block_mwa_dashboard_set_alert_preferences', data).then(function(response) {
                preferences = JSON.parse(response.preferences || '{}'); loaded = true; overlay.remove();
                Store.notify(tr('alert_settings_saved'), 'success'); render();
                var fullPage = document.getElementById('page-alerts');
                if (fullPage && fullPage.classList.contains('active')) { renderFull(); }
            }).catch(function() { submit.disabled = false; Store.notify(tr('alert_settings_error'), 'error'); });
        };
        });
    }
    function bind(root) {
        root.querySelector('.mwa-att-config').onclick = openSettings;
        root.querySelectorAll('[data-att-filter]').forEach(function(button) { button.onclick = function() { filter = button.getAttribute('data-att-filter'); render(); }; });
        root.querySelectorAll('[data-att-resolve]').forEach(function(button) { button.onclick = function() { var id = button.getAttribute('data-att-resolve'); setResolved(id, true); seen[id] = Date.now(); saveSeen(); render(); }; });
        root.querySelectorAll('[data-att-action]').forEach(function(button) { button.onclick = function() {
            performAction(button);
        }; });
        var all = root.querySelector('.mwa-att-view-all'); if (all) { all.onclick = function() { Store.callHandler('showPage', 'alerts'); }; }
        var studentsButton = root.querySelector('.mwa-att-view-students'); if (studentsButton) { studentsButton.onclick = function() {
            var classList = window.MWAClassList;
            if (classList && classList.showAttentionStudents) {
                classList.showAttentionStudents(buildAlerts(false).map(function(item) {
                    return {userid: Number(item.student.userid || 0), name: item.student.name || ''};
                }));
            }
            Store.callHandler('showPage', 'classlist');
        }; }
    }
    function getNoticeSummary() {
        loadMonitored();
        var alerts = buildAlerts(false);
        syncHistory(alerts);
        var counts = {message: 0, returned: 0, awaitinggrade: 0, viewednotdelivered: 0};
        alerts.forEach(function(item) { if (counts[item.kind] !== undefined) { counts[item.kind]++; } });
        return {total: alerts.length, counts: counts, alerts: alerts};
    }
    function refreshHistory() { historyHash = ''; render(); }
    var api = {render: render, renderFull: renderFull, openSettings: openSettings,
        getNoticeSummary: getNoticeSummary, syncMonitoring: syncMonitoring, refreshHistory: refreshHistory};
    Store.register('MWAAttentionToday', api);
    return api;
});
