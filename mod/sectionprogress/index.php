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
 * List all sectionprogress instances in a course.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');

$id = required_param('id', PARAM_INT); // Course id.

$course = $DB->get_record('course', ['id' => $id], '*', MUST_EXIST);

require_course_login($course);

$PAGE->set_url('/mod/sectionprogress/index.php', ['id' => $id]);
$PAGE->set_title(format_string($course->fullname));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_pagelayout('incourse');

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('modulenameplural', 'sectionprogress'));

$instances = get_all_instances_in_course('sectionprogress', $course);

if (empty($instances)) {
    notice(get_string('thereareno', 'moodle', get_string('modulenameplural', 'sectionprogress')),
        new moodle_url('/course/view.php', ['id' => $course->id]));
}

$table = new html_table();
$table->head  = [get_string('name'), get_string('sectionheading', 'sectionprogress', '')];
$table->align = ['left', 'left'];

foreach ($instances as $instance) {
    $link = html_writer::link(
        new moodle_url('/mod/sectionprogress/view.php', ['id' => $instance->coursemodule]),
        format_string($instance->name, true)
    );
    $table->data[] = [$link, $instance->section];
}

echo html_writer::table($table);
echo $OUTPUT->footer();
