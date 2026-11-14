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
 * Rewrite editor HTML so attached images and media use pluginfile.php.
 *
 * @package     local_haccgen
 * @copyright   2026 Dynamicpixel Multimedia Solutions
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/local/haccgen/lib.php');

$courseid = required_param('id', PARAM_INT);
$html = required_param('html', PARAM_RAW);
$draftitemid = optional_param('itemid', 0, PARAM_INT);

require_sesskey();

// Course 1 is the site course. Saving against it wrote pluginfile URLs at
// context 2 / itemid 1 while the file itself was stored for the user.
$fallbackcontextid = 0;
$fallbackitemid = 0;
if ($courseid > 1) {
    $course = get_course($courseid);
    require_login($course);
    $context = context_course::instance($courseid);
    require_capability('local/haccgen:manage', $context);
    $fallbackcontextid = $context->id;
    $fallbackitemid = $courseid;
} else {
    require_login();
    $context = $courseid === 1 ? context_course::instance(1) : context_system::instance();
    require_capability('local/haccgen:manage', $context);
}

$target = local_haccgen_media_storage_target($courseid);
if ($target === null) {
    throw new moodle_exception('requireloginerror', 'error');
}
[$contextid, $itemid] = $target;

$rewritten = local_haccgen_promote_html_media(
    (string)$html,
    $contextid,
    LOCAL_HACCGEN_COMPONENT,
    LOCAL_HACCGEN_FILEAREA,
    $itemid,
    false,
    $fallbackcontextid,
    $fallbackitemid,
    $draftitemid
);

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'html' => $rewritten,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
