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

use core_question\local\bank\navigation_node_base;
use core_question\local\bank\view;

/**
 * Plugin entrypoint.
 *
 * @package    qbank_questionchecker
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugin_feature extends \core_question\local\bank\plugin_features_base {
    /**
     * Returns the question actions for the question bank.
     *
     * @param view $qbank The question bank view.
     * @return array An array of question actions.
     */
    public function get_question_actions($qbank): array {
        return [new check_action($qbank)];
    }
}
