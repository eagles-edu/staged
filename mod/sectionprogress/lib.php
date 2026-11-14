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
 * Library functions for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Add a new sectionprogress instance to a course.
 *
 * @param stdClass $data Form data
 * @param mod_sectionprogress_mod_form|null $mform The form
 * @return int The new instance id
 */
function sectionprogress_add_instance(stdClass $data, $mform = null): int {
    global $DB;

    $data->timecreated  = time();
    $data->timemodified = time();

    return $DB->insert_record('sectionprogress', $data);
}

/**
 * Update an existing sectionprogress instance.
 *
 * @param stdClass $data Form data
 * @param mod_sectionprogress_mod_form|null $mform The form
 * @return bool True on success
 */
function sectionprogress_update_instance(stdClass $data, $mform = null): bool {
    global $DB;

    $data->timemodified = time();
    $data->id           = $data->instance;

    return $DB->update_record('sectionprogress', $data);
}

/**
 * Delete a sectionprogress instance.
 *
 * @param int $id The instance id
 * @return bool True on success
 */
function sectionprogress_delete_instance(int $id): bool {
    global $DB;

    if (!$DB->get_record('sectionprogress', ['id' => $id])) {
        return false;
    }

    $DB->delete_records('sectionprogress', ['id' => $id]);

    return true;
}

/**
 * Returns the features this module supports.
 *
 * @param string $feature FEATURE_xx constant for requested feature
 * @return mixed True if module supports, null if doesn't know
 */
function sectionprogress_supports(string $feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_CONTENT;
        default:
            return null;
    }
}
