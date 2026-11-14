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
 * Restore steps for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Define the complete sectionprogress structure for restore.
 */
class restore_sectionprogress_activity_structure_step extends restore_activity_structure_step {

    /**
     * Define the structure elements to be restored.
     *
     * @return array
     */
    protected function define_structure() {
        $paths = [];
        $paths[] = new restore_path_element('sectionprogress', '/activity/sectionprogress');
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Process the sectionprogress element.
     *
     * @param array $data
     */
    protected function process_sectionprogress($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $data->course = $this->get_courseid();

        // Insert the record.
        $newid = $DB->insert_record('sectionprogress', $data);

        // Map old id to new id — this is what updates course_modules.instance.
        $this->apply_activity_instance($newid);
    }

    /**
     * After all data has been restored.
     */
    protected function after_execute() {
        $this->add_related_files('mod_sectionprogress', 'intro', null);
    }
}
