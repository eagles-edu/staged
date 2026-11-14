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
 * Library functions for local_haccgen.
 *
 * @package local_haccgen
 * @copyright 2026 Dynamicpixel Multimedia Solutions
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/course/lib.php');

/**
 * Plugin component name.
 *
 * @package local_haccgen
 */
const LOCAL_HACCGEN_COMPONENT = 'local_haccgen';

/**
 * File area for uploaded files.
 *
 * @package local_haccgen
 */
const LOCAL_HACCGEN_FILEAREA = 'uploads';

/**
 * Extends the course settings navigation to include an AI course management link.
 *
 * @param navigation_node $settingsnav The navigation node to extend
 * @param context $context The context of the course
 * @package local_haccgen
 */
function local_haccgen_extend_settings_navigation($settingsnav, $context) {
    global $PAGE;

    if (
        $context->contextlevel === CONTEXT_COURSE &&
        has_capability('local/haccgen:manage', $context) &&
        !empty($PAGE->course->id)
    ) {

        $courseid = $PAGE->course->id;
        $url = new moodle_url('/local/haccgen/manage.php', ['id' => $courseid]);
        $title = get_string('manageai', 'local_haccgen');

        $coursenode = $settingsnav->find(
            'courseadmin',
            navigation_node::TYPE_COURSE,
        );

        if ($coursenode) {
            $coursenode->add(
                $title,
                $url,
                navigation_node::TYPE_SETTING,
                null,
                'haccgen_manage',
            );
            $timestampsurl = new moodle_url('/local/haccgen/timestamps.php', ['id' => $courseid]);
            $coursenode->add(
                get_string('generation_timestamps', 'local_haccgen'),
                $timestampsurl,
                navigation_node::TYPE_SETTING,
                null,
                'haccgen_timestamps',
            );
        } else {
            $settingsnav->add(
                $title,
                $url,
                navigation_node::TYPE_SETTING,
                null,
                'haccgen_manage',
            );
            $timestampsurl = new moodle_url('/local/haccgen/timestamps.php', ['id' => $courseid]);
            $settingsnav->add(
                get_string('generation_timestamps', 'local_haccgen'),
                $timestampsurl,
                navigation_node::TYPE_SETTING,
                null,
                'haccgen_timestamps',
            );
        }
    }
}

/**
 * Build a signed pluginfile URL for public access without login.
 *
 * @param stored_file $file
 * @param int|null $ttl
 * @param bool $forcedownload
 * @return string
 * @throws moodle_exception
 * @package local_haccgen
 */
function local_haccgen_build_signed_url(
    stored_file $file,
    ?int $ttl = null,
    bool $forcedownload = false
): string {
    $secret = (string)get_config(LOCAL_HACCGEN_COMPONENT, 'linksecret');
    if ($secret === '') {
        throw new moodle_exception(
            'linksecret_not_set',
            LOCAL_HACCGEN_COMPONENT,
        );
    }

    if ($ttl === null) {
        $ttl = (int)get_config(LOCAL_HACCGEN_COMPONENT, 'publiclinkttl');
    }
    if ($ttl <= 0) {
        $ttl = 3600;
    }

    $expires = time() + $ttl;

    $payload = implode('|', [
        $file->get_contextid(),
        LOCAL_HACCGEN_COMPONENT,
        LOCAL_HACCGEN_FILEAREA,
        $file->get_itemid(),
        $file->get_filepath(),
        $file->get_filename(),
        $expires,
    ]);

    $token = hash_hmac('sha256', $payload, $secret);

    $url = moodle_url::make_pluginfile_url(
        $file->get_contextid(),
        LOCAL_HACCGEN_COMPONENT,
        LOCAL_HACCGEN_FILEAREA,
        $file->get_itemid(),
        $file->get_filepath(),
        $file->get_filename(),
        $forcedownload,
    );

    $url->param('expires', $expires);
    $url->param('token', $token);

    return $url->out(false);
}

/**
 * Serve files for local_haccgen.
 *
 * @param stdClass $course
 * @param stdClass|null $cm
 * @param context $context
 * @param string $filearea
 * @param array $args
 * @param bool $forcedownload
 * @param array $options
 * @return bool
 * @package local_haccgen
 */
function local_haccgen_pluginfile(
    $course,
    $cm,
    $context,
    $filearea,
    $args,
    $forcedownload,
    array $options = []
) {
    if ($filearea !== LOCAL_HACCGEN_FILEAREA) {
        return false;
    }

    if (!in_array(
        $context->contextlevel,
        [CONTEXT_SYSTEM, CONTEXT_COURSE, CONTEXT_MODULE],
        true,
    )) {
        return false;
    }

    $itemid = (int)array_shift($args);
    $filename = array_pop($args);

    $filepath = '/';
    if (!empty($args)) {
        $filepath = '/' . implode('/', $args) . '/';
    }

    $fs = get_file_storage();
    $file = $fs->get_file(
        $context->id,
        LOCAL_HACCGEN_COMPONENT,
        LOCAL_HACCGEN_FILEAREA,
        $itemid,
        $filepath,
        $filename,
    );

    if (!$file || $file->is_directory()) {
        send_file_not_found();
    }

    $token = optional_param('token', '', PARAM_ALPHANUM);
    $expires = optional_param('expires', 0, PARAM_INT);
    $secret = (string)get_config(LOCAL_HACCGEN_COMPONENT, 'linksecret');

    $tokengood = false;

    if ($secret !== '' && $token && $expires && time() < $expires) {
        $payload = implode('|', [
            $context->id,
            LOCAL_HACCGEN_COMPONENT,
            LOCAL_HACCGEN_FILEAREA,
            $itemid,
            $filepath,
            $filename,
            $expires,
        ]);

        $expected = hash_hmac('sha256', $payload, $secret);

        if (hash_equals($expected, $token)) {
            $tokengood = true;
        }
    }

    if ($tokengood) {
        $lifetime = max(0, $expires - time());
        $options['cacheability'] = 'public';
        send_stored_file($file, $lifetime, 0, $forcedownload, $options);
    }

    if ($context->contextlevel === CONTEXT_COURSE) {
        require_course_login($course);
    } else {
        require_login();
    }

    send_stored_file($file, 0, 0, $forcedownload, $options);
}
/**
 * Get session cache instance for local_haccgen.
 *
 * @return cache
 */
function local_haccgen_session_cache(): cache {
    return cache::make('local_haccgen', 'sessiondata');
}

/**
 * Build a cache key unique to this user + course.
 *
 * @param int $courseid
 * @return string
 */
function local_haccgen_cachekey(int $courseid): string {
    global $USER;
    return $USER->id . ':' . $courseid;
}

/**
 * Load session-like data.
 *
 * @param int $courseid
 * @return stdClass
 */
function local_haccgen_get_state(int $courseid): stdClass {
    $cache = local_haccgen_session_cache();
    $key = local_haccgen_cachekey($courseid);
    $data = $cache->get($key);

    if (!$data || !is_object($data)) {
        $data = new stdClass();
    }
    return $data;
}

/**
 * Save session-like data.
 *
 * @param int $courseid
 * @param stdClass $data
 * @return void
 */
function local_haccgen_set_state(int $courseid, stdClass $data): void {
    $cache = local_haccgen_session_cache();
    $key = local_haccgen_cachekey($courseid);
    $cache->set($key, $data);
}

/**
 * Clear session-like data.
 *
 * @param int $courseid
 * @return void
 */
function local_haccgen_clear_state(int $courseid): void {
    $cache = local_haccgen_session_cache();
    $key = local_haccgen_cachekey($courseid);
    $cache->delete($key);
}

/**
 * Record generation timestamps for a draft or created course.
 *
 * @param int $courseid Course ID.
 * @param int $userid User ID.
 * @param string $recordtype 'draft' or 'created'.
 * @param int|null $contentid Optional local_haccgen_content id.
 * @param stdClass|null $haccgendata Session data with topic_generation_duration_seconds, topic_generated_at,
 *                                   last_content_generation_duration_seconds, last_content_generation_completed_at.
 * @param string|null $batchid Optional batch/run id (matches local_haccgen_content.batchid).
 * @param string|null $topicsummary Optional JSON array of topic titles for this run.
 * @return int|false Insert id or false.
 */
function local_haccgen_record_timestamps(
    int $courseid,
    int $userid,
    string $recordtype,
    ?int $contentid = null,
    ?stdClass $haccgendata = null,
    ?string $batchid = null,
    ?string $topicsummary = null
) {
    global $DB;

    $row = new stdClass();
    $row->courseid = $courseid;
    $row->userid = $userid;
    $row->record_type = ($recordtype === 'created') ? 'created' : 'draft';
    $row->contentid = $contentid;
    $row->batchid = $batchid !== null && $batchid !== '' ? core_text::substr($batchid, 0, 40) : null;
    $row->topicsummary = $topicsummary;
    $row->topic_generation_seconds = null;
    $row->topic_generated_at = null;
    $row->content_generation_seconds = null;
    $row->content_completed_at = null;
    $row->timecreated = time();

    if ($haccgendata && is_object($haccgendata)) {
        if (isset($haccgendata->topic_generation_duration_seconds)) {
            $row->topic_generation_seconds = (float) $haccgendata->topic_generation_duration_seconds;
        }
        if (!empty($haccgendata->topic_generated_at)) {
            $row->topic_generated_at = (int) $haccgendata->topic_generated_at;
        }
        if (isset($haccgendata->last_content_generation_duration_seconds)) {
            $row->content_generation_seconds = (int) $haccgendata->last_content_generation_duration_seconds;
        }
        if (!empty($haccgendata->last_content_generation_completed_at)) {
            $row->content_completed_at = (int) $haccgendata->last_content_generation_completed_at;
        }
    }

    return $DB->insert_record('local_haccgen_timestamps', $row);
}

