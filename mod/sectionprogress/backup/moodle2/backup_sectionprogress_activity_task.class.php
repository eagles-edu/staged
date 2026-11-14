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
 * Backup task for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/sectionprogress/backup/moodle2/backup_sectionprogress_stepslib.php');

/**
 * sectionprogress backup task.
 */
class backup_sectionprogress_activity_task extends backup_activity_task {

    /**
     * No specific settings for this activity.
     */
    protected function define_my_settings() {
    }

    /**
     * Define the backup steps.
     */
    protected function define_my_steps() {
        $this->add_step(new backup_sectionprogress_activity_structure_step(
            'sectionprogress_structure', 'sectionprogress.xml'));
    }

    /**
     * Encode content links for transport.
     *
     * @param string $content
     * @return string
     */
    public static function encode_content_links($content) {
        global $CFG;

        $base = preg_quote($CFG->wwwroot, '/');

        // Link to the list of sectionprogresses.
        $search  = '/(' . $base . '\/mod\/sectionprogress\/index\.php\?id\=)([0-9]+)/';
        $content = preg_replace($search, '$@SECTIONPROGRESSINDEX*$2@$', $content);

        // Link to sectionprogress view by module id.
        $search  = '/(' . $base . '\/mod\/sectionprogress\/view\.php\?id\=)([0-9]+)/';
        $content = preg_replace($search, '$@SECTIONPROGRESSVIEWBYID*$2@$', $content);

        return $content;
    }
}
