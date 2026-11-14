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
 * Renderable data class for mod_sectionprogress.
 *
 * @package    mod_sectionprogress
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_sectionprogress\output;

use completion_info;
use context_module;
use moodle_url;
use renderable;
use renderer_base;
use stdClass;
use templatable;

/**
 * Builds the data needed by the Mustache templates.
 */
class main implements renderable, templatable {

    /** @var stdClass Course record */
    private stdClass $course;

    /** @var stdClass Module record (cm) */
    private stdClass $cm;

    /** @var stdClass The sectionprogress instance record */
    private stdClass $instance;

    /** @var int Currently selected group id (0 = all) */
    private int $groupid;

    /**
     * Constructor.
     *
     * @param stdClass $course  Course record
     * @param stdClass $cm      Course module record
     * @param stdClass $instance The module instance record
     * @param int $groupid      Currently selected group (0 = all)
     */
    public function __construct(stdClass $course, stdClass $cm, stdClass $instance, int $groupid = 0) {
        $this->course   = $course;
        $this->cm       = $cm;
        $this->instance = $instance;
        $this->groupid  = $groupid;
    }

    /**
     * Export data for the Mustache template.
     *
     * @param renderer_base $output
     * @return stdClass
     */
    public function export_for_template(renderer_base $output): stdClass {
        global $DB, $USER;

        $context   = context_module::instance($this->cm->id);
        $canviewall = has_capability('mod/sectionprogress:viewall', $context);

        $data = new stdClass();
        $data->canviewall  = $canviewall;
        $data->sectionname = $this->get_section_name();
        $data->cmid        = $this->cm->id;
        $data->courseid    = $this->course->id;

        // Build group selector data for teachers.
        if ($canviewall) {
            $data->groupselector = $this->build_group_selector($output);
            $data->hasgroupselector = !empty($data->groupselector);
        }

        // Get all activities in this section that have completion enabled.
        $activities = $this->get_section_activities_with_completion();
        $data->noactivities = empty($activities);

        if (empty($activities)) {
            return $data;
        }

        // Build column headers (activity names).
        $data->activityheaders = [];
        foreach ($activities as $activity) {
            $actcm = get_fast_modinfo($this->course)->get_cm($activity->id);
            $data->activityheaders[] = [
                'name'  => format_string($actcm->name),
                'title' => format_string($actcm->name),
            ];
        }

        $completion = new completion_info($this->course);

        if ($canviewall) {
            // Teacher view: one row per student.
            $data->isteacher = true;
            $data->rows      = $this->build_teacher_rows($activities, $completion);
            $data->nostudents = empty($data->rows);
        } else {
            // Student view: one row for the current user.
            $data->isstudent = true;
            $data->studentrows = $this->build_student_row($activities, $completion, $USER);
        }

        return $data;
    }

    /**
     * Get the human-readable name of the section this cm lives in.
     *
     * @return string
     */
    private function get_section_name(): string {
        global $DB;

        $modinfo = get_fast_modinfo($this->course);
        $cminfo  = $modinfo->get_cm($this->cm->id);
        $section = $modinfo->get_section_info($cminfo->sectionnum);

        if (!empty($section->name)) {
            return format_string($section->name);
        }

        // Fall back to "Section N".
        return get_string('sectionname', 'format_' . $this->course->format) . ' ' . $cminfo->sectionnum;
    }

    /**
     * Return all course modules in this cm's section that have completion enabled,
     * excluding the sectionprogress activity itself.
     *
     * @return array Array of cm_info objects
     */
    private function get_section_activities_with_completion(): array {
        $modinfo = get_fast_modinfo($this->course);
        $cminfo  = $modinfo->get_cm($this->cm->id);
        $sectionnum = $cminfo->sectionnum;

        $activities = [];
        foreach ($modinfo->get_cms() as $cm) {
            if ($cm->sectionnum !== $sectionnum) {
                continue;
            }
            if ($cm->id === $this->cm->id) {
                continue; // Skip ourselves.
            }
            if (!$cm->completion) {
                continue; // No completion tracking on this activity.
            }
            if (!$cm->uservisible && !has_capability('moodle/course:viewhiddenactivities',
                    context_module::instance($cm->id))) {
                continue;
            }
            $activities[] = $cm;
        }

        return $activities;
    }

