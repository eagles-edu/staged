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
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle. If not, see <http://www.gnu.org/licenses/>.

/**
 * Activity monitoring notifications.
 *
 * @package    block_mwa_dashboard
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace block_mwa_dashboard;

defined('MOODLE_INTERNAL') || die();

/** Sends Moodle notifications for events in teacher-monitored activities. */
class activity_monitor {
    /** @var array Request-level protection against two Moodle events for one action. */
    private static array $delivered = [];

    /**
     * Observe a supported submission or post event.
     *
     * @param \core\event\base $event Moodle event.
     */
    public static function observe(\core\event\base $event): void {
        global $DB, $CFG;

        $data = $event->get_data();
        $courseid = (int)($data['courseid'] ?? 0);
        $cmid = (int)($data['contextinstanceid'] ?? 0);
        $studentid = (int)($data['userid'] ?? 0);
        if ($courseid <= 1 || $cmid <= 0 || $studentid <= 0) {
            return;
        }

        $watchers = $DB->get_records('block_mwa_dashboard_watch', [
            'courseid' => $courseid,
            'cmid' => $cmid,
            'enabled' => 1,
        ]);
        if (!$watchers) {
            return;
        }

        try {
            $course = get_course($courseid);
            $modinfo = get_fast_modinfo($course);
            $cm = $modinfo->get_cm($cmid);
            $student = \core_user::get_user($studentid, '*', MUST_EXIST);
        } catch (\Throwable $exception) {
            debugging('MWA activity monitor: ' . $exception->getMessage(), DEBUG_DEVELOPER);
            return;
        }

        $eventclass = ltrim(get_class($event), '\\');
        $actionkey = 'activitywatch_action_submission';
        if (in_array($eventclass, [
            'mod_forum\\event\\post_created',
            'mod_forum\\event\\discussion_created',
        ], true)) {
            $actionkey = 'activitywatch_action_forumpost';
        } else if ($eventclass === 'mod_quiz\\event\\attempt_submitted') {
            $actionkey = 'activitywatch_action_quizattempt';
        }

        require_once($CFG->dirroot . '/message/lib.php');
        $url = new \moodle_url('/mod/' . $cm->modname . '/view.php', ['id' => $cmid]);
        $name = fullname($student);
        $action = get_string($actionkey, 'block_mwa_dashboard');
        $details = (object)[
            'student' => $name,
            'action' => $action,
            'activity' => format_string($cm->name, true, ['context' => $cm->context]),
            'course' => format_string($course->fullname, true, ['context' => \context_course::instance($courseid)]),
            'time' => userdate((int)($data['timecreated'] ?? time())),
        ];

        foreach ($watchers as $watch) {
            if ((int)$watch->userid === $studentid) {
                continue;
            }
            $recipient = \core_user::get_user((int)$watch->userid);
            if (!$recipient || !empty($recipient->deleted) || !empty($recipient->suspended)) {
                continue;
            }
            $deliverykey = (int)$watch->userid . ':' . $cmid . ':' . $studentid . ':' . $actionkey;
            if (isset(self::$delivered[$deliverykey])) {
                continue;
            }
            self::$delivered[$deliverykey] = true;
            $message = new \core\message\message();
            $message->component = 'block_mwa_dashboard';
            $message->name = 'activitywatch';
            $message->userfrom = \core_user::get_noreply_user();
            $message->userto = $recipient;
            $message->subject = get_string('activitywatch_subject', 'block_mwa_dashboard', $details);
            $message->fullmessage = str_replace('\\n', "\n",
                get_string('activitywatch_body', 'block_mwa_dashboard', $details));
            $message->fullmessageformat = FORMAT_PLAIN;
            $message->fullmessagehtml = nl2br(s($message->fullmessage));
            $message->smallmessage = get_string('activitywatch_small', 'block_mwa_dashboard', $details);
            $message->notification = 1;
            $message->contexturl = $url->out(false);
            $message->contexturlname = get_string('activitywatch_open', 'block_mwa_dashboard');
            try {
                $messageid = message_send($message);
                if (!$messageid) {
                    debugging('MWA activity monitor: Moodle did not accept the notification for user ' .
                        (int)$recipient->id, DEBUG_DEVELOPER);
                }
            } catch (\Throwable $exception) {
                debugging('MWA activity monitor notification: ' . $exception->getMessage(), DEBUG_DEVELOPER);
            }

            // Monitoring is an explicit per-activity opt-in by this teacher,
            // so send the email directly instead of relying on a processor
            // preference that may be disabled at site or user level.
            if (empty($recipient->emailstop) && validate_email((string)$recipient->email)) {
                $emailhtml = \html_writer::tag('p', s(get_string('activitywatch_small',
                    'block_mwa_dashboard', $details)));
                $emailhtml .= \html_writer::tag('p', \html_writer::link($url,
                    get_string('activitywatch_open', 'block_mwa_dashboard')));
                try {
                    $emailsent = email_to_user(
                        $recipient,
                        \core_user::get_noreply_user(),
                        $message->subject,
                        $message->fullmessage . "\n\n" . $url->out(false),
                        $emailhtml
                    );
                    if (!$emailsent) {
                        debugging('MWA activity monitor: Moodle could not send email to user ' .
                            (int)$recipient->id, DEBUG_DEVELOPER);
                    }
                } catch (\Throwable $exception) {
                    debugging('MWA activity monitor email: ' . $exception->getMessage(), DEBUG_DEVELOPER);
                }
            }
        }
    }
}
