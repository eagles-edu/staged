<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Detailed submission history for a single student in mod_mooproof.
 *
 * Shows each submission grouped by date, each expandable to reveal
 * the submitted paper text, the AI feedback, and the follow-up
 * chat conversation.
 *
 * @package    mod_mooproof
 * @copyright  2026 Brian A. Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');
require_once($CFG->dirroot . '/mod/mooproof/lib.php');

$id     = required_param('id', PARAM_INT);     // Course module ID.
$userid = required_param('userid', PARAM_INT); // Student user ID.

$cm       = get_coursemodule_from_id('mooproof', $id, 0, false, MUST_EXIST);
$course   = $DB->get_record('course', array('id' => $cm->course), '*', MUST_EXIST);
$mooproof = $DB->get_record('mooproof', array('id' => $cm->instance), '*', MUST_EXIST);
$student  = $DB->get_record('user', array('id' => $userid), '*', MUST_EXIST);

require_login($course, true, $cm);

$context = context_module::instance($cm->id);
require_capability('mod/mooproof:viewhistory', $context);

$PAGE->set_url('/mod/mooproof/history_detail.php', array('id' => $cm->id, 'userid' => $userid));
$PAGE->set_title(format_string($mooproof->name) . ': ' . fullname($student));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_context($context);

// Fetch all submissions for this student + mooproof instance, newest first.
$submissions = $DB->get_records(
    'mooproof_submissions',
    array('mooproofid' => $mooproof->id, 'userid' => $userid),
    'timecreated DESC'
);

// Pre-fetch all chat messages for those submissions in one query.
$chatbysub = array();
if (!empty($submissions)) {
    $subids = array_keys($submissions);
    list($insql, $inparams) = $DB->get_in_or_equal($subids, SQL_PARAMS_NAMED);
    $chatrows = $DB->get_records_select(
        'mooproof_chat_messages',
        "submissionid $insql",
        $inparams,
        'timecreated ASC'
    );
    foreach ($chatrows as $row) {
        $chatbysub[$row->submissionid][] = $row;
    }
}

/**
 * Format AI feedback text (mirrors the JavaScript formatFeedback function).
 * Converts markdown-style bold, numbered lists, and line breaks to HTML.
 *
 * @param string $text Raw feedback text from AI
 * @return string HTML formatted feedback
 */
function mooproof_format_feedback($text) {
    // Escape HTML first.
    $escaped = s($text);

    // Handle markdown bold (**text** and __text__).
    $escaped = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $escaped);
    $escaped = preg_replace('/__([^_]+)__/', '<strong>$1</strong>', $escaped);

    // Handle markdown italic (*text*).
    $escaped = preg_replace('/\*([^*\n]+)\*/', '<em>$1</em>', $escaped);

    // Convert double line breaks to paragraph breaks.
    $escaped = preg_replace('/\n\n+/', '</p><p>', $escaped);

    // Convert single line breaks to <br>.
    $escaped = str_replace("\n", '<br>', $escaped);

    // Wrap in paragraph tags.
    $escaped = '<p>' . $escaped . '</p>';

    // Handle numbered lists.
    $escaped = preg_replace('/(\d+)\.\s/', '<br><strong>$1.</strong> ', $escaped);

    // Handle bullet points.
    $escaped = preg_replace('/<br>[-*]\s+/', '<br>• ', $escaped);
    $escaped = preg_replace('/<p>[-*]\s+/', '<p>• ', $escaped);

    return $escaped;
}

echo $OUTPUT->header();

// ---- Intro box ----
if ($mooproof->intro) {
    echo $OUTPUT->box(
        format_module_intro('mooproof', $mooproof, $cm->id),
        'generalbox mod_introbox',
        'mooproofintro'
    );
}

// ---- Navigation tabs ----
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

// ---- Back link + heading ----
$backurl = new moodle_url('/mod/mooproof/history.php', array('id' => $cm->id));
echo html_writer::link($backurl,
    '← ' . get_string('backtolist', 'mooproof'),
    array('class' => 'btn btn-secondary mb-3 mooproof-back-btn')
);

echo html_writer::tag('h2',
    get_string('conversationwith', 'mooproof', fullname($student)),
    array('class' => 'mooproof-history-heading')
);

// ---- Expand All / Collapse All buttons ----
echo html_writer::start_div('mooproof-history-controls mb-3');
echo html_writer::tag('button', get_string('expandall', 'mooproof'),
    array('class' => 'btn btn-primary btn-sm mooproof-expand-all me-2'));
echo html_writer::tag('button', get_string('collapseall', 'mooproof'),
    array('class' => 'btn btn-secondary btn-sm mooproof-collapse-all'));
echo html_writer::end_div();

