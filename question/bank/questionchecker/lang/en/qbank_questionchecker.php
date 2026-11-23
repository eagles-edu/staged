<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Plugin strings are defined here.
 *
 * @package     qbank_questionchecker
 * @category    string
 * @copyright   2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$string['check'] = 'Check';
$string['checkagree'] = '✅ AI agrees with your solution!';
$string['checkdisagreement'] = '❌ AI disagrees with your solution, here\'s why:';
$string['checkheader'] = 'Question Checker';
$string['checkinitialchoice'] = 'AI answered the following:';
$string['checkintro'] = 'You are about to have the following {$a} question answered by AI:';
$string['checknotsupported'] = 'Only multiple choice and essay type questions are currently supported.';
$string['checkparsingerror'] = 'Error while parsing the evaluated question.';
$string['checkreturn'] = 'AI returned the following answer:';

$string['notextgeneration'] = 'Text generation action is not available or not enabled for Question Checker.';

$string['pluginname'] = 'Question Checker';

$string['privacy:metadata:ai_provider'] = 'Data sent to external AI providers';
$string['privacy:metadata:ai_provider:question'] = 'The question which AI should check.';

$string['return'] = 'Return to question bank';
