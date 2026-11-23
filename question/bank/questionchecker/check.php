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
 * Question Checker
 *
 * @package    qbank_questionchecker
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../../../config.php');
require_once($CFG->dirroot . '/question/bank/questionchecker/lib.php');

$courseid = required_param('courseid', PARAM_INT);

$url = new moodle_url('/question/bank/questionchecker/check.php', ['courseid' => $courseid]);
$PAGE->set_url($url);

require_login($courseid);
core_question\local\bank\helper::require_plugin_enabled('qbank_questionchecker');

$context = context_course::instance($courseid);
$PAGE->set_context($context);

$returnurl = optional_param('returnurl', 0, PARAM_LOCALURL);

if ($returnurl) {
    $returnurl = new moodle_url($returnurl);
}

$questionid = required_param('questionid', PARAM_INT);

// Check that the user has the capability to view questions.
question_require_capability_on($questionid, 'view');

$PAGE->set_pagelayout('standard');
$PAGE->set_title(get_string('checkheader', 'qbank_questionchecker'));
$PAGE->set_heading(get_string('checkheader', 'qbank_questionchecker'));
echo $OUTPUT->header();

$question = question_bank::load_question($questionid);

$supportedtypes = ['multichoice', 'essay'];

if (!in_array($question->qtype->name(), $supportedtypes)) {
    throw new moodle_exception('checknotsupported', 'qbank_questionchecker');
}

echo html_writer::tag('p', get_string('checkintro', 'qbank_questionchecker', $question->qtype->local_name()));

echo html_writer::start_tag('div', ['class' => 'alert alert-info']);

echo html_writer::tag('h6', $question->name);
echo html_writer::tag('p', $question->questiontext);

if ($question->qtype->name() == 'multichoice') {
    echo html_writer::start_tag('ul');
    foreach ($question->answers as $a) {
        $r = $a->fraction > 0 ? '✅' : '❌';
        echo html_writer::tag('li', strip_tags($a->answer) . ' (' . $r . ')');
    }
    echo html_writer::end_tag('ul');
}

echo html_writer::end_tag('div');

$buttonprops = ["class" => "btn btn-primary", "id" => "id_checkbutton"];
echo html_writer::tag('button', get_string('check', 'qbank_questionchecker'), $buttonprops);
echo html_writer::tag('div', '', ["class" => "mt-3 alert", "id" => "id_checkresult"]);

echo html_writer::tag('a', get_string('return', 'qbank_questionchecker'), ["href" => $returnurl, "class" => "d-block mt-4"]);

// Add Javascript module.
global $PAGE;
$PAGE->requires->js_call_amd('qbank_questionchecker/check', 'init', [$questionid, $context->id]);

echo $OUTPUT->footer();
