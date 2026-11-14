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
 * View page for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');
require_once($CFG->libdir . '/completionlib.php');

$id      = required_param('id', PARAM_INT);         // Course module id.
$groupid = optional_param('group', 0, PARAM_INT);   // Group filter (teachers).

// Fetch the course module and related records.
$cm       = get_coursemodule_from_id('sectionprogress', $id, 0, false, MUST_EXIST);
$course   = $DB->get_record('course', ['id' => $cm->course], '*', MUST_EXIST);
$instance = $DB->get_record('sectionprogress', ['id' => $cm->instance], '*', MUST_EXIST);

require_login($course, true, $cm);

$context = context_module::instance($cm->id);
require_capability('mod/sectionprogress:view', $context);

// Log the view event.
$event = \mod_sectionprogress\event\course_module_viewed::create([
    'objectid' => $instance->id,
    'context'  => $context,
]);
$event->add_record_snapshot('course', $course);
$event->add_record_snapshot('sectionprogress', $instance);
$event->trigger();

// Mark activity as viewed for completion purposes.
$completion = new completion_info($course);
$completion->set_module_viewed($cm);

// Check completion is actually enabled on the course.
if (!$completion->is_enabled()) {
    notice(get_string('notavailable', 'sectionprogress'),
        new moodle_url('/course/view.php', ['id' => $course->id]));
}

// Resolve active group (teachers only).
$canviewall = has_capability('mod/sectionprogress:viewall', $context);
if (!$canviewall) {
    $groupid = 0; // Students always see their own data; group param is irrelevant.
} else {
    // Validate the group id belongs to this course.
    if ($groupid > 0) {
        $groupcheck = groups_get_group($groupid);
        if (!$groupcheck || $groupcheck->courseid != $course->id) {
            $groupid = 0;
        }
    }
}

// Page setup.
$PAGE->set_url('/mod/sectionprogress/view.php', ['id' => $cm->id]);
$PAGE->set_title(format_string($instance->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_activity_record($instance);

// Render.
echo $OUTPUT->header();
echo $OUTPUT->heading(format_string($instance->name));

// Show intro if present.
if (!empty($instance->intro)) {
    echo $OUTPUT->box(format_module_intro('sectionprogress', $instance, $cm->id), 'generalbox mod_introbox');
}

$renderable = new \mod_sectionprogress\output\main($course, $cm, $instance, $groupid);
$renderer   = $PAGE->get_renderer('mod_sectionprogress');
echo $renderer->render_main($renderable);

echo $OUTPUT->footer();
