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
 * Library functions for mod_gradelist.
 *
 * @package    mod_gradelist
 * @copyright  2026 Brian Pool
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Returns the information on whether the module supports a feature.
 *
 * @param string $feature FEATURE_xx constant for requested feature
 * @return mixed True if module supports feature, false if not, null if doesn't know
 */
function gradelist_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_MOD_PURPOSE:
            return MOD_PURPOSE_CONTENT;
        default:
            return null;
    }
}

/**
 * Saves a new instance of mod_gradelist into the database.
 *
 * @param stdClass $data An object from the form in mod_form.php
 * @return int The id of the newly inserted record
 */
function gradelist_add_instance($data) {
    global $DB;

    $data->timecreated  = time();
    $data->timemodified = time();

    return $DB->insert_record('gradelist', $data);
}

/**
 * Updates an instance of mod_gradelist in the database.
 *
 * @param stdClass $data An object from the form in mod_form.php
 * @return bool True on success
 */
function gradelist_update_instance($data) {
    global $DB;

    $data->timemodified = time();
    $data->id           = $data->instance;

    return $DB->update_record('gradelist', $data);
}

/**
 * Removes an instance of mod_gradelist from the database.
 *
 * @param int $id Id of the module instance
 * @return bool True on success
 */
function gradelist_delete_instance($id) {
    global $DB;

    if (!$DB->get_record('gradelist', ['id' => $id])) {
        return false;
    }

    $DB->delete_records('gradelist', ['id' => $id]);

    return true;
}

/**
 * Returns all students across all courses taught by the given teacher,
 * with their final course grade and last course access pulled from Moodle.
 *
 * @param int $teacherid The user id of the teacher
 * @return array Array of grade data objects
 */
