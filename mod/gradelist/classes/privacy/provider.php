<?php
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
 * Privacy provider for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_gradelist\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\approved_userlist;

/**
 * Privacy provider for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    \core_privacy\local\request\core_userlist_provider {

    /**
     * Returns metadata about what data this plugin stores.
     *
     * @param collection $collection The metadata collection to add to.
     * @return collection The updated collection.
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_plugintype_link(
            'core_grades',
            [],
            'privacy:metadata:core_grades'
        );
        return $collection;
    }

    /**
     * Get the list of contexts that contain user information for the given user.
     *
     * @param int $userid The user id.
     * @return contextlist The list of contexts.
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        $contextlist = new contextlist();
        $sql = "SELECT ctx.id
                  FROM {context} ctx
                  JOIN {course_modules} cm ON cm.id = ctx.instanceid AND ctx.contextlevel = :contextlevel
                  JOIN {modules} m ON m.id = cm.module AND m.name = :modname
                  JOIN {gradelist} gl ON gl.id = cm.instance
                 WHERE gl.course IN (
                     SELECT DISTINCT e.courseid
                       FROM {enrol} e
                       JOIN {user_enrolments} ue ON ue.enrolid = e.id
                      WHERE ue.userid = :userid
                 )";
        $params = [
            'contextlevel' => CONTEXT_MODULE,
            'modname'      => 'gradelist',
            'userid'       => $userid,
        ];
        $contextlist->add_from_sql($sql, $params);
        return $contextlist;
    }

    /**
     * Get the list of users who have data within a given context.
     *
     * @param userlist $userlist The userlist to add users to.
     */
    public static function get_users_in_context(userlist $userlist) {
        $context = $userlist->get_context();
        if (!$context instanceof \context_module) {
            return;
        }
        $sql = "SELECT ue.userid
                  FROM {course_modules} cm
                  JOIN {modules} m ON m.id = cm.module AND m.name = :modname
                  JOIN {gradelist} gl ON gl.id = cm.instance
                  JOIN {enrol} e ON e.courseid = gl.course
                  JOIN {user_enrolments} ue ON ue.enrolid = e.id
                 WHERE cm.id = :cmid";
        $params = [
            'modname' => 'gradelist',
            'cmid'    => $context->instanceid,
        ];
        $userlist->add_from_sql('userid', $sql, $params);
    }

    /**
     * Export personal data for the given approved contexts.
     *
     * @param approved_contextlist $contextlist The approved contexts to export for.
     */
    public static function export_user_data(approved_contextlist $contextlist) {
        // No personal data stored — nothing to export.
    }

    /**
     * Delete all personal data for all users in the given context.
     *
     * @param \context $context The context to delete data for.
     */
    public static function delete_data_for_all_users_in_context(\context $context) {
        // No personal data stored — nothing to delete.
    }

    /**
     * Delete personal data for the given approved contextlist.
     *
     * @param approved_contextlist $contextlist The approved contexts and user.
     */
    public static function delete_data_for_user(approved_contextlist $contextlist) {
        // No personal data stored — nothing to delete.
    }

    /**
     * Delete multiple users within a single context.
     *
     * @param approved_userlist $userlist The approved userlist to delete for.
     */
    public static function delete_data_for_users(approved_userlist $userlist) {
        // No personal data stored — nothing to delete.
    }
}
