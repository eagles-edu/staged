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

namespace qbank_questionchecker\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/question/bank/questionchecker/lib.php');

/**
 * Class check_questions
 *
 * @package    qbank_questionchecker
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class check_questions extends external_api {
    /**
     * Returns description of method parameters
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters([
            'questionid' => new external_value(PARAM_INT, 'ID of the question'),
            'contextid' => new external_value(PARAM_INT, 'ID of the context'),
        ]);
    }

    /**
     * Returns description of method result value
     * @return external_value
     */
    public static function execute_returns() {
        return new external_value(PARAM_RAW, 'Result of the check');
    }

    /**
     * Check questions
     * @param object $questionid The ID of the question to check
     * @param object $contextid The ID of the context
     * @return string The result
     */
    public static function execute($questionid, $contextid) {
        $params = self::validate_parameters(self::execute_parameters(), ['questionid' => $questionid, 'contextid' => $contextid]);

        question_require_capability_on($questionid, 'view');

        qbank_questionchecker_require_text_generation();

        $question = \question_bank::load_question($questionid);

        $qtype = $question->qtype->name();

        switch ($qtype) {
            case 'multichoice':
                return self::check_multichoice($question, $contextid);
            case 'essay':
                return self::check_essay($question, $contextid);
            default:
                return get_string('checknotsupported', 'qbank_questionchecker');
        }
    }

    /**
     * Sends the multiple choice question to the AI Provider to see for agreement with the teacher's solution.
     *
     * @param \question_definition $question The question.
     * @param int $contextid The ID of the context.
     *
     * @return string The result.
     */
    private static function check_multichoice($question, $contextid) {
        $questiontext = "Question:\n\n" . strip_tags($question->questiontext) . "\n\nAnswer options:\n\n";

        $answercounter = 0;

        foreach ($question->answers as $a) {
            $answercounter++;
            $questiontext .= "\n{$answercounter}. " . strip_tags($a->answer);
        }

        global $USER;

        $prompt = <<<EOD
        You are a helpful medical teacher. You will be given an existing multiple-choice question
        with answer options. Indicate for each anwer option whether it is correct or wrong. Do not change
        the order or content of the answers. Keep the original language. If the question text contains itself
        options or logical connectors (K-type or complex questions), leave them in. Don't remove any enumeration
        labels or translations from the question text.

        This is the question:
        ---------------------
        {$questiontext}
        ---------------------
        Give your answer in the following JSON format:
        ---------------------
        {
            "answers": [
                {
                    "text": "<Answer option 1>",
                    "correct": true
                },
                {
                    "text": "<Answer option 2>",
                    "correct": false
                },
                ...
            ]
        }
        ---------------------

        Only return valid JSON in the specified format, without any additional text. Make sure the JSON is properly formatted.
        EOD;

        $action = new \core_ai\aiactions\generate_text($contextid, $USER->id, $prompt);
        $manager = \core\di::get(\core_ai\manager::class);
        $response = $manager->process_action($action);

        if (!$response->get_success()) {
            $errorcode = $response->get_errorcode();
            $error = $response->get_errormessage();
            throw new \Exception("Error {$errorcode}: {$error}");
        }

        $generatedcontent = $response->get_response_data()['generatedcontent'];
        // phpcs:ignore moodle.Strings.ForbiddenStrings.Found -- Intentional removal of optional markdown JSON fence from AI output.
        $generatedcontent = trim(str_replace("```", "", str_replace("```json", "", $generatedcontent)));

        // Parse result.
        $data = json_decode($generatedcontent);

        if ($data === null || !isset($data->answers)) {
            throw new \Exception(get_string('checkparsingerror', 'qbank_questionchecker'));
        }

        // Check result.
        if (count($question->answers) != count($data->answers)) {
            throw new \Exception(get_string('checkparsingerror', 'qbank_questionchecker'));
        }

        // Disagreement check.
        $disagreement = false;

        $i = 0;

        foreach ($question->answers as $a) {
            $evalteacher = $a->fraction > 0;
            $evalai = $data->answers[$i]->correct;

            if ($evalteacher != $evalai) {
                $disagreement = true;
            }

            $i++;
        }

        if (!$disagreement) {
            // AI agrees.
            $answer = '**' . get_string('checkagree', 'qbank_questionchecker') . '**';
        } else {
            // AI disagrees.
            $prompt = "You are a helpful medical teacher. You previously answered a multiple-choice question, ";
            $prompt .= "but your answer differs from the teacher's solution.";
            $prompt .= "\n\nQuestion:\n\n" . strip_tags($question->questiontext) . "\n\n";

            $prompt .= "The teacher's solution:\n\n";

            $answercounter = 0;

            foreach ($question->answers as $a) {
                $answercounter++;
                $r = $a->fraction > 0 ? 'correct' : 'wrong';
                $prompt .= "\n{$answercounter}. " . strip_tags($a->answer) . " ({$r})";
            }

            $prompt .= "\n\nYour answer:\n\n";

            $answercounter = 0;

            foreach ($data->answers as $a) {
                $answercounter++;
                $r = $a->correct ? 'correct' : 'wrong';
                $prompt .= "\n{$answercounter}. {$a->text} ({$r})";
            }

            $prompt .= "\n\nExplain why you disagree. Provide your explanation in the same language as the question.";

            // Ask AI for an explanation regarding the disagreement.
            $action = new \core_ai\aiactions\generate_text($contextid, $USER->id, $prompt);
            $manager = \core\di::get(\core_ai\manager::class);
            $response = $manager->process_action($action);

            if (!$response->get_success()) {
                $errorcode = $response->get_errorcode();
                $error = $response->get_errormessage();
                throw new \Exception("Error {$errorcode}: {$error}");
            }

            $answer = "**" . get_string('checkinitialchoice', 'qbank_questionchecker') . "**\n\n";

            $answercounter = 0;

            foreach ($data->answers as $a) {
                $answercounter++;
                $r = $a->correct ? '✅' : '❌';
                $answer .= "\n{$answercounter}. {$a->text} ({$r})";
            }

            $answer .= "\n\n**" . get_string('checkdisagreement', 'qbank_questionchecker');
            $answer .= "**\n\n" . $response->get_response_data()['generatedcontent'];
        }

        return self::output($answer, $question);
    }

    /**
     * Sends the essay question to the AI Provider to generate an answer.
     *
     * @param \question_definition $question The question.
     * @param int $contextid The ID of the context.
     *
     * @return string The answer.
     */
    private static function check_essay($question, $contextid) {
        $questiontext = strip_tags($question->questiontext);

        global $USER;

        $prompt = <<<EOD
        You are a brilliant medical student.

        Answer the following exam question in a concise yet complete way. Provide the answer in the same language as the question.

        This is the question:
        ---------------------
        {$questiontext}
        ---------------------
        EOD;

        $action = new \core_ai\aiactions\generate_text($contextid, $USER->id, $prompt);
        $manager = \core\di::get(\core_ai\manager::class);
        $response = $manager->process_action($action);

        if (!$response->get_success()) {
            $errorcode = $response->get_errorcode();
            $error = $response->get_errormessage();
            throw new \Exception("Error {$errorcode}: {$error}");
        }

        $answer = "✏️ **" . get_string('checkreturn', 'qbank_questionchecker');
        $answer .= "**\n\n" . $response->get_response_data()['generatedcontent'];

        return self::output($answer, $question);
    }

    /**
     * Outputs the answer regarding the question in Markdown format.
     *
     * @param string $answer The answer from the AI provider.
     * @param \question_definition $question The question.
     *
     * @return string The formatted string.
     */
    private static function output($answer, $question) {
        // Necessary for using format_text.
        global $PAGE;
        $context = \context::instance_by_id($question->contextid);
        $PAGE->set_context($context);

        return format_text($answer, FORMAT_MARKDOWN, $question->contextid);
    }
}
