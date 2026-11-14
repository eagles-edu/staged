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
 * Backup task for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/gradelist/backup/moodle2/backup_gradelist_stepslib.php');

/**
 * Backup task for the gradelist activity module.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_gradelist_activity_task extends backup_activity_task {

    /**
     * Define particular settings this activity can have.
     */
    protected function define_my_settings() {
        // No particular settings for this activity.
    }

    /**
     * Define the backup steps for this activity.
     */
    protected function define_my_steps() {
        $this->add_step(new backup_gradelist_activity_structure_step(
            'gradelist_structure',
            'gradelist.xml'
        ));
    }

    /**
     * Encode content links for transport.
     *
     * @param string $content The content to encode.
     * @return string The encoded content.
     */
    public static function encode_content_links($content) {
        global $CFG;

        $base = preg_quote($CFG->wwwroot, '/');

        $search  = '/(' . $base . '\/mod\/gradelist\/index\.php\?id\=)([0-9]+)/';
        $content = preg_replace($search, '$@GRADELISTINDEX*$2@$', $content);

        $search  = '/(' . $base . '\/mod\/gradelist\/view\.php\?id\=)([0-9]+)/';
        $content = preg_replace($search, '$@GRADELISTVIEWBYID*$2@$', $content);

        return $content;
    }
}