    /**
     * Build rows for the teacher grid view.
     *
     * @param array $activities cm_info objects
     * @param completion_info $completion
     * @return array
     */
    private function build_teacher_rows(array $activities, completion_info $completion): array {
        $students = $this->get_enrolled_students();
        $rows = [];

        foreach ($students as $student) {
            $cells = [];
            foreach ($activities as $activity) {
                $data = $completion->get_data($activity, false, $student->id);
                $complete = ($data->completionstate == COMPLETION_COMPLETE ||
                             $data->completionstate == COMPLETION_COMPLETE_PASS);
                $cells[] = [
                    'complete'   => $complete,
                    'incomplete' => !$complete,
                    'icon'       => $complete ? '✔' : '○',
                    'title'      => $complete ?
                        get_string('completedalt', 'sectionprogress') :
                        get_string('incompletedalt', 'sectionprogress'),
                ];
            }

            $profileurl = new moodle_url('/user/view.php', [
                'id'     => $student->id,
                'course' => $this->course->id,
            ]);

            $rows[] = [
                'firstname'  => $student->firstname,
                'lastname'   => $student->lastname,
                'fullname'   => fullname($student),
                'profileurl' => $profileurl->out(false),
                'cells'      => $cells,
            ];
        }

        return $rows;
    }

    /**
     * Build data cells for the student view (their own completions).
     *
     * @param array $activities cm_info objects
     * @param completion_info $completion
     * @param stdClass $user
     * @return array
     */
    private function build_student_row(array $activities, completion_info $completion, stdClass $user): array {
        $cells = [];

        foreach ($activities as $activity) {
            $data = $completion->get_data($activity, false, $user->id);
            $complete = ($data->completionstate == COMPLETION_COMPLETE ||
                         $data->completionstate == COMPLETION_COMPLETE_PASS);

            $acturl = new moodle_url('/mod/' . $activity->modname . '/view.php', ['id' => $activity->id]);

            $cells[] = [
                'name'       => format_string($activity->name),
                'activityurl'=> $acturl->out(false),
                'complete'   => $complete,
                'incomplete' => !$complete,
                'icon'       => $complete ? '✔' : '○',
                'title'      => $complete ?
                    get_string('completedalt', 'sectionprogress') :
                    get_string('incompletedalt', 'sectionprogress'),
            ];
        }

        return $cells;
    }

    /**
     * Get enrolled students, filtered by group if needed.
     *
     * @return array Array of user records
     */
    private function get_enrolled_students(): array {
        $context = \context_course::instance($this->course->id);

        if ($this->groupid > 0) {
            $users = get_users_by_capability($context, 'mod/sectionprogress:view',
                'u.id, u.firstname, u.lastname, u.email', 'u.lastname ASC, u.firstname ASC',
                '', '', $this->groupid);
        } else {
            $users = get_users_by_capability($context, 'mod/sectionprogress:view',
                'u.id, u.firstname, u.lastname, u.email', 'u.lastname ASC, u.firstname ASC');
        }

        // Remove any users who also have viewall (i.e. teachers).
        $modulecontext = context_module::instance($this->cm->id);
        foreach ($users as $key => $user) {
            if (has_capability('mod/sectionprogress:viewall', $modulecontext, $user->id)) {
                unset($users[$key]);
            }
        }

        return $users;
    }

    /**
     * Build the HTML group selector dropdown.
     *
     * Always shown to teachers when the course has groups, regardless of the
     * groupmode setting on the activity instance — because this report always
     * benefits from group filtering.
     *
     * @param renderer_base $output
     * @return string HTML or empty string
     */
    private function build_group_selector(renderer_base $output): string {
        // Get all groups in the course regardless of groupmode on this cm.
        $groups = groups_get_all_groups($this->course->id);
        if (empty($groups)) {
            return '';
        }

        // Build a simple <select> form that submits via GET so it works
        // even when the activity groupmode is set to NOGROUPS.
        $url = new moodle_url('/mod/sectionprogress/view.php', ['id' => $this->cm->id]);

        $options = '<option value="0"' . ($this->groupid == 0 ? ' selected' : '') . '>'
            . get_string('allgroups', 'sectionprogress') . '</option>';
        foreach ($groups as $group) {
            $selected = ($this->groupid == $group->id) ? ' selected' : '';
            $options .= '<option value="' . $group->id . '"' . $selected . '>'
                . format_string($group->name) . '</option>';
        }

        return '<form method="get" action="' . $url->out(false) . '" class="form-inline">'
            . '<input type="hidden" name="id" value="' . $this->cm->id . '">'
            . '<label for="sectionprogress-groupselect" class="mr-2">'
            . get_string('groupselector', 'sectionprogress') . ':</label>'
            . '<select id="sectionprogress-groupselect" name="group" '
            . 'class="custom-select mr-2" onchange="this.form.submit()">'
            . $options
            . '</select>'
            . '<noscript><button type="submit" class="btn btn-secondary">'
            . get_string('go') . '</button></noscript>'
            . '</form>';
    }
}