/**
 * Localised labels used when building the "About this course" block.
 *
 * @param string $lang Active course language label.
 * @return array{about:string,learning_objectives_heading:string,learning_objectives_prefix:string}
 */
function local_haccgen_i18n_labels(string $lang): array {
    $lang = trim($lang);
    $labels = [
        'about' => get_string('aboutthiscourse', 'local_haccgen'),
        'learning_objectives_heading' => 'Learning objectives',
        'learning_objectives_prefix' => 'Learning objectives - ',
    ];

    switch ($lang) {
        case 'हिन्दी (Hindi)':
            return [
                'about' => 'इस पाठ्यक्रम के बारे में',
                'learning_objectives_heading' => 'सीखने के उद्देश्य',
                'learning_objectives_prefix' => 'सीखने के उद्देश्य - ',
            ];
        case 'తెలుగు (Telugu)':
            return [
                'about' => 'ఈ కోర్సు గురించి',
                'learning_objectives_heading' => 'అభ్యాస లక్ష్యాలు',
                'learning_objectives_prefix' => 'అభ్యాస లక్ష్యాలు - ',
            ];
        case 'தமிழ் (Tamil)':
            return [
                'about' => 'இந்த பாடநெறி பற்றி',
                'learning_objectives_heading' => 'கற்றல் நோக்கங்கள்',
                'learning_objectives_prefix' => 'கற்றல் நோக்கங்கள் - ',
            ];
        case 'ಕನ್ನಡ (Kannada)':
            return [
                'about' => 'ಈ ಕೋರ್ಸ್ ಬಗ್ಗೆ',
                'learning_objectives_heading' => 'ಕಲಿಕೆಯ ಉದ್ದೇಶಗಳು',
                'learning_objectives_prefix' => 'ಕಲಿಕೆಯ ಉದ್ದೇಶಗಳು - ',
            ];
        case 'বাংলা (Bengali)':
            return [
                'about' => 'এই কোর্স সম্পর্কে',
                'learning_objectives_heading' => 'শেখার উদ্দেশ্য',
                'learning_objectives_prefix' => 'শেখার উদ্দেশ্য - ',
            ];
        default:
            return $labels;
    }
}

/**
 * Resolve course-level learning objectives from session data.
 *
 * @param stdClass $haccgendata Session payload.
 * @return string[]
 */
function local_haccgen_get_course_learning_objectives(stdClass $haccgendata): array {
    if (!empty($haccgendata->learning_objectives1)) {
        return array_values(array_filter(array_map('strval', (array) $haccgendata->learning_objectives1)));
    }

    $objectives = [];
    foreach ((array) ($haccgendata->raw_subtopics ?? []) as $topic) {
        if (!is_array($topic)) {
            continue;
        }
        foreach ((array) ($topic['learning_objectives'] ?? []) as $lo) {
            $lo = trim((string) $lo);
            if ($lo !== '') {
                $objectives[] = $lo;
            }
        }
    }

    return array_values(array_unique($objectives));
}

/**
 * Whether an outline topic from the API is the generated course summary.
 *
 * @param array $subtopic Raw subtopic from generate_subtopics.
 * @param int $index Zero-based position in the outline list.
 * @param string $coursesummary Session/form value (yes/no).
 * @param int $total Total topics in the outline list (0 when unknown).
 * @return bool
 */
function local_haccgen_is_course_summary_subtopic(
    array $subtopic,
    int $index,
    string $coursesummary,
    int $total = 0
): bool {
    if (!empty($subtopic['is_course_summary']) || !empty($subtopic['is_summary'])) {
        return true;
    }

    $type = strtolower(trim((string) ($subtopic['type'] ?? '')));
    if (in_array($type, ['course_summary', 'summary', 'course-summary'], true)) {
        return true;
    }

    if ($coursesummary !== 'yes') {
        return false;
    }

    // Title heuristic: course summary is expected as the last outline topic.
    if ($total > 0 && $index !== $total - 1) {
        return false;
    }

    $title = strtolower(trim((string) ($subtopic['title'] ?? '')));
    if ($title === 'summary' || $title === 'course overview' || $title === 'overview') {
        return true;
    }
    return (bool) preg_match(
        '/\b(course\s+summary|summary\s+of(\s+the)?\s+course|overall\s+summary|executive\s+summary|course\s+overview)\b/i',
        $title
    );
}

/**
 * Move an existing course-summary topic to the end of the outline list.
 *
 * @param array $subtopics Raw subtopics from generate_subtopics.
 * @param string $coursesummary Session/form value (yes/no).
 * @return array
 */
function local_haccgen_move_course_summary_to_end(array $subtopics, string $coursesummary): array {
    if ($coursesummary !== 'yes' || count($subtopics) < 2) {
        return $subtopics;
    }

    $total = count($subtopics);
    $summaryindex = null;
    foreach ($subtopics as $index => $subtopic) {
        if (!is_array($subtopic)) {
            continue;
        }
        if (local_haccgen_is_course_summary_subtopic($subtopic, $index, $coursesummary, $total)) {
            $summaryindex = $index;
            break;
        }
    }

    if ($summaryindex === null || $summaryindex === $total - 1) {
        return $subtopics;
    }

    $summary = $subtopics[$summaryindex];
    array_splice($subtopics, $summaryindex, 1);
    $subtopics[] = $summary;

    return $subtopics;
}

/**
 * Normalise the remote course_summary outline object for step 3.
 *
 * The subscription/content service returns course_summary as a sibling of subtopics
 * (outline billing counts it in local_subscription_manager_outline_billable_words).
 *
 * @param mixed $summary Raw course_summary from generate_subtopics response.
 * @return array|null Normalised outline topic or null when unusable.
 */
function local_haccgen_normalize_course_summary_outline_item($summary): ?array {
    if (!is_array($summary) || empty($summary)) {
        return null;
    }

    // Some services wrap the row in a one-element list.
    if (isset($summary[0]) && is_array($summary[0]) && !isset($summary['title'])) {
        $summary = $summary[0];
    }

    $title = trim((string) ($summary['title'] ?? ''));
    if ($title === '') {
        $title = 'Course Summary';
    }

    $objectives = $summary['learning_objectives'] ?? [];
    if (!is_array($objectives)) {
        $objectives = [];
    }

    return [
        'id' => $summary['id'] ?? uniqid('topic_'),
        'title' => $title,
        'description' => (string) ($summary['description'] ?? ''),
        'estimated_duration' => (string) ($summary['estimated_duration'] ?? 'Less than 15 minutes'),
        'learning_objectives' => array_values(array_filter(array_map('strval', $objectives))),
        'case_study_connection' => $summary['case_study_connection'] ?? null,
        'is_course_summary' => true,
        'is_summary' => true,
        'type' => (string) ($summary['type'] ?? 'course_summary'),
    ];
}

/**
 * Merge top-level course_summary from generate_subtopics into the subtopics list.
 *
 * @param array $response Full generate_subtopics API response.
 * @param string $coursesummary Session/form value (yes/no).
 * @return array Outline subtopics including summary when provided.
 */
function local_haccgen_merge_api_course_summary_into_subtopics(array $response, string $coursesummary): array {
    $subtopics = is_array($response['subtopics'] ?? null) ? $response['subtopics'] : [];

    if ($coursesummary !== 'yes' || empty($response['course_summary'])) {
        return $subtopics;
    }

    $summaryitem = local_haccgen_normalize_course_summary_outline_item($response['course_summary']);
    if ($summaryitem === null) {
        return $subtopics;
    }

    $total = count($subtopics);
    foreach ($subtopics as $index => $subtopic) {
        if (!is_array($subtopic)) {
            continue;
        }
        if (local_haccgen_is_course_summary_subtopic($subtopic, $index, 'yes', $total)) {
            return local_haccgen_move_course_summary_to_end($subtopics, 'yes');
        }
    }

    $subtopics[] = $summaryitem;
    return $subtopics;
}

/**
 * Ensure a course-summary outline row exists when the user requested one.
 *
 * If the remote API omitted a summary topic, append a placeholder row so step 3
 * and content generation still include it.
 *
 * @param array $subtopics Raw subtopics from generate_subtopics.
 * @param string $coursesummary Session/form value (yes/no).
 * @return array
 */
function local_haccgen_ensure_course_summary_outline_topic(array $subtopics, string $coursesummary): array {
    if ($coursesummary !== 'yes' || empty($subtopics)) {
        return $subtopics;
    }

    $total = count($subtopics);
    foreach ($subtopics as $index => $subtopic) {
        if (!is_array($subtopic)) {
            continue;
        }
        if (local_haccgen_is_course_summary_subtopic($subtopic, $index, $coursesummary, $total)) {
            return local_haccgen_move_course_summary_to_end($subtopics, $coursesummary);
        }
    }

    $subtopics[] = [
        'id' => uniqid('topic_'),
        'title' => 'Course Summary',
        'description' => 'A high-level summary of the entire course.',
        'estimated_duration' => 'Less than 15 minutes',
        'learning_objectives' => [],
        'is_course_summary' => true,
        'type' => 'course_summary',
    ];

    return $subtopics;
}

