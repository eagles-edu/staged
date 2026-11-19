<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify it...
//
// @package    quizaccess_bgwatermark
// @copyright  2026 Dnyaneshwar Karamunge
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later


defined('MOODLE_INTERNAL') || die();

function quizaccess_bgwatermark_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = []) {
    global $CFG;

    // Only system context allowed because watermark stored in system context.
    if ($context->contextlevel != CONTEXT_SYSTEM) {
        return false;
    }

    if ($filearea !== 'watermarkimage') {
        return false;
    }

    $fs = get_file_storage();

    // $args = [itemid, path, filename]
    $itemid = array_shift($args);
    $filepath = '/';
    $filename = array_pop($args);

    if (!empty($args)) {
        $filepath .= implode('/', $args) . '/';
    }

    $file = $fs->get_file($context->id, 'quizaccess_bgwatermark', $filearea, $itemid, $filepath, $filename);

    if (!$file || $file->is_directory()) {
        return false;
    }

    send_stored_file($file, 0, 0, false, $options);
}
