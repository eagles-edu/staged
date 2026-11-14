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
 * Backup steps for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Define the complete sectionprogress structure for backup.
 */
class backup_sectionprogress_activity_structure_step extends backup_activity_structure_step {

    /**
     * Define the structure of the backup.
     *
     * @return backup_nested_element
     */
    protected function define_structure() {

        // Define each element separately.
        $sectionprogress = new backup_nested_element('sectionprogress', ['id'], [
            'name',
            'intro',
            'introformat',
            'timecreated',
            'timemodified',
        ]);

        // Define data sources.
        $sectionprogress->set_source_table('sectionprogress', ['id' => backup::VAR_ACTIVITYID]);

        // Return the root element wrapped in standard activity structure.
        return $this->prepare_activity_structure($sectionprogress);
    }
}