/**
 * Resolve whether a step-3 outline topic should include a quiz.
 *
 * @param array $subtopic Raw subtopic from generate_subtopics.
 * @param bool $iscoursesummary Whether this row is the course summary topic.
 * @return bool
 */
function local_haccgen_resolve_topic_has_quiz(array $subtopic, bool $iscoursesummary): bool {
    if ($iscoursesummary) {
        return false;
    }

    // Step 3: quiz is opt-in via the edit modal. Do not inherit include_quiz,
    // has_quiz, or quiz_count from the generate_subtopics API response.
    return false;
}

/**
 * Format one step-3 outline topic for the topic editor UI.
 *
 * @param array $subtopic Raw subtopic from generate_subtopics.
 * @param int $index Zero-based position in the outline list.
 * @param int $total Total topics in the outline list.
 * @param string $coursesummary Session/form value (yes/no).
 * @return array
 */
function local_haccgen_format_step3_outline_topic(
    array $subtopic,
    int $index,
    int $total,
    string $coursesummary = 'no'
): array {
    $iscoursesummary = local_haccgen_is_course_summary_subtopic($subtopic, $index, $coursesummary, $total);
    $hasquiz = local_haccgen_resolve_topic_has_quiz($subtopic, $iscoursesummary);

    $topicdata = [
        'id' => $subtopic['id'] ?? uniqid('topic_'),
        'title' => $subtopic['title'] ?? 'Untitled',
        'description' => $subtopic['description'] ?? '',
        'estimated_duration' => $subtopic['estimated_duration'] ?? '',
        'learning_objectives' => $subtopic['learning_objectives'] ?? [],
        'has_quiz' => $hasquiz,
        'quiz_question_count' => $hasquiz
            ? (int) ($subtopic['quiz_question_count'] ?? $subtopic['quiz_count'] ?? 1)
            : 0,
        'is_course_summary' => $iscoursesummary,
    ];

    return array_merge($topicdata, [
        'is_first' => $index === 0,
        'is_last' => $index === $total - 1,
        '@index_plus_one' => $index + 1,
        'encoded_topicdata' => rawurlencode(json_encode(
            $topicdata,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        )),
    ]);
}

/**
 * Minutes allowed for a step-2 course duration.
 *
 * The offered choices stop at 120. A longer posted value is still read so it can be rejected.
 * An empty value is 0.
 *
 * @param string $courseduration Session value such as "Less than 60 minutes".
 * @return int
 */
function local_haccgen_course_duration_minutes(string $courseduration): int {
    $courseduration = trim($courseduration);
    if ($courseduration === '') {
        return 0;
    }
    $map = [
        'Less than 15 minutes' => 15,
        'Less than 30 minutes' => 30,
        'Less than 60 minutes' => 60,
        'Less than 90 minutes' => 90,
        'Less than 120 minutes' => 120,
    ];
    if (isset($map[$courseduration])) {
        return $map[$courseduration];
    }
    if (preg_match('/^Less than (\d+) minutes$/', $courseduration, $matches)) {
        $minutes = (int) $matches[1];
        if ($minutes > 0) {
            return $minutes;
        }
    }
    $parsed = local_haccgen_parse_duration_minutes($courseduration);
    return $parsed > 0 ? $parsed : 15;
}

/**
 * Minutes a course duration string is asking for, including numbers outside the dropdown.
 *
 * Unknown labels that contain a number use that number so a longer crafted value is not treated as 15.
 *
 * @param string $courseduration
 * @return int
 */
function local_haccgen_requested_course_minutes(string $courseduration): int {
    $known = local_haccgen_course_duration_minutes($courseduration);
    $map = [
        'Less than 15 minutes',
        'Less than 30 minutes',
        'Less than 60 minutes',
        'Less than 90 minutes',
        'Less than 120 minutes',
    ];
    if (in_array($courseduration, $map, true)) {
        return $known;
    }
    $parsed = local_haccgen_parse_duration_minutes($courseduration);
    return $parsed > 0 ? $parsed : $known;
}

/**
 * Course-minute allowance from subscription status.
 *
 * Returns null when the subscription service cannot be reached. Generation is still
 * rejected by the subscription manager.
 *
 * @return array<string,mixed>|null
 */
function local_haccgen_course_minute_allowance(): ?array {
    static $loaded = false;
    static $allowance = null;
    if ($loaded) {
        return $allowance;
    }
    $loaded = true;

    try {
        $status = local_haccgen_api::get_subscription_status();
    } catch (\Throwable $e) {
        return null;
    }
    if (!is_array($status)) {
        return null;
    }
    if (!isset($status['usage_limit']) && !isset($status['affordable_minutes'])) {
        return null;
    }

    // One course minute costs 150 words. A course is at most 120 minutes.
    // Do not inherit an older 400-word rate from a subscription status payload.
    $wordsper = 150;
    $mincourse = max(1, (int)($status['min_course_minutes'] ?? 15));
    $maxcourse = 120;
    // A word limit of 0 includes no words. Do not treat that, or a stale
    // minutes_unlimited flag, as an open balance.
    $limit = max(0, (int)($status['usage_limit'] ?? 0));
    $used = max(0, (int)($status['usage_used'] ?? 0));
    $remainingwords = max(0, $limit - $used);
    $generationminutes = intdiv($remainingwords, $wordsper);
    $affordable = min($maxcourse, $generationminutes);
    $nearratio = 0.8;
    $affordable = max(0, $affordable);
    $maxtopic = 30;

    $allowance = [
        'unlimited' => false,
        'word_limit' => $limit,
        'word_remaining' => $limit - $used,
        'near_word_limit' => $limit > 0
            && ($limit - $used) > 0
            && $used >= (int) ceil($limit * $nearratio),
        'affordable_minutes' => $affordable,
        'generation_minutes' => $generationminutes,
        'remaining_words' => $remainingwords,
        'words_per_course_minute' => $wordsper,
        'max_course_minutes' => $maxcourse,
        'max_topic_minutes' => $maxtopic,
        'min_course_minutes' => $mincourse,
        'can_start' => $affordable >= $mincourse,
        'has_subscription' => true,
    ];
    return $allowance;
}

/**
 * Course length is not limited by the remaining word balance.
 *
 * A course that still has words left may be longer than that balance. The extra
 * words are recorded when the course finishes. $courseduration stays so existing
 * callers do not change.
 *
 * @param string|null $courseduration
 * @return string|null
 */
function local_haccgen_course_minutes_gate_error(?string $courseduration = null): ?string {
    unset($courseduration);
    return null;
}

/**
 * Whether the word balance is already used up.
 *
 * Unlimited plans and an unreadable subscription are treated as still open.
 * The subscription manager remains the gate for those cases.
 *
 * @return bool
 */
function local_haccgen_word_balance_exhausted(): bool {
    $allowance = local_haccgen_course_minute_allowance();
    if (!is_array($allowance) || !empty($allowance['unlimited'])) {
        return false;
    }
    $remaining = $allowance['remaining_words'] ?? null;
    return $remaining !== null && (int) $remaining <= 0;
}

/**
 * Template fields for the remaining-minutes notice and disabled duration options.
 *
 * @param array<string,mixed>|null $allowance
 * @return array<string,mixed>
 */
function local_haccgen_minute_allowance_template(?array $allowance): array {
    $out = [
        'has_minute_allowance' => false,
        'minute_allowance_blocked' => false,
        'minute_allowance_notice' => '',
        'minute_allowance_upgrade_label' => get_string('quota_exceeded_upgrade', 'local_haccgen'),
        'quota_upgrade_url' => local_haccgen_quota_upgrade_url(),
        'affordable_minutes' => 0,
        'generation_minutes' => 0,
        'minutes_unlimited' => false,
        'max_topic_minutes' => 30,
        'can_add_topics' => true,
        'word_limit_warning' => '',
    ];
    foreach ([15, 30, 60, 90, 120] as $minutes) {
        $out['duration_' . $minutes . '_disabled'] = false;
    }
    if ($allowance === null) {
        return $out;
    }

    $affordable = min(120, (int)$allowance['affordable_minutes']);
    $out['has_minute_allowance'] = true;
    $out['affordable_minutes'] = $affordable;
    $out['minutes_unlimited'] = !empty($allowance['unlimited']);
    $out['generation_minutes'] = $out['minutes_unlimited']
        ? 0
        : max(0, (int)($allowance['generation_minutes'] ?? 0));
    $out['max_topic_minutes'] = 30;
    if (!empty($allowance['near_word_limit'])) {
        $out['word_limit_warning'] = get_string('wordlimitnearing', 'local_haccgen', (object) [
            'remaining' => number_format(max(0, (int) ($allowance['word_remaining'] ?? 0))),
            'limit' => number_format(max(0, (int) ($allowance['word_limit'] ?? 0))),
        ]);
    }
    return $out;
}

/**
 * Minutes a quiz adds to the course budget.
 *
 * Average of the generator's quiz time range. One question is 3 minutes.
 * Ten questions, the maximum, is 15 minutes.
 *
 * @param int $count
 * @return int
 */
function local_haccgen_quiz_minutes(int $count): int {
    if ($count < 1) {
        return 0;
    }
    $count = min(10, $count);
    $low = max(2, $count);
    $high = max(4, $count * 2);
    return (int) round(($low + $high) / 2);
}

