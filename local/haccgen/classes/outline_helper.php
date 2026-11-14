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
 * Helpers for ordered topic outline items (pages + quizzes).
 *
 * @package     local_haccgen
 * @copyright   2026 Dynamicpixel Multimedia Solutions
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_haccgen;

/**
 * Outline ordering utilities for step 4 and course creation.
 */
class outline_helper {
    /**
     * Whether an outline row represents a quiz.
     *
     * @param array $item
     * @return bool
     */
    public static function is_quiz_item(array $item): bool {
        return ($item['type'] ?? 'page') === 'quiz';
    }

    /**
     * Normalize quiz payload shape.
     *
     * @param array $in Raw quiz data.
     * @param string $fallbacktitle Fallback quiz title.
     * @return array|null
     */
    public static function normalize_quiz_data(array $in, string $fallbacktitle = ''): ?array {
        $title = trim((string)($in['quiz_title'] ?? $in['title'] ?? $fallbacktitle));
        $questions = is_array($in['questions'] ?? null) ? $in['questions'] : [];

        $outq = [];
        foreach ($questions as $i => $q) {
            if (!is_array($q)) {
                continue;
            }
            $outq[] = [
                'question_id' => $q['question_id'] ?? ('q' . ($i + 1)),
                'type' => $q['type'] ?? 'multiple_choice',
                'difficulty' => $q['difficulty'] ?? 'easy',
                'question' => (string)($q['question'] ?? ''),
                'options' => array_values(array_map('strval', (array)($q['options'] ?? []))),
                'correct_answer' => (string)($q['correct_answer'] ?? ($q['answer'] ?? '')),
                'explanation' => (string)($q['explanation'] ?? ''),
            ];
        }

        if ($title === '' && empty($outq)) {
            return null;
        }

        if ($title === '') {
            $title = $fallbacktitle !== '' ? $fallbacktitle : 'Quiz';
        }

        $out = [
            'type' => 'quiz',
            'quiz_title' => $title,
            'title' => $title,
            'instructions' => (string)($in['instructions'] ?? ''),
            'questions' => $outq,
        ];
        if (isset($in['total_marks']) && is_numeric($in['total_marks'])) {
            $out['total_marks'] = (float)$in['total_marks'];
        }
        if (array_key_exists('max_attempts', $in) && $in['max_attempts'] !== '' && $in['max_attempts'] !== null) {
            $attempts = self::normalize_max_attempts($in['max_attempts'], false);
            $out['max_attempts'] = $attempts !== null ? $attempts : $in['max_attempts'];
        }
        return $out;
    }

    /**
     * Compact quiz fields for payload and quiz_data storage.
     *
     * @param array $quiz Normalized quiz.
     * @return array
     */
    public static function quiz_storage_fields(array $quiz): array {
        $out = [
            'quiz_title' => (string)($quiz['quiz_title'] ?? $quiz['title'] ?? ''),
            'instructions' => (string)($quiz['instructions'] ?? ''),
            'questions' => $quiz['questions'] ?? [],
        ];
        if (isset($quiz['total_marks']) && is_numeric($quiz['total_marks'])) {
            $out['total_marks'] = (float)$quiz['total_marks'];
        }
        if (array_key_exists('max_attempts', $quiz) && $quiz['max_attempts'] !== '' && $quiz['max_attempts'] !== null) {
            $attempts = self::normalize_max_attempts($quiz['max_attempts'], false);
            $out['max_attempts'] = $attempts !== null ? $attempts : $quiz['max_attempts'];
        }
        return $out;
    }

    /**
     * Normalize max attempts for a quiz.
     *
     * Missing or empty returns 1 when $defaultonmissing is true, otherwise null.
     * Invalid values always return null.
     *
     * @param mixed $value Raw attempt count.
     * @param bool $defaultonmissing Use 1 when the value is missing.
     * @return int|null
     */
    public static function normalize_max_attempts($value, bool $defaultonmissing = true): ?int {
        if ($value === null || $value === '') {
            return $defaultonmissing ? 1 : null;
        }
        if (is_bool($value) || is_array($value) || !is_numeric($value)) {
            return null;
        }
        $asfloat = (float)$value;
        $asint = (int)$value;
        if ($asint < 1 || abs($asfloat - $asint) > 0.0001) {
            return null;
        }
        return $asint;
    }

    /**
     * Total marks and max attempts for the Moodle quiz activity.
     *
     * Per-question marks are total marks divided by the question count.
     *
     * @param array $in Quiz payload.
     * @param int $questioncount Number of questions.
     * @return array{total_marks:float,max_attempts:int}
     */
    public static function extract_quiz_marks(array $in, int $questioncount = 0): array {
        $total = (isset($in['total_marks']) && is_numeric($in['total_marks'])) ? (float)$in['total_marks'] : 0.0;
        if ($total <= 0) {
            $total = $questioncount > 0 ? (float)$questioncount : 10.0;
        }
        $attempts = self::normalize_max_attempts($in['max_attempts'] ?? null, true);
        if ($attempts === null) {
            $attempts = 1;
        }
        return [
            'total_marks' => $total,
            'max_attempts' => $attempts,
        ];
    }

