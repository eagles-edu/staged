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
 * Backup steps for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Defines the structure step that will back up one gradelist activity.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_gradelist_activity_structure_step extends backup_activity_structure_step {

    /**
     * Define the structure of the backup for the gradelist activity.
     *
     * @return backup_nested_element The root element of the backup structure.
     */
    protected function define_structure() {

        $gradelist = new backup_nested_element('gradelist', ['id'], [
            'course',
            'name',
            'intro',
            'introformat',
            'timecreated',
            'timemodified',
        ]);

        $gradelist->set_source_table('gradelist', ['id' => backup::VAR_ACTIVITYID]);

        return $this->prepare_activity_structure($gradelist);
    }
}
