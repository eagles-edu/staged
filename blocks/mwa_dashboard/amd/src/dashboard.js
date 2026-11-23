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
 * AMD entry point for the MWA Analytics Dashboard block.
 *
 * @module     block_mwa_dashboard/dashboard
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([
    'core/ajax',
    'core/log',
    'block_mwa_dashboard/dashboardstore',
    'block_mwa_dashboard/dashboardapp'
], function(Ajax, Log, Store, DashboardApp) {

    'use strict';

    
    var callAction = function(method, args) {
        var calls = Ajax.call([{
            methodname: method,
            args: args || {}
        }]);
        return calls[0];
    };
    var lastLoadAt = 0;
    var activeLoad = null;

    
    var deliverError = function(err) {
        var dashboard = Store.getModule('MWADashboard');
        var message = (err && err.message) ? err.message : String(err || 'Data load failed');
        if (dashboard && typeof dashboard.receiveError === 'function') {
            dashboard.receiveError(message);
        }
    };

    
    var loadAndDeliver = function(courseid, groupid) {
        if (activeLoad) {
            return activeLoad;
        }
        // Keep these expensive requests in separate HTTP calls. Moodle batches
        // entries passed to a single Ajax.call() into one service.php request;
        // loading logs and the complete grade roster together can exceed the
        // web server's execution or memory limit and return HTTP 503.
        var loadLogs = function() {
            return callAction('block_mwa_dashboard_get_logs', {
                courseid: courseid, since: 0, groupid: groupid || 0
            }).then(function(result) {
                return {result: result, error: null};
            }).catch(function(error) {
                return {result: null, error: error};
            });
        };
        var loadGrades = function() {
            return callAction('block_mwa_dashboard_get_grades', {
                courseid: courseid, groupid: groupid || 0
            }).then(function(result) {
                return {result: result, error: null};
            }).catch(function(error) {
                return {result: null, error: error};
            });
        };

        // Run sequentially to keep peak PHP/database load low. A successful
        // dataset is still delivered if the other endpoint temporarily fails.
        activeLoad = loadLogs().then(function(logsState) {
            return loadGrades().then(function(gradesState) {
                return [logsState, gradesState];
            });
        }).then(function(states) {
            var dashboard = Store.getModule('MWADashboard');
            var logsResult = states[0].result;
            var gradesResult = states[1].result;

            if (!logsResult && !gradesResult) {
                var failure = states[0].error || states[1].error;
                Log.error('block_mwa_dashboard/dashboard: logs and grades failed to load');
                Log.error(failure);
                deliverError(failure);
                return states;
            }

            if (dashboard && typeof dashboard.receiveData === 'function') {
                dashboard.receiveData({
                    type: 'mwa-data',
                    logs: logsResult ? (logsResult.logs || '[]') : undefined,
                    logsCount: logsResult ? (logsResult.count || 0) : undefined,
                    grades: gradesResult ? (gradesResult.grades || '[]') : undefined,
                    gradesCount: gradesResult ? (gradesResult.count || 0) : undefined
                });
            }
            if (states[0].error) {
                Log.warn('block_mwa_dashboard/dashboard: logs temporarily unavailable');
            }
            if (states[1].error) {
                Log.warn('block_mwa_dashboard/dashboard: grades temporarily unavailable');
            }
            lastLoadAt = Date.now();
            return states;
        }).then(function(results) {
            activeLoad = null;
            return results;
        });
        return activeLoad;
    };

    var init = function(params) {
        params = params || {};
        var config = params.config || {};
        var courseid = params.courseid ? parseInt(params.courseid, 10) : parseInt(config.courseid || 0, 10);
        var groupid = parseInt(config.groupid || 0, 10);

        Store.configure(config, params.strings || {}, callAction);
        DashboardApp.init(config);

        var refreshDashboardData = function(forceFresh) {
            if (courseid <= 0) {
                return Promise.resolve();
            }
            if (forceFresh && activeLoad) {
                return activeLoad.then(function() {
                    return loadAndDeliver(courseid, groupid);
                });
            }
            return loadAndDeliver(courseid, groupid);
        };

        var groupFilter = document.getElementById('mwaGroupFilter');
        if (groupFilter) {
            groupFilter.addEventListener('change', function() {
                var url = new URL(window.location.href);
                url.searchParams.set('group', groupFilter.value || '0');
                window.location.assign(url.toString());
            });
        }

        refreshDashboardData();

        
        window.MWAReloadData = refreshDashboardData;

        setTimeout(function() {
            window.addEventListener('pageshow', function(event) {
                if (event.persisted || Date.now() - lastLoadAt > 30000) {
                    refreshDashboardData();
                }
            });
        }, 1000);
    };

    return {
        init: init
    };
});