    /**
     * Build ordered outline rows for step 4 UI rendering.
     *
     * @param array $topic Topic record.
     * @return array
     */
    public static function build_outline_items_for_display(array $topic): array {
        $outline = [];
        $quizseen = false;

        foreach ((array)($topic['subtopics'] ?? []) as $sub) {
            if (!is_array($sub)) {
                continue;
            }
            if (self::is_quiz_item($sub)) {
                $quiz = self::normalize_quiz_data($sub, (string)($topic['title'] ?? ''));
                if (!$quiz) {
                    continue;
                }
                $quizseen = true;
                $outline[] = [
                    'is_quiz' => true,
                    'quiz_title' => $quiz['quiz_title'],
                    'quiz_id' => 'quiz_' . md5($quiz['quiz_title']),
                ];
                continue;
            }

            $outline[] = array_merge($sub, ['is_quiz' => false]);
        }

        if (!$quizseen) {
            $quizraw = $topic['quiz_data'] ?? ($topic['quiz'] ?? null);
            if (is_array($quizraw)) {
                $quiz = self::normalize_quiz_data($quizraw, (string)($topic['title'] ?? ''));
                if ($quiz && !empty($quiz['questions'])) {
                    $outline[] = [
                        'is_quiz' => true,
                        'quiz_title' => $quiz['quiz_title'],
                        'quiz_id' => 'quiz_' . md5($quiz['quiz_title']),
                    ];
                }
            }
        }

        return $outline;
    }

    /**
     * Parse a payload topic into ordered subtopics + quiz_data.
     *
     * @param array $t Raw payload topic.
     * @return array
     */
    public static function parse_payload_topic(array $t): array {
        $title = (string)($t['title'] ?? 'Untitled Topic');
        $topic = [
            'title' => $title,
            'subtopics' => [],
        ];

        $quizdata = null;

        foreach ((array)($t['subtopics'] ?? []) as $s) {
            if (!is_array($s)) {
                continue;
            }

            if (self::is_quiz_item($s)) {
                $quiz = self::normalize_quiz_data($s, $title);
                if (!$quiz) {
                    continue;
                }
                $topic['subtopics'][] = $quiz;
                $quizdata = self::quiz_storage_fields($quiz);
                continue;
            }

            $content = $s['content'] ?? [];
            if (!is_array($content)) {
                $content = [
                    'text' => (string)$content,
                    'itemid' => 0,
                ];
            }

            $topic['subtopics'][] = [
                'type' => 'page',
                'title' => (string)($s['title'] ?? 'Untitled Subtopic'),
                'content' => [
                    'text' => (string)($content['text'] ?? ''),
                    'itemid' => (int)($content['itemid'] ?? 0),
                ],
            ];
        }

        $legacyquiz = null;
        if (!$quizdata) {
            $legacyquiz = $t['quiz_data'] ?? ($t['quiz'] ?? null);
        }
        if (!$quizdata && is_array($legacyquiz) && !empty($legacyquiz)) {
            $quiz = self::normalize_quiz_data($legacyquiz, $title);
            if ($quiz) {
                $topic['subtopics'][] = $quiz;
                $quizdata = self::quiz_storage_fields($quiz);
            }
        }

        if ($quizdata) {
            $topic['quiz_included'] = 1;
            $topic['quiz_data'] = $quizdata;
        }

        return $topic;
    }

    /**
     * Return ordered creation sequence for a topic (pages and quizzes).
     *
     * @param array $topic Topic record.
     * @return array<int, array{type:string, sub?:array, quiz_data?:array}>
     */
    public static function get_creation_sequence(array $topic): array {
        $sequence = [];
        $quizseen = false;

        foreach ((array)($topic['subtopics'] ?? []) as $sub) {
            if (!is_array($sub)) {
                continue;
            }
            if (self::is_quiz_item($sub)) {
                $quiz = self::normalize_quiz_data($sub, (string)($topic['title'] ?? ''));
                if (!$quiz) {
                    continue;
                }
                $quizseen = true;
                $sequence[] = [
                    'type' => 'quiz',
                    'quiz_data' => self::quiz_storage_fields($quiz),
                ];
                continue;
            }

            $sequence[] = [
                'type' => 'page',
                'sub' => $sub,
            ];
        }

        if (!$quizseen && !empty($topic['quiz_data']) && is_array($topic['quiz_data'])) {
            $quiz = self::normalize_quiz_data($topic['quiz_data'], (string)($topic['title'] ?? ''));
            if ($quiz) {
                $sequence[] = [
                    'type' => 'quiz',
                    'quiz_data' => self::quiz_storage_fields($quiz),
                ];
            }
        }

        return $sequence;
    }

    /**
     * Count page (non-quiz) subtopics in a topic.
     *
     * @param array $topic Topic record.
     * @return int
     */
    public static function count_page_subtopics(array $topic): int {
        $count = 0;
        foreach ((array)($topic['subtopics'] ?? []) as $sub) {
            if (!is_array($sub) || self::is_quiz_item($sub)) {
                continue;
            }
            $count++;
        }
        return $count;
    }
}

