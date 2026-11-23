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
 * Callback implementations for Question Checker
 *
 * @package    qbank_questionchecker
 * @copyright  2026 YOUR NAME <your@email.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/questionlib.php');

use core_ai\manager;

/**
 * Checks if the necessary AI capabilities are available and enabled for Question Checker, and throws an exception if not.
 *
 * @throws Exception If the required AI capabilities are not available or not enabled.
 */
function qbank_questionchecker_require_text_generation() {
    $actionclass = \core_ai\aiactions\generate_text::class;

    // In Moodle 5.0, some manager methods are no longer static.
    global $CFG;
    if ($CFG->version >= 2025041400) {
        $manager = \core\di::get(\core_ai\manager::class);
        $aichecks = $manager->is_action_available($actionclass) &&
            $manager->is_action_enabled('qbank_questionchecker', $actionclass);
    } else {
        $aichecks = manager::is_action_available($actionclass) && manager::is_action_enabled('qbank_questionchecker', $actionclass);
    }

    if (!$aichecks) {
        throw new \Exception(get_string('notextgeneration', 'qbank_questionchecker'));
    }
}