/**
 * Step 2 duration choices. The list stops at 120 minutes.
 *
 * Credit balance does not disable a length. $allowance stays so existing callers do not change.
 *
 * @param array<string,mixed>|null $allowance
 * @param string $selected
 * @return array<int,array<string,mixed>>
 */
function local_haccgen_course_duration_options(?array $allowance, string $selected): array {
    unset($allowance);
    $options = [];
    foreach ([15, 30, 60, 90, 120] as $minutes) {
        $value = 'Less than ' . $minutes . ' minutes';
        $options[] = [
            'value' => $value,
            'minutes' => $minutes,
            'label' => get_string('duration_approx_minutes', 'local_haccgen', $minutes),
            'selected' => $selected === $value,
            'disabled' => false,
        ];
    }
    return $options;
}

/**
 * Whether a posted step 2 duration is one of the enabled choices.
 *
 * @param string $value
 * @param array<string,mixed>|null $allowance
 * @return bool
 */
function local_haccgen_is_allowed_course_duration(string $value, ?array $allowance): bool {
    foreach (local_haccgen_course_duration_options($allowance, '') as $option) {
        if ($option['value'] === $value && empty($option['disabled'])) {
            return true;
        }
    }
    return false;
}

/**
 * Fill step 2 and step 3 duration fields from the credit balance.
 *
 * @param array<string,mixed> $formdata
 * @param array<string,mixed>|null $allowance
 * @return void
 */
function local_haccgen_apply_duration_formdata(array &$formdata, ?array $allowance): void {
    $selected = (string) ($formdata['courseduration'] ?? '');
    $courseminutes = local_haccgen_course_duration_minutes($selected);
    $formdata['course_duration_minutes'] = $courseminutes;
    $formdata['duration_options'] = local_haccgen_course_duration_options($allowance, $selected);
    // Each topic field stops at 30 minutes. The word balance is not a minute budget.
    $formdata['max_topic_minutes'] = 30;
    $formdata['minutes_unlimited'] = is_array($allowance) && !empty($allowance['unlimited']);
    $formdata['generation_minutes'] = $formdata['minutes_unlimited']
        ? 0
        : max(0, (int)(is_array($allowance) ? ($allowance['generation_minutes'] ?? 0) : 0));
}

/**
 * Read a minute count from a duration string.
 *
 * Ranges use the average. "5-10 minutes" becomes 8.
 *
 * @param mixed $value
 * @return int 0 when no number is present.
 */
function local_haccgen_parse_duration_minutes($value): int {
    $text = strtolower(trim((string) $value));
    if ($text === '') {
        return 0;
    }
    if (preg_match('/(\d+)\s*-\s*(\d+)/', $text, $matches)) {
        return (int) round(((int) $matches[1] + (int) $matches[2]) / 2);
    }
    if (preg_match('/(\d+)/', $text, $matches)) {
        return (int) $matches[1];
    }
    return 0;
}

/**
 * Whether this outline row is the course summary and should be left out of the lesson budget.
 *
 * @param array $topic
 * @return bool
 */
function local_haccgen_topic_row_is_summary(array $topic): bool {
    if (!empty($topic['is_course_summary']) || !empty($topic['is_summary']) || !empty($topic['is_summary_topic'])) {
        return true;
    }
    $type = strtolower(trim((string) ($topic['type'] ?? $topic['content_type'] ?? '')));
    if (in_array($type, ['course_summary', 'summary', 'course-summary'], true)) {
        return true;
    }
    return strtolower(trim((string) ($topic['id'] ?? ''))) === 'topic_summary';
}

/**
 * Spread a course minute budget evenly across lesson topics (no per-topic cap).
 *
 * @param int $budget Course minutes.
 * @param int $count Lesson topic count.
 * @return int[]
 */
function local_haccgen_distribute_minutes(int $budget, int $count): array {
    if ($count <= 0) {
        return [];
    }
    $budget = max($count, $budget);
    $base = intdiv($budget, $count);
    $remainder = $budget % $count;
    $values = array_fill(0, $count, $base);
    for ($i = 0; $i < $remainder; $i++) {
        $values[$i]++;
    }
    return $values;
}

/**
 * Give each generated lesson topic a duration that fits the course budget.
 *
 * Summary rows are left unchanged. User edits are not passed through this function.
 *
 * @param array $subtopics
 * @param string $courseduration
 * @return array
 */
function local_haccgen_assign_topic_durations(array $subtopics, string $courseduration): array {
    $indexes = [];
    foreach ($subtopics as $index => $topic) {
        if (is_array($topic) && !local_haccgen_topic_row_is_summary($topic)) {
            $indexes[] = $index;
        }
    }
    $shares = local_haccgen_distribute_minutes(
        local_haccgen_course_duration_minutes($courseduration),
        count($indexes)
    );
    foreach ($indexes as $position => $index) {
        $minutes = min(30, max(1, (int) $shares[$position]));
        $subtopics[$index]['estimated_duration'] = $minutes . ' minutes';
    }
    return $subtopics;
}

/**
 * Format posted or generated outline rows for the step 3 list.
 *
 * @param array $subtopics
 * @param string $coursesummary
 * @return array
 */
function local_haccgen_format_outline_topics(array $subtopics, string $coursesummary): array {
    $total = count($subtopics);
    $formatted = [];
    foreach ($subtopics as $index => $subtopic) {
        if (!is_array($subtopic)) {
            continue;
        }
        $formatted[] = local_haccgen_format_step3_outline_topic($subtopic, $index, $total, $coursesummary);
    }
    return $formatted;
}

/**
 * Whether the posted topic asked for a quiz.
 *
 * @param array $topic
 * @return bool
 */
function local_haccgen_topic_has_quiz(array $topic): bool {
    if (local_haccgen_topic_row_is_summary($topic)) {
        return false;
    }
    $value = $topic['has_quiz'] ?? false;
    if (is_string($value)) {
        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y', 'on'], true);
    }
    return (bool) $value;
}

/**
 * Validate a step 3 topic list (topic count, quiz caps). Durations must be a positive minute count.
 *
 * Accepted lesson durations are rewritten to "N minutes". Credit balance is not a
 * minute budget. $courseduration stays so existing callers do not change.
 *
 * @param array $topics Posted topic_order rows.
 * @param string $courseduration Step 2 course duration.
 * @return array{ok:bool,error:string,topics:array}
 */
function local_haccgen_validate_topic_plan(array $topics, string $courseduration): array {
    unset($courseduration);
    $lessoncount = 0;
    $normalized = [];
    $maxtopic = 30;

    foreach ($topics as $topic) {
        if (!is_array($topic)) {
            continue;
        }
        $title = trim((string) ($topic['title'] ?? ''));
        if ($title === '') {
            $title = 'this topic';
        }
        $issummary = local_haccgen_topic_row_is_summary($topic);
        $minutes = local_haccgen_parse_duration_minutes($topic['estimated_duration'] ?? '');
        if ($minutes < 1) {
            return [
                'ok' => false,
                'error' => get_string('topicdurationinvalid', 'local_haccgen', $title),
                'topics' => $topics,
            ];
        }
        if ($minutes > $maxtopic) {
            return [
                'ok' => false,
                'error' => get_string('topicdurationrange', 'local_haccgen', (object) [
                    'title' => $title,
                    'max' => $maxtopic,
                ]),
                'topics' => $topics,
            ];
        }
        $topic['estimated_duration'] = $minutes . ' minutes';

        $hasquiz = local_haccgen_topic_has_quiz($topic);
        if ($issummary || !$hasquiz) {
            $topic['has_quiz'] = false;
            $topic['quiz_question_count'] = 0;
            $topic['quiz_count'] = 0;
        } else {
            $quizcount = $topic['quiz_question_count'] ?? $topic['quiz_count'] ?? null;
            if (!is_numeric($quizcount) || (int) $quizcount < 1 || (int) $quizcount > 10) {
                return [
                    'ok' => false,
                    'error' => get_string('quizcountlimit', 'local_haccgen', $title),
                    'topics' => $topics,
                ];
            }
            $topic['has_quiz'] = true;
            $topic['quiz_question_count'] = (int) $quizcount;
            $topic['quiz_count'] = (int) $quizcount;
        }

        if (!$issummary) {
            $lessoncount++;
        }
        $normalized[] = $topic;
    }

    if ($lessoncount < 1) {
        return [
            'ok' => false,
            'error' => get_string('topicdurationempty', 'local_haccgen'),
            'topics' => $topics,
        ];
    }
    if ($lessoncount > 25) {
        return [
            'ok' => false,
            'error' => get_string('topiccountlimit', 'local_haccgen'),
            'topics' => $topics,
        ];
    }
    return [
        'ok' => true,
        'error' => '',
        'topics' => $normalized,
    ];
}

/**
 * Lesson ids from an outline the user is allowed to keep editing.
 *
 * @param array $topics
 * @return string[]
 */
function local_haccgen_outline_lesson_ids(array $topics): array {
    $ids = [];
    foreach ($topics as $topic) {
        if (!is_array($topic)) {
            continue;
        }
        $id = trim((string) ($topic['id'] ?? ''));
        if ($id === '') {
            continue;
        }
        $ids[$id] = true;
    }
    return array_keys($ids);
}

/**
 * Whether the posted list adds a lesson that was not in the stored outline.
 *
 * An empty stored outline does not treat the current list as new. Editing or
 * deleting a stored lesson is allowed.
 *
 * @param array $topics
 * @param string[] $outlineids
 * @return bool
 */
