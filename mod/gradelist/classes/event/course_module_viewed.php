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
 * Event fired when a Grade List activity is viewed.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_gradelist\event;

/**
 * Event class for when a user views a Grade List activity instance.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class course_module_viewed extends \core\event\course_module_viewed {

    /**
     * Initialise the event data.
     */
    protected function init() {
        $this->data['objecttable'] = 'gradelist';
        parent::init();
    }

    /**
     * Returns the name of the event.
     *
     * @return string
     */
    public static function get_name() {
        return get_string('modulename', 'gradelist') . ' viewed';
    }

    /**
     * Returns a description of the event.
     *
     * @return string
     */
    public function get_description() {
        return "The user with id '{$this->userid}' viewed the Grade List activity " .
               "with course module id '{$this->contextinstanceid}'.";
    }

    /**
     * Returns the URL associated with this event.
     *
     * @return \moodle_url
     */
    public function get_url() {
        return new \moodle_url('/mod/gradelist/view.php', ['id' => $this->contextinstanceid]);
    }
}
