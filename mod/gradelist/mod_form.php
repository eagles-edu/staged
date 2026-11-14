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
 * The main mod_gradelist configuration form.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/moodleform_mod.php');

/**
 * Module instance settings form.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mod_gradelist_mod_form extends moodleform_mod {

    /**
     * Defines the form fields.
     */
    public function definition() {

        $mform = $this->_form;

        // General section.
        $mform->addElement('header', 'general', get_string('general', 'form'));

        // Activity name field.
        $mform->addElement('text', 'name', get_string('name'), ['size' => '64']);
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', null, 'required', null, 'client');
        $mform->addRule('name', get_string('maximumchars', '', 255), 'maxlength', 255, 'client');
        $mform->setDefault('name', get_string('defaultname', 'gradelist'));

        // Standard intro (description) field.
        $this->standard_intro_elements();
        $mform->setDefault('introformat', FORMAT_HTML);

        // Standard course module elements.
        $this->standard_coursemodule_elements();

        // Standard submit buttons.
        $this->add_action_buttons();
    }

    /**
     * Pre-fill default values for new instances only.
     *
     * @param array $defaultvalues Form default values passed by reference.
     */
    public function data_preprocessing(&$defaultvalues) {
        parent::data_preprocessing($defaultvalues);

        if (empty($defaultvalues['instance'])) {
            $defaultvalues['intro']       = get_string('defaultintro', 'gradelist');
            $defaultvalues['introformat'] = FORMAT_HTML;
        }
    }
}