function local_haccgen_topics_add_outside_outline(array $topics, array $outlineids): bool {
    if ($outlineids === []) {
        return false;
    }
    $known = array_fill_keys($outlineids, true);
    foreach ($topics as $topic) {
        if (!is_array($topic)) {
            continue;
        }
        $id = trim((string) ($topic['id'] ?? ''));
        if ($id === '' || !isset($known[$id])) {
            return true;
        }
    }
    return false;
}

/**
 * Build Mustache context for the preview_course template.
 *
 * @param stdClass $haccgendata Session payload with course metadata.
 * @param array $extras Additional template fields.
 * @return array
 */
function local_haccgen_preview_course_context(stdClass $haccgendata, array $extras = []): array {
    $lang = $haccgendata->activelang ?? $haccgendata->courselanguage ?? 'English';
    $labels = local_haccgen_i18n_labels($lang);
    $coursesummary = $haccgendata->coursesummary ?? 'no';

    $audiencetags = [];
    if (!empty($haccgendata->targetaudience)) {
        $audiencetags = array_values(array_filter(array_map('trim', explode(',', (string) $haccgendata->targetaudience))));
    }

    $context = [
        'TOPICTITLE' => $haccgendata->TOPICTITLE ?? '',
        'targetaudience' => $haccgendata->targetaudience ?? '',
        'levelofunderstanding' => $haccgendata->levelofunderstanding ?? '',
        'toneofnarrative' => $haccgendata->toneofnarrative ?? '',
        'courseduration' => $haccgendata->courseduration ?? '',
        'coursesummary' => $coursesummary,
        'is_summary_yes' => $coursesummary === 'yes',
        'is_summary_no' => $coursesummary === 'no',
        'pdfuploaded' => $haccgendata->pdf_file ?? '',
        'audiencetags' => $audiencetags,
        'learning_objectives_heading' => $labels['learning_objectives_heading'] ?? 'Learning objectives',
    ];

    return array_merge($context, $extras);
}

/**
 * Whether topics already contain an "About this course" entry.
 *
 * @param array $topics Structured topics list.
 * @param string $abouttitle Localised about-topic title.
 * @return bool
 */
function local_haccgen_topics_have_about(array $topics, string $abouttitle): bool {
    foreach ($topics as $topic) {
        if (trim((string) ($topic['title'] ?? '')) === $abouttitle) {
            return true;
        }
    }
    return false;
}

/**
 * Prepend the "About this course" topic when missing.
 *
 * @param array $topics Structured topics list.
 * @param stdClass $haccgendata Session payload with course metadata.
 * @param object $output Moodle output renderer ($OUTPUT).
 * @return array Updated topics list.
 */
function local_haccgen_prepend_about_course_topic(array $topics, stdClass $haccgendata, object $output): array {
    $lang = $haccgendata->activelang ?? $haccgendata->courselanguage ?? 'English';
    $labels = local_haccgen_i18n_labels($lang);
    $abouttitle = $labels['about'] ?? get_string('aboutthiscourse', 'local_haccgen');

    if (local_haccgen_topics_have_about($topics, $abouttitle)) {
        return $topics;
    }

    $courselevelobjectives = local_haccgen_get_course_learning_objectives($haccgendata);
    if (!empty($courselevelobjectives)) {
        $courselevelcontent = '<ul>';
        foreach ($courselevelobjectives as $obj) {
            $courselevelcontent .= '<li>' . s($obj) . '</li>';
        }
        $courselevelcontent .= '</ul>';
    } else {
        $courselevelcontent = '';
    }

    $previewcontext = local_haccgen_preview_course_context($haccgendata, [
        'objectives_html' => $courselevelcontent,
    ]);

    $previewhtml = $output->render_from_template('local_haccgen/preview_course', $previewcontext);

    $courseoverviewtopic = [
        'title' => $abouttitle,
        'subtopics' => [
            [
                'title' => $abouttitle,
                'content_html' => $previewhtml,
                'content' => ['text' => $previewhtml, 'itemid' => 0],
                'examples' => [],
            ],
        ],
    ];

    array_unshift($topics, $courseoverviewtopic);
    return $topics;
}

/**
 * Format a Unix save timestamp using the LMS site timezone.
 *
 * Uses the timezone configured in Site administration → Location,
 * not the viewing user's personal profile timezone.
 *
 * @param int $timestamp Unix epoch seconds.
 * @return string Formatted date/time or empty string if invalid.
 */
function local_haccgen_format_saved_time(int $timestamp): string {
    if ($timestamp <= 0) {
        return '';
    }

    return userdate(
        $timestamp,
        get_string('strftimedatetime', 'langconfig'),
        \core_date::get_server_timezone()
    );
}

/**
 * URL shown when the user needs to add credits or upgrade.
 *
 * @return string
 */
function local_haccgen_quota_upgrade_url(): string {
    return 'https://haccgen.com/';
}

/**
 * Whether a subscription-manager style response indicates quota exhaustion.
 *
 * @param mixed $response Decoded API response.
 * @return bool
 */
function local_haccgen_is_quota_exceeded_response($response): bool {
    if (!is_array($response)) {
        return false;
    }
    $status = strtolower(trim((string)($response['status'] ?? '')));
    if ($status === 'exhausted') {
        return true;
    }
    return local_haccgen_is_quota_exceeded_message((string)($response['message'] ?? ''));
}

/**
 * Whether a plain-text error message indicates quota / usage exhaustion.
 *
 * @param string $message Error message.
 * @return bool
 */
function local_haccgen_is_quota_exceeded_message(string $message): bool {
    $msg = strtolower(trim($message));
    if ($msg === '') {
        return false;
    }
    if (strpos($msg, 'usage limit exceeded') !== false) {
        return true;
    }
    if (strpos($msg, 'usage limit') !== false && strpos($msg, 'exceed') !== false) {
        return true;
    }
    if (strpos($msg, 'quota') !== false && (strpos($msg, 'exceed') !== false || strpos($msg, 'limit') !== false)) {
        return true;
    }
    return false;
}

/**
 * Render the global quota-exceeded modal and load its AMD module.
 *
 * @param \core_renderer $output Page renderer.
 * @param \moodle_page $page Current page.
 * @param bool $showonload Open the modal immediately after load.
 * @return void
 */
function local_haccgen_render_quota_modal_and_js($output, $page, bool $showonload = false): void {
    echo $output->render_from_template('local_haccgen/quota_exceeded_modal', [
        'upgrade_url' => local_haccgen_quota_upgrade_url(),
        'title' => get_string('quota_exceeded_title', 'local_haccgen'),
        'body' => get_string('quota_exceeded_body', 'local_haccgen'),
        'upgrade_label' => get_string('quota_exceeded_upgrade', 'local_haccgen'),
        'close_label' => get_string('closebuttontitle', 'core'),
        'show_on_load' => $showonload,
    ]);
    $page->requires->js_call_amd('local_haccgen/quota_modal', 'init', [
        (object) ['showOnLoad' => (bool) $showonload],
    ]);
}



/**
 * Draft item id for the step 4 editor, stored in the plugin session cache.
 *
 * @return int
 */
function local_haccgen_content_editor_draftitemid(): int {
    $id = \local_haccgen\session_store::get('contenteditordraftitemid');
    return (int)($id ?? 0);
}

function local_haccgen_ensure_libdir(): void {
    global $CFG;
    if (!is_object($CFG)) {
        return;
    }

    $candidates = [];
    if (!empty($CFG->libdir)) {
        $candidates[] = rtrim((string) $CFG->libdir, '/');
    }
    if (!empty($CFG->dirroot)) {
        $candidates[] = rtrim((string) $CFG->dirroot, '/') . '/lib';
    }
    // local/haccgen/lib.php -> Moodle root is two levels up.
    $candidates[] = dirname(dirname(__DIR__)) . '/lib';

    foreach ($candidates as $libdir) {
        if ($libdir !== '' && is_file($libdir . '/filelib.php')) {
            $CFG->libdir = $libdir;
            return;
        }
    }
}

/**
 * Safely load Moodle filelib.php.
 *
 * @return bool
 */
function local_haccgen_require_filelib(): bool {
    global $CFG;

    local_haccgen_ensure_libdir();
    $libdir = (is_object($CFG) && !empty($CFG->libdir)) ? rtrim((string) $CFG->libdir, '/') : '';
    if ($libdir === '' || !is_file($libdir . '/filelib.php')) {
        return false;
    }

    if (!class_exists('curl', false)) {
        require_once($libdir . '/filelib.php');
    }

    return class_exists('curl', false);
}
/**
 * File-picker options for the course HTML editor.
 *
 * Moodle shows Browse repositories in Insert media only when these are passed
 *
 * @param context $context User context that owns the draft area.
 * @param int $draftitemid Draft item id already prepared for the editor.
 * @param array $editoroptions Editor options (maxbytes, areamaxbytes, return_types).
 * @return array<string,stdClass>
 */
