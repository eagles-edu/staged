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
 * List of all Grade List instances in a course.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');
require_once('lib.php');

$id = required_param('id', PARAM_INT);

$course = $DB->get_record('course', ['id' => $id], '*', MUST_EXIST);

require_course_login($course);

$PAGE->set_url('/mod/gradelist/index.php', ['id' => $id]);
$PAGE->set_title(format_string($course->fullname));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_pagelayout('incourse');

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('modulenameplural', 'gradelist'));

$gradelists = $DB->get_records('gradelist', ['course' => $id], 'name ASC');

if (empty($gradelists)) {
    notice(get_string('nogradedstudents', 'gradelist'), new moodle_url('/course/view.php', ['id' => $id]));
}

$table = new html_table();
$table->head = [
    get_string('name'),
    get_string('description'),
];
$table->attributes['class'] = 'generaltable';

foreach ($gradelists as $gradelist) {
    $cm = get_coursemodule_from_instance('gradelist', $gradelist->id, $course->id, false, MUST_EXIST);
    $link = html_writer::link(
        new moodle_url('/mod/gradelist/view.php', ['id' => $cm->id]),
        format_string($gradelist->name)
    );
    $intro = format_module_intro('gradelist', $gradelist, $cm->id);
    $table->data[] = [$link, $intro];
}

echo html_writer::table($table);
echo $OUTPUT->footer();
