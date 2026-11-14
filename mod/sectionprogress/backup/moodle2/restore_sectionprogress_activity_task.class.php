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
 * Restore task for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/sectionprogress/backup/moodle2/restore_sectionprogress_stepslib.php');

/**
 * sectionprogress restore task.
 */
class restore_sectionprogress_activity_task extends restore_activity_task {

    /**
     * No specific settings for this activity.
     */
    protected function define_my_settings() {
    }

    /**
     * Define the restore steps.
     */
    protected function define_my_steps() {
        $this->add_step(new restore_sectionprogress_activity_structure_step(
            'sectionprogress_structure', 'sectionprogress.xml'));
    }

    /**
     * Define the decode contents for this activity.
     *
     * @return array
     */
    public static function define_decode_contents() {
        return [
            new restore_decode_content('sectionprogress', ['intro'], 'sectionprogress'),
        ];
    }

    /**
     * Define the decode rules for this activity.
     *
     * @return array
     */
    public static function define_decode_rules() {
        return [
            new restore_decode_rule('SECTIONPROGRESSVIEWBYID', '/mod/sectionprogress/view.php?id=$1', 'course_module'),
            new restore_decode_rule('SECTIONPROGRESSINDEX',    '/mod/sectionprogress/index.php?id=$1', 'course'),
        ];
    }

    /**
     * Define the restore log rules for this activity.
     *
     * @return array
     */
    public static function define_restore_log_rules() {
        return [
            new restore_log_rule('sectionprogress', 'view', 'view.php?id={course_module}', '{sectionprogress}'),
        ];
    }

    /**
     * Define the restore log rules for the course.
     *
     * @return array
     */
    public static function define_restore_log_rules_for_course() {
        return [
            new restore_log_rule('sectionprogress', 'view all', 'index.php?id={course}', null),
        ];
    }
}
