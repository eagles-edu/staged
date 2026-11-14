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
 * AMD module for mod_gradelist collapsible grade groups and sorting.
 *
 * @module     mod_gradelist/gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(['jquery'], function($) {

    /**
     * Initialise the collapsible grade group toggles.
     */
    var init = function() {

        $(document).on('click', '.mod-gradelist-toggle', function() {
            var btn      = $(this);
            var target   = btn.next('.mod-gradelist-group-body');
            var icon     = btn.find('.mod-gradelist-toggle-icon');
            var expanded = btn.attr('aria-expanded') === 'true';

            if (expanded) {
                target.slideUp(200, function() {
                    target.addClass('collapse');
                });
                btn.attr('aria-expanded', 'false');
                icon.html('&#9654;');
            } else {
                target.removeClass('collapse').hide().slideDown(200);
                btn.attr('aria-expanded', 'true');
                icon.html('&#9660;');
            }
        });

        // Remember open groups across sort button clicks.
        $(document).on('click', '.mod-gradelist-sortbar a', function() {
            var opengroups = [];
            $('.mod-gradelist-toggle').each(function() {
                if ($(this).attr('aria-expanded') === 'true') {
                    opengroups.push($(this).closest('.mod-gradelist-group').data('groupkey'));
                }
            });
            sessionStorage.setItem('gradelist_opengroups', JSON.stringify(opengroups));
        });

        // Restore open groups after sort reload.
        var stored = sessionStorage.getItem('gradelist_opengroups');
        if (stored) {
            try {
                var opengroups = JSON.parse(stored);
                opengroups.forEach(function(groupkey) {
                    var group  = $('.mod-gradelist-group[data-groupkey="' + groupkey + '"]');
                    var btn    = group.find('.mod-gradelist-toggle');
                    var target = group.find('.mod-gradelist-group-body');
                    var icon   = btn.find('.mod-gradelist-toggle-icon');
                    target.removeClass('collapse');
                    btn.attr('aria-expanded', 'true');
                    icon.html('&#9660;');
                });
            } catch (e) {
                // Leave all sections collapsed if anything goes wrong.
            }
            sessionStorage.removeItem('gradelist_opengroups');
        }
    };

    return {
        init: init
    };
});