function gradelist_get_teacher_grades($teacherid) {
    global $DB;

    // Only the editing teacher role is included.
    $teacherroleid = $DB->get_field('role', 'id', ['shortname' => 'editingteacher']);
    $studentroleid = $DB->get_field('role', 'id', ['shortname' => 'student']);

    // Build list of courses this teacher teaches.
    $taughtcourses = [];

    foreach ([$teacherroleid] as $roleid) {
        if (!$roleid) {
            continue;
        }
        $sql = "SELECT DISTINCT c.id, c.fullname
                  FROM {course} c
                  JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
                  JOIN {role_assignments} ra ON ra.contextid = ctx.id AND ra.roleid = :roleid
                 WHERE ra.userid = :userid
                   AND c.id != :siteid";
        $params = [
            'ctxlevel' => CONTEXT_COURSE,
            'roleid'   => $roleid,
            'userid'   => $teacherid,
            'siteid'   => SITEID,
        ];
        $courses = $DB->get_records_sql($sql, $params);
        foreach ($courses as $course) {
            $taughtcourses[$course->id] = $course->fullname;
        }
    }

    if (empty($taughtcourses)) {
        return [];
    }

    $gradedata = [];

    foreach ($taughtcourses as $courseid => $coursefullname) {

        // Get all students enrolled in this course including their last access.
        $sql = "SELECT DISTINCT u.id, u.firstname, u.lastname, u.username,
                       ul.timeaccess AS lastaccess
                  FROM {user} u
                  JOIN {user_enrolments} ue ON ue.userid = u.id
                  JOIN {enrol} e ON e.id = ue.enrolid AND e.courseid = :courseid
                  JOIN {context} ctx ON ctx.instanceid = e.courseid AND ctx.contextlevel = :ctxlevel
                  JOIN {role_assignments} ra ON ra.contextid = ctx.id AND ra.userid = u.id AND ra.roleid = :roleid
                  LEFT JOIN {user_lastaccess} ul ON ul.userid = u.id AND ul.courseid = :lacourseid
                 WHERE ue.status = 0
                   AND u.deleted = 0
                   AND u.suspended = 0";
        $params = [
            'courseid'   => $courseid,
            'ctxlevel'   => CONTEXT_COURSE,
            'roleid'     => $studentroleid,
            'lacourseid' => $courseid,
        ];
        $students = $DB->get_records_sql($sql, $params);

        if (empty($students)) {
            continue;
        }

        // Get the course total grade item for this course.
        $gradeitem = $DB->get_record('grade_items', [
            'courseid'  => $courseid,
            'itemtype'  => 'course',
        ]);

        if (!$gradeitem) {
            foreach ($students as $student) {
                $gradedata[] = (object)[
                    'fullname'    => fullname($student),
                    'firstname'   => $student->firstname,
                    'lastname'    => $student->lastname,
                    'username'    => $student->username,
                    'lettergrade' => null,
                    'percentage'  => null,
                    'coursename'  => $coursefullname,
                    'lastaccess'  => $student->lastaccess ?? 0,
                ];
            }
            continue;
        }

        // Load the letter grade scale for this course.
        $lettersql = "SELECT * FROM {grade_letters}
                       WHERE contextid = (
                           SELECT id FROM {context}
                            WHERE contextlevel = :ctxlevel
                              AND instanceid = :courseid
                       )
                       ORDER BY lowerboundary DESC";
        $letterscale = $DB->get_records_sql($lettersql, [
            'ctxlevel' => CONTEXT_COURSE,
            'courseid' => $courseid,
        ]);

        // Fall back to site-level letter scale if course has none.
        if (empty($letterscale)) {
            $sitecontext = context_system::instance();
            $letterscale = $DB->get_records('grade_letters',
                ['contextid' => $sitecontext->id], 'lowerboundary DESC');
        }

        foreach ($students as $student) {
            $gradegrade = $DB->get_record('grade_grades', [
                'itemid' => $gradeitem->id,
                'userid' => $student->id,
            ]);

            $percent     = null;
            $lettergrade = null;

            if ($gradegrade && $gradegrade->finalgrade !== null) {
                $grademax = (float)$gradeitem->grademax;
                $grademin = (float)$gradeitem->grademin;

                if ($grademax > $grademin) {
                    $percent = round(
                        (((float)$gradegrade->finalgrade - $grademin) / ($grademax - $grademin)) * 100,
                        1
                    );
                }

                if ($percent !== null && !empty($letterscale)) {
                    foreach ($letterscale as $letter) {
                        if ($percent >= (float)$letter->lowerboundary) {
                            $lettergrade = $letter->letter;
                            break;
                        }
                    }
                }
            }

            $gradedata[] = (object)[
                'fullname'    => fullname($student),
                'firstname'   => $student->firstname,
                'lastname'    => $student->lastname,
                'username'    => $student->username,
                'lettergrade' => $lettergrade,
                'percentage'  => $percent,
                'coursename'  => $coursefullname,
                'lastaccess'  => $student->lastaccess ?? 0,
            ];
        }
    }

    return $gradedata;
}

/**
 * Returns all courses a student is enrolled in along with their
 * final course grade in each, and their last access to each course.
 *
 * @param int $studentid The user id of the student
 * @return array Array of grade data objects
 */