function local_haccgen_editor_filepicker_options(context $context, int $draftitemid, array $editoroptions = []): array {
    global $CFG, $PAGE;
    $capcontext = $context;
    if (!empty($PAGE->context) && (int)$PAGE->context->contextlevel === CONTEXT_COURSE) {
        $capcontext = $PAGE->context;
    }
    if ($draftitemid <= 0 || !isloggedin() || isguestuser() || !has_capability('local/haccgen:manage', $capcontext)) {
        return [];
    }

    require_once($CFG->dirroot . '/repository/lib.php');

    $maxbytes = (int)($editoroptions['maxbytes'] ?? 0);
    $areamaxbytes = (int)($editoroptions['areamaxbytes'] ?? FILE_AREA_MAX_BYTES_UNLIMITED);
    $returntypes = (int)($editoroptions['return_types'] ?? (
        FILE_INTERNAL | FILE_EXTERNAL | FILE_REFERENCE | FILE_CONTROLLED_LINK
    ));

    $args = new stdClass();
    $args->return_types = $returntypes;
    $args->context = $context;
    $args->env = 'filepicker';

    $pickers = [
        'image' => ['web_image'],
        'media' => ['video', 'audio'],
        'link' => '*',
        'subtitle' => ['.vtt'],
    ];
    if (has_capability('moodle/h5p:deploy', $context)) {
        $pickers['h5p'] = ['.h5p'];
    }

    $fpoptions = [];
    foreach ($pickers as $type => $acceptedtypes) {
        $args->accepted_types = $acceptedtypes;
        $picker = initialise_filepicker($args);
        $picker->context = $context;
        $picker->client_id = uniqid();
        $picker->maxbytes = $maxbytes;
        $picker->areamaxbytes = $areamaxbytes;
        $picker->env = 'editor';
        $picker->itemid = $draftitemid;
        $fpoptions[$type] = $picker;
    }

    return $fpoptions;
}
/**
 * Normalise a stored-file directory path.
 *
 * @param string $filepath
 * @return string
 */
function local_haccgen_normalise_filepath(string $filepath): string {
    $filepath = urldecode(trim(str_replace('\\', '/', $filepath)));
    if ($filepath === '' || $filepath === '/') {
        return '/';
    }
    if ($filepath[0] !== '/') {
        $filepath = '/' . $filepath;
    }
    if (substr($filepath, -1) !== '/') {
        $filepath .= '/';
    }
    return $filepath;
}

/**
 * Filename as written in the URL, plus the PARAM_FILE form of that name.
 *
 * Toolbar uploads keep the user's filename. clean_param(PARAM_FILE) can drop
 * characters, so the stored file has to be looked up with the raw name first.
 *
 * @param string $segment
 * @return array{rawfilename:string,filename:string}
 */
function local_haccgen_file_url_names(string $segment): array {
    $segment = (string)preg_replace('/[?#].*$/', '', $segment);
    return [
        'rawfilename' => $segment,
        'filename' => clean_param(urldecode($segment), PARAM_FILE),
    ];
}

/**
 * Names to try when resolving a parsed Moodle file URL.
 *
 * @param array $ref
 * @return string[]
 */
function local_haccgen_promote_filename_candidates(array $ref): array {
    $names = [];
    $push = static function (string $name) use (&$names): void {
        $name = trim($name);
        if ($name === '' || $name === '.' || $name === '..' || strpbrk($name, "/\\\0") !== false) {
            return;
        }
        if (!in_array($name, $names, true)) {
            $names[] = $name;
        }
    };

    $raw = (string)($ref['rawfilename'] ?? '');
    $push($raw);
    $decoded = urldecode($raw);
    if ($decoded !== $raw) {
        $push($decoded);
    }
    $push((string)($ref['filename'] ?? ''));
    return $names;
}

/**
 * Parse a Moodle draftfile or pluginfile URL, including slasharguments=off.
 *
 * @param string $url
 * @return array|null
 */
