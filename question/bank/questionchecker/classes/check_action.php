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

namespace qbank_questionchecker;

use core_question\local\bank\question_action_base;

/**
 * Class check_action
 *
 * @package    qbank_questionchecker
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class check_action extends question_action_base {
    /**
     * Returns the URL, icon, and label for the action.
     *
     * @param \stdClass $question The question object.
     * @return array An array containing the URL, icon, and label.
     *               If the user does not have permission to view, returns [null, null, null].
     */
    protected function get_url_icon_and_label(\stdClass $question): array {
        if (!question_has_capability_on($question, 'view')) {
            return [null, null, null];
        }

        $params = [
            'questionid' => $question->id,
            'courseid' => $this->qbank->course->id,
            'returnurl' => $this->qbank->returnurl,
        ];

        $url = new \moodle_url('/question/bank/questionchecker/check.php', $params);
        return [$url, 'i/grading', get_string('check', 'qbank_questionchecker')];
    }

    /**
     * Returns the menu position for the action.
     *
     * @return int The position.
     */
    public function get_menu_position(): int {
        return 350;
    }
}