function gradelist_get_student_grades($studentid) {
    global $DB;

    $studentroleid = $DB->get_field('role', 'id', ['shortname' => 'student']);

    // Get all courses where this user is a student.
    $sql = "SELECT DISTINCT c.id, c.fullname
              FROM {course} c
              JOIN {context} ctx ON ctx.instanceid = c.id AND ctx.contextlevel = :ctxlevel
              JOIN {role_assignments} ra ON ra.contextid = ctx.id AND ra.roleid = :roleid
             WHERE ra.userid = :userid
               AND c.id != :siteid";
    $params = [
        'ctxlevel' => CONTEXT_COURSE,
        'roleid'   => $studentroleid,
        'userid'   => $studentid,
        'siteid'   => SITEID,
    ];
    $courses = $DB->get_records_sql($sql, $params);

    if (empty($courses)) {
        return [];
    }

    $gradedata = [];

    foreach ($courses as $course) {
        // Get last access for this student in this course.
        $lastaccess = $DB->get_field('user_lastaccess', 'timeaccess', [
            'userid'   => $studentid,
            'courseid' => $course->id,
        ]);

        // Get the course total grade item.
        $gradeitem = $DB->get_record('grade_items', [
            'courseid' => $course->id,
            'itemtype' => 'course',
        ]);

        if (!$gradeitem) {
            $gradedata[] = (object)[
                'fullname'    => '',
                'firstname'   => '',
                'lastname'    => '',
                'username'    => '',
                'lettergrade' => null,
                'percentage'  => null,
                'coursename'  => $course->fullname,
                'lastaccess'  => $lastaccess ?? 0,
            ];
            continue;
        }

        // Load the letter grade scale for this course.
        $lettersql = "SELECT * FROM {grade_letters}
                       WHERE contextid = (
                           SELECT id FROM {context}
                            WHERE contextlevel = :ctxlevel
                              AND instanceid = :courseid
                       )
                       ORDER BY lowerboundary DESC";
        $letterscale = $DB->get_records_sql($lettersql, [
            'ctxlevel' => CONTEXT_COURSE,
            'courseid' => $course->id,
        ]);

        if (empty($letterscale)) {
            $sitecontext = context_system::instance();
            $letterscale = $DB->get_records('grade_letters',
                ['contextid' => $sitecontext->id], 'lowerboundary DESC');
        }

        $gradegrade = $DB->get_record('grade_grades', [
            'itemid' => $gradeitem->id,
            'userid' => $studentid,
        ]);

        $percent     = null;
        $lettergrade = null;

        if ($gradegrade && $gradegrade->finalgrade !== null) {
            $grademax = (float)$gradeitem->grademax;
            $grademin = (float)$gradeitem->grademin;

            if ($grademax > $grademin) {
                $percent = round(
                    (((float)$gradegrade->finalgrade - $grademin) / ($grademax - $grademin)) * 100,
                    1
                );
            }

            if ($percent !== null && !empty($letterscale)) {
                foreach ($letterscale as $letter) {
                    if ($percent >= (float)$letter->lowerboundary) {
                        $lettergrade = $letter->letter;
                        break;
                    }
                }
            }
        }

        $gradedata[] = (object)[
            'fullname'    => '',
            'firstname'   => '',
            'lastname'    => '',
            'username'    => '',
            'lettergrade' => $lettergrade,
            'percentage'  => $percent,
            'coursename'  => $course->fullname,
            'lastaccess'  => $lastaccess ?? 0,
        ];
    }

    return $gradedata;
}

/**
 * Groups an array of grade data objects by letter grade bucket.
 * Order: F, D, C, B, A, No Grade.
 *
 * @param array  $gradedata Array of grade objects
 * @param string $sortby    Either 'name' (default) or 'grade'
 * @return array Associative array keyed by grade bucket label
 */
function gradelist_group_by_letter($gradedata, $sortby = 'name') {
    $groups = [
        'F'       => [],
        'D'       => [],
        'C'       => [],
        'B'       => [],
        'A'       => [],
        'nograde' => [],
    ];

    foreach ($gradedata as $row) {
        if ($row->lettergrade === null) {
            $groups['nograde'][] = $row;
            continue;
        }
        $firstchar = strtoupper(substr(trim($row->lettergrade), 0, 1));
        if (array_key_exists($firstchar, $groups)) {
            $groups[$firstchar][] = $row;
        } else {
            $groups['nograde'][] = $row;
        }
    }

    foreach ($groups as $key => $rows) {
        if (empty($rows)) {
            continue;
        }
        if ($sortby === 'grade') {
            usort($rows, function($a, $b) {
                if ($a->percentage === null && $b->percentage === null) {
                    return 0;
                }
                if ($a->percentage === null) {
                    return 1;
                }
                if ($b->percentage === null) {
                    return -1;
                }
                return $a->percentage <=> $b->percentage;
            });
        } else {
            usort($rows, function($a, $b) {
                $alast  = strtolower($a->lastname ?? '');
                $blast  = strtolower($b->lastname ?? '');
                $afirst = strtolower($a->firstname ?? '');
                $bfirst = strtolower($b->firstname ?? '');
                if ($alast !== $blast) {
                    return strcmp($alast, $blast);
                }
                return strcmp($afirst, $bfirst);
            });
        }
        $groups[$key] = $rows;
    }

    return $groups;
}
