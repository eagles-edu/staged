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
 * Restore steps for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Defines the structure step that will restore one gradelist activity.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_gradelist_activity_structure_step extends restore_activity_structure_step {

    /**
     * Define the structure of the restore for the gradelist activity.
     *
     * @return array List of restore path elements.
     */
    protected function define_structure() {
        $paths   = [];
        $paths[] = new restore_path_element('gradelist', '/activity/gradelist');
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Process a restored gradelist record.
     *
     * @param array|object $data The data from the backup XML.
     */
    protected function process_gradelist($data) {
        global $DB;

        $data         = (object)$data;
        $data->course = $this->get_courseid();

        $data->timecreated  = $this->apply_date_offset($data->timecreated);
        $data->timemodified = $this->apply_date_offset($data->timemodified);

        $newitemid = $DB->insert_record('gradelist', $data);

        // Link the new instance to the course module.
        $this->apply_activity_instance($newitemid);
    }

    /**
     * Post-execution actions.
     */
    protected function after_execute() {
        $this->add_related_files('mod_gradelist', 'intro', null);
    }
}