if (empty($submissions)) {
    echo $OUTPUT->notification(get_string('nosubmissionsyet', 'mooproof'), 'info');
} else {
    // Group submissions by date (user's local date).
    $bydate = array();
    foreach ($submissions as $sub) {
        $datekey = userdate($sub->timecreated, get_string('strftimedate', 'langconfig'));
        $bydate[$datekey][] = $sub;
    }

    foreach ($bydate as $datestr => $subsfordate) {
        $totalmsgs = 0;
        foreach ($subsfordate as $sub) {
            $totalmsgs += isset($chatbysub[$sub->id]) ? count($chatbysub[$sub->id]) : 0;
        }

        // ---- Date group header (clickable accordion) ----
        $groupid = 'mooproof-date-' . md5($datestr);
        echo html_writer::start_div('mooproof-date-group card mb-3');

        echo html_writer::start_div(
            'mooproof-date-header card-header d-flex justify-content-between align-items-center',
            array(
                'data-target' => '#' . $groupid,
                'style'       => 'cursor:pointer;',
            )
        );
        echo html_writer::tag('strong', s($datestr));
        echo html_writer::tag('span',
            '(' . count($subsfordate) . ' ' . get_string('submissionscount', 'mooproof') .
            ($totalmsgs > 0 ? ', ' . $totalmsgs . ' ' . get_string('chatmessagescount', 'mooproof') : '') . ')',
            array('class' => 'text-muted small ms-2')
        );
        echo html_writer::tag('span', '▼', array('class' => 'mooproof-toggle-icon ms-auto'));
        echo html_writer::end_div(); // card-header

        echo html_writer::start_div('mooproof-date-body card-body', array('id' => $groupid));

        foreach ($subsfordate as $sub) {
            $subpanelid = 'mooproof-sub-' . $sub->id;
            $timestr    = userdate($sub->timecreated, get_string('strftimetime', 'langconfig'));

            // ---- Submission panel header ----
            echo html_writer::start_div('mooproof-submission card mb-2');
            echo html_writer::start_div(
                'mooproof-submission-header card-header d-flex justify-content-between align-items-center',
                array(
                    'data-target' => '#' . $subpanelid,
                    'style'       => 'cursor:pointer;',
                )
            );
            echo html_writer::tag('span',
                s($timestr) . ' — ' .
                $sub->wordcount . ' ' . get_string('words', 'mooproof') . ', ' .
                get_string('gradelevelshort', 'mooproof') . ' ' . s($sub->gradelevel)
            );
            echo html_writer::tag('span', '▼', array('class' => 'mooproof-toggle-icon ms-auto'));
            echo html_writer::end_div(); // submission-header

            echo html_writer::start_div('mooproof-submission-body card-body', array('id' => $subpanelid));

            // ---- Submitted paper ----
            echo html_writer::tag('h5', get_string('submittedpaper', 'mooproof'),
                array('class' => 'mooproof-section-title'));
            echo html_writer::div(
                html_writer::tag('pre', s($sub->papertext),
                    array('class' => 'mooproof-paper-text')),
                'mooproof-paper-box'
            );

            // ---- AI Feedback ----
            echo html_writer::tag('h5', get_string('aifeedback', 'mooproof'),
                array('class' => 'mooproof-section-title mt-3'));
            echo html_writer::div(
                mooproof_format_feedback($sub->feedback),
                'mooproof-feedback-box'
            );

            // ---- Chat conversation ----
            $msgs = isset($chatbysub[$sub->id]) ? $chatbysub[$sub->id] : array();
            if (!empty($msgs)) {
                echo html_writer::tag('h5', get_string('chatconversation', 'mooproof'),
                    array('class' => 'mooproof-section-title mt-3'));
                echo html_writer::start_div('mooproof-chat-history');
                foreach ($msgs as $msg) {
                    $isuser  = ($msg->role === 'user');
                    $msgclass = $isuser
                        ? 'mooproof-history-msg mooproof-history-user'
                        : 'mooproof-history-msg mooproof-history-assistant';
                    $label   = $isuser ? fullname($student) : get_string('aitutor', 'mooproof');

                    echo html_writer::start_div($msgclass);
                    echo html_writer::tag('strong', s($label) . ':', array('class' => 'mooproof-msg-label'));
                    echo html_writer::tag('div',
                        format_text($msg->message, FORMAT_MOODLE,
                            array('context' => $context, 'noclean' => false)),
                        array('class' => 'mooproof-msg-body')
                    );
                    echo html_writer::end_div();
                }
                echo html_writer::end_div(); // mooproof-chat-history
            } else {
                echo html_writer::tag('p',
                    get_string('nochatmessages', 'mooproof'),
                    array('class' => 'text-muted mooproof-nochat mt-3')
                );
            }

            echo html_writer::end_div(); // submission-body
            echo html_writer::end_div(); // submission card
        }

        echo html_writer::end_div(); // date-body
        echo html_writer::end_div(); // date-group card
    }
}

// ---- Inline JS for accordion behaviour ----
$js = <<<JS
(function() {
    // Toggle a panel open/closed.
    function togglePanel(targetId) {
        var body = document.getElementById(targetId.replace('#', ''));
        if (!body) { return; }
        var header = body.previousElementSibling;
        var icon   = header ? header.querySelector('.mooproof-toggle-icon') : null;
        var hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        if (icon) { icon.textContent = hidden ? '▲' : '▼'; }
    }

    // Attach click handlers to all collapsible headers.
    document.querySelectorAll('[data-target]').forEach(function(hdr) {
        // Start collapsed.
        var targetId = hdr.getAttribute('data-target').replace('#', '');
        var body = document.getElementById(targetId);
        if (body) { body.style.display = 'none'; }

        hdr.addEventListener('click', function() {
            togglePanel(hdr.getAttribute('data-target'));
        });
    });

    // Expand all button.
    document.querySelectorAll('.mooproof-expand-all').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-target]').forEach(function(hdr) {
                var targetId = hdr.getAttribute('data-target').replace('#', '');
                var body = document.getElementById(targetId);
                var icon = hdr.querySelector('.mooproof-toggle-icon');
                if (body) { body.style.display = ''; }
                if (icon) { icon.textContent = '▲'; }
            });
        });
    });

    // Collapse all button.
    document.querySelectorAll('.mooproof-collapse-all').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-target]').forEach(function(hdr) {
                var targetId = hdr.getAttribute('data-target').replace('#', '');
                var body = document.getElementById(targetId);
                var icon = hdr.querySelector('.mooproof-toggle-icon');
                if (body) { body.style.display = 'none'; }
                if (icon) { icon.textContent = '▼'; }
            });
        });
    });
})();
JS;

$PAGE->requires->js_amd_inline($js);

echo $OUTPUT->footer();
