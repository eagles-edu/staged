<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Student submission history list for mod_mooproof.
 *
 * Displays a table of all students who have submitted papers, with links
 * to the detailed conversation view (history_detail.php).
 *
 * @package    mod_mooproof
 * @copyright  2026 Brian A. Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');
require_once($CFG->dirroot . '/mod/mooproof/lib.php');

$id = required_param('id', PARAM_INT); // Course module ID.

$cm       = get_coursemodule_from_id('mooproof', $id, 0, false, MUST_EXIST);
$course   = $DB->get_record('course', array('id' => $cm->course), '*', MUST_EXIST);
$mooproof = $DB->get_record('mooproof', array('id' => $cm->instance), '*', MUST_EXIST);

require_login($course, true, $cm);

$context = context_module::instance($cm->id);
require_capability('mod/mooproof:viewhistory', $context);

$PAGE->set_url('/mod/mooproof/history.php', array('id' => $cm->id));
$PAGE->set_title(format_string($mooproof->name) . ': ' . get_string('studentsubmissions', 'mooproof'));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);

// Fetch all students who have submissions for this mooproof instance,
// along with their submission count and most recent submission time.
$sql = "SELECT u.id,
               u.firstname,
               u.lastname,
               u.email,
               COUNT(s.id)    AS submissioncount,
               MAX(s.timecreated) AS lastsubmission
          FROM {mooproof_submissions} s
          JOIN {user} u ON u.id = s.userid
         WHERE s.mooproofid = :mooproofid
      GROUP BY u.id, u.firstname, u.lastname, u.email
      ORDER BY u.lastname ASC, u.firstname ASC";

$students = $DB->get_records_sql($sql, array('mooproofid' => $mooproof->id));

echo $OUTPUT->header();

// ---- Intro box (same as view.php) ----
if ($mooproof->intro) {
    echo $OUTPUT->box(
        format_module_intro('mooproof', $mooproof, $cm->id),
        'generalbox mod_introbox',
        'mooproofintro'
    );
}

// ---- Navigation tabs (MooProof | Student Submissions) ----
$tabs = array(
    new tabobject(
        'mooproof',
        new moodle_url('/mod/mooproof/view.php', array('id' => $cm->id)),
        get_string('pluginname', 'mooproof')
    ),
    new tabobject(
        'history',
        new moodle_url('/mod/mooproof/history.php', array('id' => $cm->id)),
        get_string('studentsubmissions', 'mooproof')
    ),
);
echo $OUTPUT->tabtree($tabs, 'history');

// ---- Heading ----
echo html_writer::tag('h2', get_string('studentsubmissions', 'mooproof'),
    array('class' => 'mooproof-history-heading'));

if (empty($students)) {
    echo $OUTPUT->notification(get_string('nosubmissionsyet', 'mooproof'), 'info');
} else {
    // ---- Table ----
    $table = new html_table();
    $table->head = array(
        get_string('fullname'),
        get_string('email'),
        get_string('submissions', 'mooproof'),
        get_string('lastsubmission', 'mooproof'),
        get_string('actions'),
    );
    $table->attributes['class'] = 'generaltable mooproof-history-table';

    foreach ($students as $student) {
        $detailurl = new moodle_url('/mod/mooproof/history_detail.php', array(
            'id'     => $cm->id,
            'userid' => $student->id,
        ));
        $viewbtn = html_writer::link(
            $detailurl,
            get_string('viewdetails', 'mooproof'),
            array('class' => 'btn btn-primary btn-sm')
        );

        $table->data[] = array(
            fullname($student),
            s($student->email),
            $student->submissioncount,
            userdate($student->lastsubmission),
            $viewbtn,
        );
    }

    echo html_writer::table($table);
}

echo $OUTPUT->footer();