function local_haccgen_parse_moodle_file_url(string $url): ?array {
    $url = html_entity_decode(trim($url), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $url = str_replace('\\/', '/', $url);
    // An unencoded space makes parse_url() reject the whole link.
    $url = str_replace(' ', '%20', $url);
    $parts = parse_url($url);
    if ($parts === false) {
        $path = $url;
        $parts = [];
    } else {
        $path = (string)($parts['path'] ?? $url);
    }
    if (!empty($parts['query'])) {
        parse_str($parts['query'], $query);
        if (!empty($query['file'])) {
            $script = strtolower((string)basename($path));
            $prefix = (strpos($script, 'draftfile') !== false) ? '/draftfile.php/' : '/pluginfile.php/';
            $path = $prefix . ltrim(rawurldecode((string)$query['file']), '/');
        }
    }
    $path = rawurldecode(urldecode($path));
    if ($path !== '' && $path[0] !== '/' && preg_match('#(?:draftfile|tokenpluginfile|pluginfile)\.php#i', $path)) {
        $path = '/' . $path;
    }

    if (preg_match('#/draftfile\.php/(\d+)/user/draft/(\d+)(/.*)?/([^/]+)$#', $path, $m)) {
        $filepath = local_haccgen_normalise_filepath((string)($m[3] ?? '/'));
        return [
            'contextid' => (int)$m[1],
            'component' => 'user',
            'filearea' => 'draft',
            'itemid' => (int)$m[2],
            'filepath' => $filepath,
        ] + local_haccgen_file_url_names((string)$m[4]);
    }
    if (preg_match('#/tokenpluginfile\.php/[^/]+/(\d+)/([^/]+)/([^/]+)/(\d+)(/.*)?/([^/]+)$#', $path, $m)) {
        return [
            'contextid' => (int)$m[1],
            'component' => clean_param($m[2], PARAM_COMPONENT),
            'filearea' => clean_param($m[3], PARAM_AREA),
            'itemid' => (int)$m[4],
            'filepath' => local_haccgen_normalise_filepath((string)($m[5] ?? '/')),
        ] + local_haccgen_file_url_names((string)$m[6]);
    }
    if (preg_match('#/(?:webservice/)?pluginfile\.php/(\d+)/([^/]+)/([^/]+)/(\d+)(/.*)?/([^/]+)$#', $path, $m)) {
        return [
            'contextid' => (int)$m[1],
            'component' => clean_param($m[2], PARAM_COMPONENT),
            'filearea' => clean_param($m[3], PARAM_AREA),
            'itemid' => (int)$m[4],
            'filepath' => local_haccgen_normalise_filepath((string)($m[5] ?? '/')),
        ] + local_haccgen_file_url_names((string)$m[6]);
    }
    return null;
}

/**
 * Filename and mime to keep a generated video playable after it leaves the draft area.
 *
 * @param stored_file $file
 * @return array{0:string,1:string}
 */
function local_haccgen_durable_media_meta($file): array {
    $filename = (string)$file->get_filename();
    $mime = (string)$file->get_mimetype();
    $isvideobin = (bool)preg_match('/^video_.+\.bin$/i', $filename);
    if ($isvideobin || ($mime === 'application/octet-stream' && stripos($filename, 'video') === 0)) {
        $filename = (string)preg_replace('/\.bin$/i', '.mp4', $filename);
        $mime = 'video/mp4';
    } else if ($mime === '' || $mime === 'document/unknown') {
        if (preg_match('/\.mp4$/i', $filename)) {
            $mime = 'video/mp4';
        }
    }
    if ($mime === '') {
        $mime = 'application/octet-stream';
    }
    return [$filename, $mime];
}

/**
 * Draft item ids mentioned in editor HTML.
 *
 * @param string $html
 * @return int[]
 */
function local_haccgen_draft_itemids_from_html(string $html): array {
    $ids = [];
    if (preg_match_all('#(?:draftfile|tokenpluginfile|pluginfile)\.php[^"\'\s<>]*?/user/draft/(\d+)/#i', $html, $m)) {
        foreach ($m[1] as $id) {
            $ids[] = (int)$id;
        }
    }
    if (preg_match_all('#user(?:%2F|/)draft(?:%2F|/)(\d+)#i', $html, $m)) {
        foreach ($m[1] as $id) {
            $ids[] = (int)$id;
        }
    }
    return array_values(array_unique(array_filter($ids)));
}

/**
 * Copy every file from a user draft area into the lasting plugin file area.
 *
 * @param file_storage $fs
 * @param int $draftitemid
 * @param int $destcontextid
 * @param string $component
 * @param string $filearea
 * @param int $itemid
 * @return array<string,string> Old filename => stored filename
 */
function local_haccgen_copy_draft_area_files(
    $fs,
    int $draftitemid,
    int $destcontextid,
    string $component,
    string $filearea,
    int $itemid
): array {
    global $USER;

    $renames = [];
    if ($draftitemid <= 0 || empty($USER->id)) {
        return $renames;
    }
    $userctxid = context_user::instance($USER->id)->id;
    $files = $fs->get_area_files($userctxid, 'user', 'draft', $draftitemid, 'id', false);
    foreach ($files as $file) {
        [$destname, $mime] = local_haccgen_durable_media_meta($file);
        if ($destname === '') {
            continue;
        }
        $renames[$file->get_filename()] = $destname;
        if ($fs->file_exists($destcontextid, $component, $filearea, $itemid, '/', $destname)) {
            continue;
        }
        try {
            $fs->create_file_from_storedfile([
                'contextid' => $destcontextid,
                'component' => $component,
                'filearea' => $filearea,
                'itemid' => $itemid,
                'filepath' => '/',
                'filename' => $destname,
                'mimetype' => $mime,
            ], $file);
        } catch (Throwable $e) {
            error_log('local_haccgen_copy_draft_area_files: ' . $e->getMessage());
        }
    }
    return $renames;
}

/**
 * Copy draft or plugin media referenced in HTML into a lasting file area.
 *
 * Any draftfile.php or pluginfile.php URL is decoded and parsed, including
 * relative links (../../draftfile.php/...), subdirectory installs
 * (/moodle/draftfile.php/...), and query strings. The file is opened with the
 * filename from the URL before PARAM_FILE rewrites it.
 * Generated video_*.bin files are stored as .mp4.
 *
 * @param string $html
 * @param int $destcontextid
 * @param string $component
 * @param string $filearea
 * @param int $itemid
 * @param bool $placeholder Rewrite to @@PLUGINFILE@@ when true, otherwise a pluginfile URL.
 * @param int $fallbackcontextid Course context to search when the draft file was already copied.
 * @param int $fallbackitemid Item id in local_haccgen/uploads for that search.
 * @param int $draftitemid Editor draft itemid, used when the link is @@PLUGINFILE@@ or the URL itemid is stale.
 * @return string
 */
function local_haccgen_promote_html_media(
    string $html,
    int $destcontextid,
    string $component,
    string $filearea,
    int $itemid,
    bool $placeholder = false,
    int $fallbackcontextid = 0,
    int $fallbackitemid = 0,
    int $draftitemid = 0
): string {
    global $USER;

    if ($html === '' || $destcontextid <= 0) {
        return $html;
    }
    if (!local_haccgen_require_filelib() || !function_exists('get_file_storage')) {
        return $html;
    }
    if (strpos($html, '\\/draftfile.php') !== false || strpos($html, '\\/pluginfile.php') !== false) {
        $html = str_replace('\\/', '/', $html);
    }

    $fs = get_file_storage();
    $userctxid = 0;
    if (!empty($USER->id)) {
        $userctxid = context_user::instance($USER->id)->id;
    }

    $draftids = local_haccgen_draft_itemids_from_html($html);
    if ($draftitemid > 0) {
        $draftids[] = $draftitemid;
    }
    $editordraftid = local_haccgen_content_editor_draftitemid();
    if ($editordraftid > 0) {
        $draftids[] = $editordraftid;
    }
    $draftids = array_values(array_unique(array_filter(array_map('intval', $draftids))));
    $renames = [];
    foreach ($draftids as $did) {
        $renames += local_haccgen_copy_draft_area_files(
            $fs,
            $did,
            $destcontextid,
            $component,
            $filearea,
            $itemid
        );
        if (function_exists('file_rewrite_urls_to_pluginfile')) {
            $html = file_rewrite_urls_to_pluginfile($html, $did);
        }
    }
    foreach ($renames as $oldname => $newname) {
        if ($oldname === $newname) {
            continue;
        }
        $html = str_replace('@@PLUGINFILE@@/' . $oldname, '@@PLUGINFILE@@/' . $newname, $html);
    }
    if (!$placeholder && function_exists('file_rewrite_pluginfile_urls') && strpos($html, '@@PLUGINFILE@@/') !== false) {
        $html = file_rewrite_pluginfile_urls(
            $html,
            'pluginfile.php',
            $destcontextid,
            $component,
            $filearea,
            $itemid
        );
    }

    // Whole URL, including a bare draftfile.php/... link, a /subdir prefix,
    // tokenpluginfile.php, and slasharguments=off query strings. The previous
    // pattern required a slash or ? immediately after .php and missed links
    // the editor saved, so those stayed as draftfile.php.
    $pattern = '#(?<![\w])(?:(?:(?:https?:)?//|\.\./|/)[^\s"\'<>]*?)?(?:draftfile|tokenpluginfile|pluginfile)\.php[^\s"\'<>]*#i';

    $rewritten = preg_replace_callback($pattern, static function (array $match) use (
        $fs,
        $userctxid,
        $destcontextid,
        $component,
        $filearea,
        $itemid,
        $placeholder,
        $fallbackcontextid,
        $fallbackitemid,
        $draftitemid
    ) {
        $original = $match[0];
        $decoded = html_entity_decode($original, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        try {
            $ref = local_haccgen_parse_moodle_file_url($decoded);
        } catch (Throwable $e) {
            error_log('local_haccgen_promote_html_media parse: ' . $e->getMessage());
            return $original;
        }
        $names = $ref ? local_haccgen_promote_filename_candidates($ref) : [];
        if (!$ref || !$names) {
            if (stripos($decoded, 'draftfile.php') !== false) {
                error_log('local_haccgen_promote_html_media: unparsed draft URL ' . substr($decoded, 0, 180));
            }
            return $original;
        }

        $isowndraft = $ref['component'] === 'user'
            && $ref['filearea'] === 'draft'
            && $userctxid > 0
            && (int)$ref['contextid'] === $userctxid;
        $ispluginmedia = $ref['component'] === LOCAL_HACCGEN_COMPONENT
            && $ref['filearea'] === LOCAL_HACCGEN_FILEAREA;
        $isdrafturl = $ref['component'] === 'user' && $ref['filearea'] === 'draft';
        if (!$isowndraft && !$ispluginmedia && !$isdrafturl) {
            return $original;
        }

        $alreadydest = (int)$ref['contextid'] === $destcontextid
            && $ref['component'] === $component
            && $ref['filearea'] === $filearea
            && (int)$ref['itemid'] === $itemid;
        if ($alreadydest && !$placeholder) {
            return $original;
        }

        $src = null;
        if ($isowndraft || $ispluginmedia) {
            $filepaths = [$ref['filepath']];
            if ($ref['filepath'] !== '/') {
                $filepaths[] = '/';
            }
            foreach ($filepaths as $filepath) {
                foreach ($names as $name) {
                    $candidate = $fs->get_file(
                        (int)$ref['contextid'],
                        $ref['component'],
                        $ref['filearea'],
                        (int)$ref['itemid'],
                        $filepath,
                        $name
                    );
                    if ($candidate && !$candidate->is_directory()) {
                        $src = $candidate;
                        break 2;
                    }
                }
            }
        }
        if (!$src) {
            foreach ($names as $name) {
                $src = local_haccgen_find_promoted_media(
                    $fs,
                    $name,
                    $destcontextid,
                    $component,
                    $filearea,
                    $itemid,
                    $fallbackcontextid,
                    $fallbackitemid
                );
                if ($src) {
                    break;
                }
            }
        }
        if (!$src && ($isowndraft || $isdrafturl)) {
            $src = local_haccgen_find_user_media_by_name(
                $fs,
                $names,
                (int)$ref['itemid'],
                $draftitemid,
                $fallbackcontextid,
                $fallbackitemid
            );
        }
        if (!$src) {
            if ($isdrafturl || $isowndraft) {
                error_log('local_haccgen_promote_html_media: draft file not in storage ' . substr($decoded, 0, 180));
            }
            return $original;
        }
        $alreadydest = (int)$src->get_contextid() === $destcontextid
            && $src->get_component() === $component
            && $src->get_filearea() === $filearea
            && (int)$src->get_itemid() === $itemid;

        $storedurl = local_haccgen_store_promoted_media(
            $fs,
            $src,
            $destcontextid,
            $component,
            $filearea,
            $itemid,
            $placeholder,
            $alreadydest
        );
        return $storedurl ?? $original;
    }, $html);

    if (is_string($rewritten) && strpos($rewritten, '@@PLUGINFILE@@/') !== false) {
        $rewritten = preg_replace_callback(
            '#@@PLUGINFILE@@/([^"\'?\s<>]+)#',
            static function (array $match) use (
                $fs,
                $destcontextid,
                $component,
                $filearea,
                $itemid,
                $placeholder,
                $fallbackcontextid,
                $fallbackitemid,
                $draftitemid
            ) {
                $rawname = (string)$match[1];
                $names = local_haccgen_promote_filename_candidates([
                    'rawfilename' => $rawname,
                    'filename' => clean_param(urldecode($rawname), PARAM_FILE),
                ]);
                $src = null;
                foreach ($names as $name) {
                    $candidate = $fs->get_file($destcontextid, $component, $filearea, $itemid, '/', $name);
                    if ($candidate && !$candidate->is_directory()) {
                        $src = $candidate;
                        break;
                    }
                }
                if (!$src) {
                    $src = local_haccgen_find_user_media_by_name(
                        $fs,
                        $names,
                        $draftitemid,
                        $draftitemid,
                        $fallbackcontextid,
                        $fallbackitemid
                    );
                }
                if (!$src) {
                    return $match[0];
                }
                $alreadydest = (int)$src->get_contextid() === $destcontextid
                    && $src->get_component() === $component
                    && $src->get_filearea() === $filearea
                    && (int)$src->get_itemid() === $itemid;
                $storedurl = local_haccgen_store_promoted_media(
                    $fs,
                    $src,
                    $destcontextid,
                    $component,
                    $filearea,
                    $itemid,
                    $placeholder,
                    $alreadydest
                );
                return $storedurl ?? $match[0];
            },
            $rewritten
        );
    }

    return is_string($rewritten) ? $rewritten : $html;
}

/**
 * Copy one stored file into the destination area and return the URL to save.
 *
 * @param file_storage $fs
 * @param stored_file $src
 * @param int $destcontextid
 * @param string $component
 * @param string $filearea
 * @param int $itemid
 * @param bool $placeholder
 * @param bool $alreadydest
 * @return string|null Pluginfile URL, @@PLUGINFILE@@ path, or null when the copy failed.
 */
function local_haccgen_store_promoted_media(
    $fs,
    $src,
    int $destcontextid,
    string $component,
    string $filearea,
    int $itemid,
    bool $placeholder,
    bool $alreadydest
): ?string {
    [$destname, $mime] = local_haccgen_durable_media_meta($src);
    if ($destname === '') {
        return null;
    }

    try {
        if (!$alreadydest && !$fs->file_exists($destcontextid, $component, $filearea, $itemid, '/', $destname)) {
            $fs->create_file_from_storedfile([
                'contextid' => $destcontextid,
                'component' => $component,
                'filearea' => $filearea,
                'itemid' => $itemid,
                'filepath' => '/',
                'filename' => $destname,
                'mimetype' => $mime,
            ], $src);
        }
    } catch (Throwable $e) {
        error_log('local_haccgen_promote_html_media: ' . $e->getMessage());
        return null;
    }

    if ($placeholder) {
        return '@@PLUGINFILE@@/' . $destname;
    }

    return moodle_url::make_pluginfile_url(
        $destcontextid,
        $component,
        $filearea,
        $itemid,
        '/',
        $destname,
        false
    )->out(false);
}

/**
 * Find an attached image or media file in this user's drafts or the course uploads.
 *
 * Exact get_file() misses when the editor URL itemid, encoding, or directory
 * does not match the stored record. The filename is still in the user's files.
 *
 * @param file_storage $fs
 * @param string[] $names
 * @param int $urlitemid Item id parsed from the draft URL.
 * @param int $draftitemid Editor draft itemid.
 * @param int $fallbackcontextid
 * @param int $fallbackitemid
 * @return stored_file|null
 */
function local_haccgen_find_user_media_by_name(
    $fs,
    array $names,
    int $urlitemid,
    int $draftitemid,
    int $fallbackcontextid = 0,
    int $fallbackitemid = 0
) {
    global $DB, $USER;

    if (empty($USER->id)) {
        return null;
    }
    $candidates = [];
    foreach ($names as $name) {
        $base = basename(str_replace('\\', '/', (string)$name));
        $base = (string)preg_replace('/[?#].*$/', '', $base);
        foreach ([$base, urldecode($base), rawurldecode($base)] as $variant) {
            $variant = trim((string)$variant);
            if ($variant !== '' && $variant !== '.' && $variant !== '..' && strpbrk($variant, "/\\\0") === false) {
                $candidates[$variant] = true;
            }
        }
    }
    $candidates = array_keys($candidates);
    if (!$candidates) {
        return null;
    }

    $userctxid = context_user::instance($USER->id)->id;
    $prefer = [];
    foreach ([$urlitemid, $draftitemid, local_haccgen_content_editor_draftitemid()] as $id) {
        if ($id > 0) {
            $prefer[$id] = true;
        }
    }

    $areas = [
        [$userctxid, 'user', 'draft', 0],
    ];
    if ($fallbackcontextid > 0) {
        $areas[] = [$fallbackcontextid, LOCAL_HACCGEN_COMPONENT, LOCAL_HACCGEN_FILEAREA, $fallbackitemid];
    }
    $areas[] = [context_system::instance()->id, LOCAL_HACCGEN_COMPONENT, LOCAL_HACCGEN_FILEAREA, (int)$USER->id];

    [$insql, $inparams] = $DB->get_in_or_equal($candidates, SQL_PARAMS_NAMED, 'fn');
    $bestid = 0;
    $bestscore = -1;
    foreach ($areas as $area) {
        [$contextid, $component, $filearea, $preferitem] = $area;
        $params = $inparams;
        $params['ctx'] = $contextid;
        $params['comp'] = $component;
        $params['area'] = $filearea;
        $records = $DB->get_records_select(
            'files',
            "contextid = :ctx AND component = :comp AND filearea = :area AND filename <> '.' AND filename $insql",
            $params,
            'id DESC',
            'id, itemid, filename',
            0,
            30
        );
        foreach ($records as $record) {
            $score = (int)$record->id > 0 ? 1 : 0;
            if ($component === 'user' && isset($prefer[(int)$record->itemid])) {
                $score += 10;
            }
            if ($preferitem > 0 && (int)$record->itemid === $preferitem) {
                $score += 5;
            }
            if ($score > $bestscore) {
                $bestscore = $score;
                $bestid = (int)$record->id;
            }
        }
    }
    if ($bestid <= 0) {
        return null;
    }
    $file = $fs->get_file_by_id($bestid);
    if (!$file || $file->is_directory()) {
        return null;
    }
    return $file;
}

/**
 * Find a video that was already copied out of an expired draft area.
 *
 * @param file_storage $fs
 * @param string $filename
 * @param int $destcontextid
 * @param string $component
 * @param string $filearea
 * @param int $itemid
 * @param int $fallbackcontextid
 * @param int $fallbackitemid
 * @return stored_file|null
 */
function local_haccgen_find_promoted_media(
    $fs,
    string $filename,
    int $destcontextid,
    string $component,
    string $filearea,
    int $itemid,
    int $fallbackcontextid = 0,
    int $fallbackitemid = 0
) {
    $names = [$filename];
    if (preg_match('/\.bin$/i', $filename)) {
        $names[] = (string)preg_replace('/\.bin$/i', '.mp4', $filename);
    }
    $areas = [
        [$destcontextid, $component, $filearea, $itemid],
    ];
    if ($fallbackcontextid > 0) {
        $areas[] = [
            $fallbackcontextid,
            LOCAL_HACCGEN_COMPONENT,
            LOCAL_HACCGEN_FILEAREA,
            $fallbackitemid,
        ];
    }
    foreach ($areas as $area) {
        foreach ($names as $name) {
            if ($name === '') {
                continue;
            }
            $file = $fs->get_file($area[0], $area[1], $area[2], $area[3], '/', $name);
            if ($file && !$file->is_directory()) {
                return $file;
            }
        }
    }
    return null;
}

/**
 * Where promoted editor media is stored.
 *
 * A real course uses the course uploads area. Course id 0 or 1 has no course
 * area, so files are stored for the user in the system context instead.
 * That area is not removed by draft cleanup.
 *
 * @param int $courseid
 * @return array{0:int,1:int}|null [contextid, itemid], or null when nobody is logged in.
 */
function local_haccgen_media_storage_target(int $courseid): ?array {
    global $USER;

    if ($courseid > 1) {
        try {
            return [context_course::instance($courseid)->id, $courseid];
        } catch (Throwable $e) {
            error_log('local_haccgen_media_storage_target: ' . $e->getMessage());
        }
    }
    $userid = (int)($USER->id ?? 0);
    if ($userid <= 0) {
        return null;
    }
    return [context_system::instance()->id, $userid];
}

/**
 * Copy embedded draft media in saved topic HTML into a lasting file area.
 *
 * @param array $topics
 * @param int $courseid
 * @return array
 */
function local_haccgen_promote_topics_media(array $topics, int $courseid): array {
    $target = local_haccgen_media_storage_target($courseid);
    if ($target === null) {
        return $topics;
    }
    [$contextid, $itemid] = $target;

    foreach ($topics as &$topic) {
        if (!is_array($topic)) {
            continue;
        }
        foreach ($topic['subtopics'] ?? [] as &$sub) {
            if (!is_array($sub)) {
                continue;
            }
            $draftitemid = 0;
            if (isset($sub['content']) && is_array($sub['content'])) {
                $draftitemid = (int)($sub['content']['itemid'] ?? 0);
            }
            if ($draftitemid <= 0) {
                $draftitemid = local_haccgen_content_editor_draftitemid();
            }
            if (!empty($sub['content_html']) && is_string($sub['content_html'])) {
                $sub['content_html'] = local_haccgen_promote_html_media(
                    $sub['content_html'],
                    $contextid,
                    LOCAL_HACCGEN_COMPONENT,
                    LOCAL_HACCGEN_FILEAREA,
                    $itemid,
                    false,
                    0,
                    0,
                    $draftitemid
                );
            }
            if (isset($sub['content']) && is_array($sub['content']) && isset($sub['content']['text'])) {
                $sub['content']['text'] = local_haccgen_promote_html_media(
                    (string)$sub['content']['text'],
                    $contextid,
                    LOCAL_HACCGEN_COMPONENT,
                    LOCAL_HACCGEN_FILEAREA,
                    $itemid,
                    false,
                    0,
                    0,
                    $draftitemid
                );
            } else if (isset($sub['content']) && is_string($sub['content'])) {
                $sub['content'] = local_haccgen_promote_html_media(
                    $sub['content'],
                    $contextid,
                    LOCAL_HACCGEN_COMPONENT,
                    LOCAL_HACCGEN_FILEAREA,
                    $itemid,
                    false,
                    0,
                    0,
                    $draftitemid
                );
            }
        }
        unset($sub);
    }
    unset($topic);

    return $topics;
}

/**
 * Remove the language instruction that is appended to a description for the model.
 *
 * @param string $text
 * @return string
 */
function local_haccgen_strip_lang_prompt(string $text): string {
    $text = preg_replace(
        '/\s*\[AI Language\]:[^\r\n]*\r?\n\s*Please generate all content in[^\r\n]*\r?\n\s*examples, UI labels, and tone accordingly\.?\s*/i',
        "\n",
        $text
    );
    $lines = preg_split('/\R/', (string) $text);
    $kept = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }
        if (preg_match('/^examples, UI labels, and tone accordingly\.?$/i', $line)) {
            continue;
        }
        if (preg_match('/^Please generate all content in .+, and localize terminology,?$/i', $line)) {
            continue;
        }
        $kept[] = $line;
    }
    return trim(implode("\n\n", $kept));
}
