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
 * View a Grade List activity instance.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');
require_once('lib.php');
require_once($CFG->libdir . '/gradelib.php');

$id     = required_param('id', PARAM_INT);
$sortby = optional_param('sortby', 'name', PARAM_ALPHA);

$cm        = get_coursemodule_from_id('gradelist', $id, 0, false, MUST_EXIST);
$course    = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$gradelist = $DB->get_record('gradelist', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);

$context = context_module::instance($cm->id);
require_capability('mod/gradelist:view', $context);

// Determine if the current user is a teacher or student.
$isteacher = has_capability('mod/gradelist:addinstance', context_course::instance($course->id));

// Log the view event.
$event = \mod_gradelist\event\course_module_viewed::create([
    'objectid' => $gradelist->id,
    'context'  => $context,
]);
$event->add_record_snapshot('course', $course);
$event->add_record_snapshot('gradelist', $gradelist);
$event->trigger();

$PAGE->set_url('/mod/gradelist/view.php', ['id' => $cm->id, 'sortby' => $sortby]);
$PAGE->set_title(format_string($gradelist->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_pagelayout('incourse');

$PAGE->requires->js_call_amd('mod_gradelist/gradelist', 'init');

echo $OUTPUT->header();
echo $OUTPUT->heading(format_string($gradelist->name));

if (!empty($gradelist->intro)) {
    echo $OUTPUT->box(
        format_module_intro('gradelist', $gradelist, $cm->id),
        'generalbox mod_introbox'
    );
}

// Fetch grade data based on whether the viewer is a teacher or student.
if ($isteacher) {
    $gradedata = gradelist_get_teacher_grades($USER->id);
} else {
    $gradedata = gradelist_get_student_grades($USER->id);
    $sortby    = optional_param('sortby', 'grade', PARAM_ALPHA);
}

$grouped = gradelist_group_by_letter($gradedata, $sortby);

if (empty($gradedata)) {
    echo $OUTPUT->notification(get_string('nogradedstudents', 'gradelist'), 'notifyinfo');
    echo $OUTPUT->footer();
    exit;
}

// Sort URLs.
$sortbynameurl  = new moodle_url('/mod/gradelist/view.php', ['id' => $cm->id, 'sortby' => 'name']);
$sortbygradeurl = new moodle_url('/mod/gradelist/view.php', ['id' => $cm->id, 'sortby' => 'grade']);

// Grade group display labels.
$grouplabels = [
    'F'       => get_string('gradegroup_f', 'gradelist'),
    'D'       => get_string('gradegroup_d', 'gradelist'),
    'C'       => get_string('gradegroup_c', 'gradelist'),
    'B'       => get_string('gradegroup_b', 'gradelist'),
    'A'       => get_string('gradegroup_a', 'gradelist'),
    'nograde' => get_string('gradegroup_nograde', 'gradelist'),
];

// Build the template context.
$templatecontext = [
    'isteacher'      => $isteacher,
    'isstudent'      => !$isteacher,
    'sortbyname'     => $sortby === 'name',
    'sortbygrade'    => $sortby === 'grade',
    'sortbynameurl'  => $sortbynameurl->out(false),
    'sortbygradeurl' => $sortbygradeurl->out(false),
    'groups'         => [],
];

foreach ($grouplabels as $key => $label) {
    if (empty($grouped[$key])) {
        continue;
    }

    $rows = [];
    foreach ($grouped[$key] as $row) {
        if (!empty($row->lastaccess)) {
            $lastaccess = userdate($row->lastaccess, get_string('strftimedatetimeshort', 'langconfig'));
        } else {
            $lastaccess = get_string('never', 'gradelist');
        }

        $rowdata = [
            'lettergrade' => $row->lettergrade ?? get_string('nograde', 'gradelist'),
            'percentage'  => $row->percentage !== null ? $row->percentage . '%' : '—',
            'coursename'  => $row->coursename,
            'lastaccess'  => $lastaccess,
        ];

        if ($isteacher) {
            $rowdata['fullname'] = $row->fullname;
            $rowdata['username'] = $row->username;
        }

        $rows[] = $rowdata;
    }

    $templatecontext['groups'][] = [
        'groupkey'   => $key,
        'grouplabel' => $label,
        'count'      => count($rows),
        'rows'       => $rows,
    ];
}

echo $OUTPUT->render_from_template('mod_gradelist/gradelist', $templatecontext);

echo $OUTPUT->footer();
