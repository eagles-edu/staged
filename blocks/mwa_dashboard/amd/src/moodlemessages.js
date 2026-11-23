// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle. If not, see <http://www.gnu.org/licenses/>.

/**
 * Moodle private messages embedded in the MWA dashboard.
 *
 * @module block_mwa_dashboard/moodlemessages
 * @copyright 2026 Bruno Porto
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
define(['block_mwa_dashboard/dashboardstore', 'core/templates'], function(Store, Templates) {
    'use strict';

    var conversations = [];
    var selected = 0;
    var messages = [];
    var loading = false;
    var bound = false;
    var poller = null;
    var polling = false;
    var listFilter = 'active';
    var conversationSearch = '';
    var quotedMessage = null;

    function tr(key) {
        var strings = Store.getStrings();
        var value = Object.prototype.hasOwnProperty.call(strings, key) ? strings[key] : '';
        return value && !/^\[\[/.test(value) ? value : key;
    }
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char];
        });
    }
    function root() { return document.getElementById('moodleMessagesApp'); }
    function replaceContents(node, html) {
        if (node) {
            Templates.replaceNodeContents(node, html, '');
        }
    }
    function config() { return Store.getConfig() || {}; }
    function selectedConversation() {
        return conversations.find(function(item) { return Number(item.userid) === Number(selected); }) || null;
    }
    function browserLocale() {
        var language = String(config().language || '').replace(/_/g, '-');
        var parts = language.split('-').filter(Boolean);
        if (parts.length > 1) {
            parts[0] = parts[0].toLowerCase();
            parts[1] = parts[1].toUpperCase();
        }
        return parts.join('-') || undefined;
    }
    function formatTime(timestamp) {
        if (!timestamp) { return ''; }
        try {
            return new Date(Number(timestamp) * 1000).toLocaleString(browserLocale(), {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
        } catch (ignore) {
            return new Date(Number(timestamp) * 1000).toLocaleString(undefined, {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
        }
    }
    function findStudent(userid) {
        var dashboard = Store.getModule('MWADashboard');
        var state = dashboard && dashboard.state ? dashboard.state : {};
        var pools = [state.students, state.rows, state.studentRows, state.gradeStudents];
        var found = null;
        pools.some(function(pool) {
            if (!Array.isArray(pool)) { return false; }
            found = pool.find(function(student) {
                return Number(student.userid || student.id || student.userId) === Number(userid);
            }) || null;
            return !!found;
        });
        return found || {};
    }
    function academicValue(student, keys, fallback) {
        for (var index = 0; index < keys.length; index++) {
            if (student[keys[index]] !== undefined && student[keys[index]] !== null) { return student[keys[index]]; }
        }
        return fallback;
    }
    function studentLastAccess(student) {
        var value = academicValue(student, ['moodleLastAccess', 'lastAccess', 'lastaccess', 'last'], null);
        var date = null;
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'number' && value > 0) {
            date = new Date(value > 100000000000 ? value : value * 1000);
        } else if (value) {
            date = new Date(value);
        }
        if (!date || isNaN(date.getTime())) {
            return tr('moodle_messages_never');
        }
        return formatTime(Math.floor(date.getTime() / 1000));
    }
    function openTrackedResourceCount() {
        var now = Math.floor(Date.now() / 1000);
        var resourceModules = {page: true, book: true, url: true, resource: true, folder: true, imscp: true};
        return (config().activitylinks || []).filter(function(item) {
            var module = String(item && (item.modname || item.module) || '').toLowerCase();
            var available = String(item && item.available !== undefined ? item.available : '1') !== '0';
            var from = Number(item && item.availablefrom || 0);
            var until = Number(item && item.availableuntil || 0);
            return item && item.tracked !== false && resourceModules[module] && available &&
                (!from || from <= now) && (!until || until >= now);
        }).length;
    }
    function updateBadge(total) {
        var badge = document.getElementById('navMoodleMessagesBadge');
        if (badge) {
            badge.textContent = String(total || 0);
            badge.hidden = !total;
        }
        var dashboard = Store.getModule('MWADashboard');
        if (dashboard) {
            dashboard.unreadMessagesTotal = Number(total || 0);
            dashboard.unreadConversations = conversations.filter(function(item) {
                return Number(item.unread || 0) > 0;
            }).length;
            if (typeof dashboard.renderKPIs === 'function') { dashboard.renderKPIs(); }
        }
        var attention = Store.getModule('MWAAttentionToday');
        if (attention && typeof attention.render === 'function') {
            attention.render();
            var alertsPage = document.getElementById('page-alerts');
            if (alertsPage && alertsPage.classList.contains('active') && typeof attention.renderFull === 'function') {
                attention.renderFull();
            }
        }
        var actionCenter = window.MWAActionCenter;
        if (actionCenter && typeof actionCenter.render === 'function') { actionCenter.render(); }
    }
    function renderLoading() {
        if (root()) {
            replaceContents(root(), '<div class="mwa-mm-state"><span class="spinner"></span><p>' +
                esc(tr('moodle_messages_loading')) + '</p></div>');
        }
    }
    function renderList() {
        var query = ((document.getElementById('mwaMmSearch') || {}).value || '').toLowerCase();
        var visible = conversations.filter(function(item) {
            var matchesText = !query || String(item.name).toLowerCase().indexOf(query) !== -1;
            if (!matchesText) { return false; }
            if (listFilter === 'archived') { return !!item.archived; }
            if (item.archived) { return false; }
            if (listFilter === 'unread') { return Number(item.unread) > 0; }
            if (listFilter === 'followup') { return item.workflowstatus === 'followup'; }
            if (listFilter === 'resolved') { return item.workflowstatus === 'resolved'; }
            return true;
        });
        if (!visible.length) {
            return '<div class="mwa-mm-empty-small">' + esc(tr('moodle_messages_no_conversation')) + '</div>';
        }
        return visible.map(function(item) {
            var active = Number(item.userid) === Number(selected) ? ' is-active' : '';
            var state = item.archived ? 'archived' : (item.workflowstatus || 'open');
            return '<button type="button" class="mwa-mm-person' + active + '" data-mm-user="' + Number(item.userid) + '">' +
                '<span class="mwa-mm-picture mwa-mm-presence-wrap">' + item.avatar + (item.online ? '<i class="mwa-mm-online-dot" title="' + esc(tr('moodle_messages_online')) + '"></i>' : '') + '</span><span class="mwa-mm-person-copy"><strong>' +
                esc(item.name) + '</strong><span>' + esc(item.lastmessage || item.email || '') + '</span><em class="mwa-mm-state-tag is-' + esc(state) + '">' + esc(stateLabel(state)) + '</em></span>' +
                '<span class="mwa-mm-person-meta"><small>' + esc(formatTime(item.lasttime)) + '</small>' +
                (Number(item.unread) ? '<b>' + Number(item.unread) + '</b>' : '') + '</span></button>';
        }).join('');
    }
    function stateLabel(state) {
        var labels = {
            open: tr('moodle_messages_state_open'),
            followup: tr('moodle_messages_state_followup'),
            resolved: tr('moodle_messages_state_resolved'),
            archived: tr('moodle_messages_state_archived')
        };
        return labels[state] || labels.open;
    }
    function renderMessageText(value) {
        var text = String(value || '');
        var quote = '';
        var reply = text;
        if (text.indexOf('↪ ') === 0) {
            var newBreak = text.indexOf('\n\n');
            quote = newBreak >= 0 ? text.slice(2, newBreak) : text.slice(2);
            reply = newBreak >= 0 ? text.slice(newBreak + 2) : '';
        } else if (text.indexOf('> ') === 0) {
            var legacyBreak = text.lastIndexOf('\n\n');
            if (legacyBreak > 0) {
                quote = text.slice(0, legacyBreak).replace(/^> ?/gm, '').replace(/\s+/g, ' ').trim();
                reply = text.slice(legacyBreak + 2);
            }
        }
        var html = '';
        if (quote) {
            var compact = quote.slice(0, 160) + (quote.length > 160 ? '…' : '');
            html += '<blockquote class="mwa-mm-inline-quote">' + esc(compact) + '</blockquote>';
        }
        return html + esc(reply).replace(/\n/g, '<br>');
    }
    function renderConversation() {
        var conversation = selectedConversation();
        if (!conversation) {
            return '<div class="mwa-mm-empty"><svg class="mwa-ui-icon"><use href="#mwa-icon-message"></use></svg><strong>' +
                esc(tr('moodle_messages_no_conversation')) + '</strong><span>' +
                esc(tr('moodle_messages_course_students')) + '</span></div>';
        }
        var shownMessages = conversationSearch ? messages.filter(function(message) {
            return String(message.content || '').toLowerCase().indexOf(conversationSearch.toLowerCase()) !== -1;
        }) : messages;
        var content = shownMessages.length ? shownMessages.map(function(message) {
            var delivery = '';
            if (message.mine) {
                delivery = message.read ?
                    '&#10003;&#10003; ' + esc(message.readtime ?
                        tr('moodle_messages_delivery_read_at').replace('{time}', formatTime(message.readtime)) :
                        tr('moodle_messages_delivery_read')) :
                    '&#10003; ' + esc(tr('moodle_messages_delivery_sent'));
            }
            var highlighted = (message.quotecontent ? '<blockquote class="mwa-mm-inline-quote">' +
                esc(String(message.quotecontent).slice(0, 160)) + (String(message.quotecontent).length > 160 ? '…' : '') +
                '</blockquote>' : '') + renderMessageText(message.content);
            return '<div class="mwa-mm-message ' + (message.mine ? 'is-mine' : 'is-student') + '" data-message-id="' + Number(message.id) + '"><div class="mwa-mm-message-tools">' +
                '<button type="button" data-mm-reply="' + Number(message.id) + '" title="' + esc(tr('moodle_messages_reply')) + '">&#8617;</button>' +
                '<button type="button" data-mm-copy="' + Number(message.id) + '" title="' + esc(tr('moodle_messages_copy')) + '">&#128203;</button></div><div>' +
                highlighted + '</div><small>' + esc(formatTime(message.timecreated)) +
                (delivery ? '<span class="mwa-mm-delivery' + (message.read ? ' is-read' : '') + '">' + delivery + '</span>' : '') +
                '</small></div>';
        }).join('') : '<div class="mwa-mm-empty-small">' + esc(tr('moodle_messages_no_messages')) + '</div>';
        var status = conversation.workflowstatus || 'open';
        return '<header class="mwa-mm-chat-head"><span class="mwa-mm-picture mwa-mm-presence-wrap">' + conversation.avatar + (conversation.online ? '<i class="mwa-mm-online-dot"></i>' : '') + '</span><div class="mwa-mm-chat-identity"><strong>' +
            esc(conversation.name) + '</strong><span>' + (conversation.online ? esc(tr('moodle_messages_online')) : esc(conversation.email || '')) + '</span><small>' + esc(conversation.coursename || '') + '</small></div>' +
            '<div class="mwa-mm-head-actions"><label class="mwa-mm-conversation-search"><input id="mwaMmConversationSearch" type="search" value="' + esc(conversationSearch) + '" placeholder="' + esc(tr('moodle_messages_search_conversation')) + '"></label>' +
            '<select id="mwaMmStatus"><option value="open"' + (status === 'open' ? ' selected' : '') + '>' + esc(stateLabel('open')) + '</option><option value="followup"' + (status === 'followup' ? ' selected' : '') + '>' + esc(stateLabel('followup')) + '</option><option value="resolved"' + (status === 'resolved' ? ' selected' : '') + '>' + esc(stateLabel('resolved')) + '</option></select>' +
            '<button type="button" class="btn-ghost mwa-mm-archive-btn" data-mm-archive="1" title="' + esc(conversation.archived ? tr('moodle_messages_reopen') : tr('moodle_messages_archive')) + '" aria-label="' + esc(conversation.archived ? tr('moodle_messages_reopen') : tr('moodle_messages_archive')) + '"><span aria-hidden="true">' + (conversation.archived ? '&#8634;' : '&#128230;') + '</span></button></div></header>' +
            '<div id="mwaMmHistory" class="mwa-mm-history">' + content + '</div>' +
            '<form id="mwaMmForm" class="mwa-mm-composer">' + (quotedMessage ? '<div class="mwa-mm-quote-preview"><span><b>' + esc(tr('moodle_messages_replying')) + '</b> ' + esc(String(quotedMessage.content).slice(0, 120)) + '</span><button type="button" data-mm-cancel-quote="1">&times;</button></div>' : '') + '<div class="mwa-mm-input-wrap"><textarea id="mwaMmText" rows="2" maxlength="4000" placeholder="' +
            esc(tr('moodle_messages_write')) + '"></textarea><button type="button" class="mwa-mm-emoji-toggle" data-mm-emoji-toggle title="' + esc(tr('moodle_messages_insert_emoji')) + '" aria-label="' + esc(tr('moodle_messages_insert_emoji')) + '">&#9786;</button>' +
            '<div class="mwa-mm-emoji-picker" data-mm-emoji-picker hidden>' + ['😀','😊','👍','👏','🎉','💡','📚','✅','⭐','❤️','🙏','💪','🚀','👀','🤝','🌟'].map(function(emoji) { return '<button type="button" data-mm-emoji="' + emoji + '">' + emoji + '</button>'; }).join('') + '</div></div><button type="submit" class="btn-accent">' +
            esc(tr('moodle_messages_send')) + '</button></form>';
    }
    function renderContext() {
        var conversation = selectedConversation();
        if (!conversation) { return ''; }
        var student = findStudent(conversation.userid);
        var grade = academicValue(student, ['grade', 'score', 'totalGrade', 'currentgrade'], '—');
        var lastAccess = studentLastAccess(student);
        var pending = academicValue(student, ['pendingActivities', 'pendingactivities', 'activitiesPending'], null);
        if (pending === null) {
            pending = Math.max(0, Number(student.gradeItems || 0) - Number(student.gradeLaunched || 0));
        }
        var resources = academicValue(student, ['pendingResources', 'pendingresources', 'resourcesPending'], null);
        if (resources === null) {
            var resourceTotal = openTrackedResourceCount();
            var accessed = resourceTotal ? Math.round(resourceTotal * Number(student.coverage || 0) / 100) : 0;
            resources = Math.max(0, resourceTotal - accessed);
        }
        return '<div class="mwa-mm-context-card"><div class="mwa-mm-context-title">' +
            '<span class="mwa-mm-context-icon"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-chart"></use></svg></span>' +
            '<h3>' + esc(tr('moodle_messages_student_info')) + '</h3></div><dl>' +
            '<div class="is-grade"><span class="mwa-mm-metric-icon"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-star"></use></svg></span><dt>' + esc(tr('moodle_messages_grade')) + '</dt><dd>' + esc(grade) + '</dd></div>' +
            '<div class="is-access"><span class="mwa-mm-metric-icon"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-clock"></use></svg></span><dt>' + esc(tr('moodle_messages_last_access')) + '</dt><dd>' + esc(lastAccess) + '</dd></div>' +
            '<div class="is-pending"><span class="mwa-mm-metric-icon"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-file"></use></svg></span><dt>' + esc(tr('moodle_messages_pending_activities')) + '</dt><dd>' + esc(pending) + '</dd></div>' +
            '<div class="is-resources"><span class="mwa-mm-metric-icon"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-eye"></use></svg></span><dt>' + esc(tr('moodle_messages_unaccessed_resources')) + '</dt><dd>' + esc(resources) + '</dd></div></dl>' +
            '<div class="mwa-mm-context-actions"><button type="button" class="mwa-mm-wide is-primary" data-mm-profile="1"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-user"></use></svg><span>' + esc(tr('moodle_messages_open_profile')) + '</span></button>' +
            '<button type="button" class="mwa-mm-wide is-secondary" data-mm-intervention="1"><svg class="mwa-ui-icon" aria-hidden="true"><use href="#mwa-icon-message"></use></svg><span>' + esc(tr('moodle_messages_register_intervention')) + '</span></button></div></div>';
    }
    function render() {
        var node = root();
        if (!node) { return; }
        replaceContents(node, '<aside class="mwa-mm-list"><label class="mwa-mm-search"><svg class="mwa-ui-icon"><use href="#mwa-icon-search"></use></svg>' +
            '<input id="mwaMmSearch" type="search" placeholder="' + esc(tr('moodle_messages_search')) + '"></label>' +
            '<div class="mwa-mm-filters"><button data-mm-filter="active" class="' + (listFilter === 'active' ? 'active' : '') + '">' + esc(tr('moodle_messages_filter_all')) + '</button><button data-mm-filter="unread" class="' + (listFilter === 'unread' ? 'active' : '') + '">' + esc(tr('moodle_messages_filter_unread')) + '</button><button data-mm-filter="followup" class="' + (listFilter === 'followup' ? 'active' : '') + '">' + esc(tr('moodle_messages_state_followup')) + '</button><button data-mm-filter="resolved" class="' + (listFilter === 'resolved' ? 'active' : '') + '">' + esc(tr('moodle_messages_state_resolved')) + '</button><button data-mm-filter="archived" class="' + (listFilter === 'archived' ? 'active' : '') + '">' + esc(tr('moodle_messages_state_archived')) + '</button></div>' +
            '<div class="mwa-mm-list-scroll">' + renderList() + '</div></aside><section class="mwa-mm-chat">' + renderConversation() +
            '</section><aside class="mwa-mm-context">' + renderContext() + '</aside>');
        bind();
        var history = document.getElementById('mwaMmHistory');
        if (history) { history.scrollTop = history.scrollHeight; }
    }
    function loadConversations(silent) {
        if (!silent) { renderLoading(); }
        return Store.callAction('block_mwa_dashboard_get_moodle_conversations', {
            courseid: Number(config().courseid || 0), groupid: Number(config().groupid || 0)
        }).then(function(response) {
            conversations = response.conversations || [];
            updateBadge(Number(response.totalunread || 0));
            if (selected && !selectedConversation()) { selected = 0; messages = []; }
            render();
            return response;
        }).catch(function() {
            if (root()) { replaceContents(root(), '<div class="mwa-mm-state error">' + esc(tr('moodle_messages_error')) + '</div>'); }
        });
    }
    function selectConversation(userid) {
        selected = Number(userid);
        messages = [];
        conversationSearch = '';
        quotedMessage = null;
        render();
        return Store.callAction('block_mwa_dashboard_get_moodle_messages', {courseid: Number(config().courseid || 0), userid: selected})
            .then(function(response) {
                messages = response.messages || [];
                conversations.forEach(function(item) { if (Number(item.userid) === selected) { item.unread = 0; } });
                render();
                return loadConversations(true);
            }).catch(function() { Store.notify(tr('moodle_messages_error'), 'error'); });
    }
    function sendMessage(text) {
        if (loading || !selected || !String(text).trim()) { return; }
        loading = true;
        var outgoing = String(text).trim();
        return Store.callAction('block_mwa_dashboard_send_moodle_private_message', {
            courseid: Number(config().courseid || 0), userid: selected, message: outgoing,
            quoteid: quotedMessage ? Number(quotedMessage.id || 0) : 0
        }).then(function() {
            quotedMessage = null;
            Store.notify(tr('moodle_messages_sent'), 'success');
            var notices = Store.getModule('MWAAttentionToday');
            if (notices && notices.refreshHistory) { notices.refreshHistory(); }
            return selectConversation(selected);
        }).catch(function() {
            Store.notify(tr('moodle_messages_error'), 'error');
        }).then(function() { loading = false; });
    }
    function bind() {
        var node = root();
        if (!node) { return; }
        var search = document.getElementById('mwaMmSearch');
        if (search) { search.addEventListener('input', function() {
            var scroll = node.querySelector('.mwa-mm-list-scroll');
            if (scroll) { replaceContents(scroll, renderList()); bindPeople(scroll); }
        }); }
        bindPeople(node);
        node.querySelectorAll('[data-mm-filter]').forEach(function(button) {
            button.addEventListener('click', function() {
                listFilter = button.getAttribute('data-mm-filter') || 'active';
                render();
            });
        });
        var form = document.getElementById('mwaMmForm');
        if (form) { form.addEventListener('submit', function(event) {
            event.preventDefault();
            var field = document.getElementById('mwaMmText');
            sendMessage(field ? field.value : '');
        }); }
        var composer = document.getElementById('mwaMmText');
        if (composer && form) { composer.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
                }
            }
        }); }
        var emojiToggle = node.querySelector('[data-mm-emoji-toggle]');
        var emojiPicker = node.querySelector('[data-mm-emoji-picker]');
        if (emojiToggle && emojiPicker && composer) {
            emojiToggle.addEventListener('click', function(event) {
                event.stopPropagation();
                emojiPicker.hidden = !emojiPicker.hidden;
            });
            emojiPicker.querySelectorAll('[data-mm-emoji]').forEach(function(button) {
                button.addEventListener('click', function() {
                    var emoji = button.getAttribute('data-mm-emoji') || '';
                    var start = composer.selectionStart == null ? composer.value.length : composer.selectionStart;
                    var end = composer.selectionEnd == null ? start : composer.selectionEnd;
                    composer.value = composer.value.slice(0, start) + emoji + composer.value.slice(end);
                    var nextPosition = start + emoji.length;
                    composer.focus();
                    composer.setSelectionRange(nextPosition, nextPosition);
                    emojiPicker.hidden = true;
                });
            });
            document.addEventListener('click', function closeEmojiPicker(event) {
                if (!emojiPicker.isConnected) {
                    document.removeEventListener('click', closeEmojiPicker);
                } else if (!emojiPicker.contains(event.target) && event.target !== emojiToggle) {
                    emojiPicker.hidden = true;
                }
            });
        }
        var conversationSearchField = document.getElementById('mwaMmConversationSearch');
        if (conversationSearchField) {
            conversationSearchField.addEventListener('input', function() {
                conversationSearch = conversationSearchField.value || '';
                var position = conversationSearchField.selectionStart;
                render();
                var restoredSearch = document.getElementById('mwaMmConversationSearch');
                if (restoredSearch) {
                    restoredSearch.focus();
                    restoredSearch.setSelectionRange(position, position);
                }
            });
        }
        var statusSelect = document.getElementById('mwaMmStatus');
        if (statusSelect) { statusSelect.addEventListener('change', function() {
            setConversationState(statusSelect.value, !!selectedConversation().archived);
        }); }
        var archive = node.querySelector('[data-mm-archive]');
        if (archive) { archive.addEventListener('click', function() {
            var item = selectedConversation();
            setConversationState(item.workflowstatus || 'open', !item.archived);
        }); }
        var cancelQuote = node.querySelector('[data-mm-cancel-quote]');
        if (cancelQuote) { cancelQuote.addEventListener('click', function() { quotedMessage = null; render(); }); }
        bindMessageTools(node);
        var profile = node.querySelector('[data-mm-profile]');
        if (profile) { profile.addEventListener('click', function() {
            var item = selectedConversation();
            if (item && typeof window.goToStudentProfile === 'function') {
                window.goToStudentProfile(item.name);
            } else if (item) {
                Store.callHandler('showPage', 'studentprofile');
                window.setTimeout(function() {
                    var api = window.MWAProfile || Store.getModule('MWAProfile');
                    if (api && api.loadProfile) { api.loadProfile(item.name); }
                }, 200);
            }
        }); }
        var intervention = node.querySelector('[data-mm-intervention]');
        if (intervention) { intervention.addEventListener('click', function() {
            var item = selectedConversation();
            var api = Store.getModule('MWAInterventions');
            if (item && api && api.quickMessage) { api.quickMessage(item.name, item.email, item.userid, ''); }
        }); }
    }
    function bindMessageTools(scope) {
        scope.querySelectorAll('[data-mm-reply]').forEach(function(button) {
            button.addEventListener('click', function() {
                var id = Number(button.getAttribute('data-mm-reply'));
                quotedMessage = messages.find(function(item) { return Number(item.id) === id; }) || null;
                render();
                var field = document.getElementById('mwaMmText');
                if (field) field.focus();
            });
        });
        scope.querySelectorAll('[data-mm-copy]').forEach(function(button) {
            button.addEventListener('click', function() {
                var id = Number(button.getAttribute('data-mm-copy'));
                var item = messages.find(function(message) { return Number(message.id) === id; });
                if (!item || !navigator.clipboard) return;
                navigator.clipboard.writeText(item.content).then(function() {
                    Store.notify(tr('moodle_messages_copied'), 'success');
                });
            });
        });
    }
    function setConversationState(status, archived) {
        if (!selected) return;
        Store.callAction('block_mwa_dashboard_set_moodle_conversation_state', {
            courseid: Number(config().courseid || 0), userid: selected,
            status: status, archived: !!archived
        }).then(function(response) {
            var item = selectedConversation();
            if (item) { item.workflowstatus = response.status; item.archived = !!response.archived; }
            Store.notify(tr('moodle_messages_state_saved'), 'success');
            render();
        }).catch(function() { Store.notify(tr('moodle_messages_error'), 'error'); });
    }
    function bindPeople(scope) {
        scope.querySelectorAll('[data-mm-user]').forEach(function(button) {
            button.addEventListener('click', function() { selectConversation(button.getAttribute('data-mm-user')); });
        });
    }
    function messageFingerprint(items) {
        return (items || []).map(function(item) {
            return [item.id, item.read ? 1 : 0, item.readtime || 0, item.timecreated || 0].join(':');
        }).join('|');
    }
    function refreshOpenConversation() {
        var page = document.getElementById('page-moodlemessages');
        if (polling || !page || !page.classList.contains('active')) { return Promise.resolve(); }
        if (!selected) { return loadConversations(true); }
        polling = true;
        var field = document.getElementById('mwaMmText');
        var draft = field ? field.value : '';
        var history = document.getElementById('mwaMmHistory');
        var wasAtBottom = !history || history.scrollHeight - history.scrollTop - history.clientHeight < 45;
        var oldFingerprint = messageFingerprint(messages);
        return Store.callAction('block_mwa_dashboard_get_moodle_messages', {
            courseid: Number(config().courseid || 0), userid: selected
        }).then(function(response) {
            var refreshed = response.messages || [];
            if (messageFingerprint(refreshed) !== oldFingerprint) {
                messages = refreshed;
                render();
                var restored = document.getElementById('mwaMmText');
                if (restored && draft) { restored.value = draft; }
                var refreshedHistory = document.getElementById('mwaMmHistory');
                if (refreshedHistory && wasAtBottom) { refreshedHistory.scrollTop = refreshedHistory.scrollHeight; }
            }
            return Store.callAction('block_mwa_dashboard_get_moodle_conversations', {
                courseid: Number(config().courseid || 0), groupid: Number(config().groupid || 0)
            });
        }).then(function(response) {
            conversations = response.conversations || [];
            updateBadge(Number(response.totalunread || 0));
            var list = document.querySelector('#moodleMessagesApp .mwa-mm-list-scroll');
            if (list) { replaceContents(list, renderList()); bindPeople(list); }
        }).catch(function() {
            // A temporary polling failure must not replace or interrupt the open conversation.
        }).then(function() { polling = false; });
    }
    function init() {
        if (!bound) {
            bound = true;
            poller = window.setInterval(refreshOpenConversation, 6000);
            window.addEventListener('focus', refreshOpenConversation);
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden) { refreshOpenConversation(); }
            });
        }
        return loadConversations(false);
    }

    function openUnread() {
        listFilter = 'unread';
        render();
    }

    function getConversations() { return conversations.slice(); }

    var api = {init: init, render: render, refresh: loadConversations, openUnread: openUnread,
        getConversations: getConversations};
    Store.register('MWAMoodleMessages', api);
    return api;
});
