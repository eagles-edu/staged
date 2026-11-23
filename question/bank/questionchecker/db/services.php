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
 * External functions and service declaration for Question Checker
 *
 * Documentation: {@link https://moodledev.io/docs/apis/subsystems/external/description}
 *
 * @package    qbank_questionchecker
 * @category   webservice
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'qbank_questionchecker_check_questions' => [
        'classname'   => 'qbank_questionchecker\external\check_questions',
        'description' => 'Sends questions to AI Provider to check them.',
        'type'        => 'read',
        'ajax'        => true,
        'services' => [MOODLE_OFFICIAL_MOBILE_SERVICE],
    ],
];
