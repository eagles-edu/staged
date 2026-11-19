<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify it...
//
// @package    quizaccess_bgwatermark
// @copyright  2026 Dnyaneshwar Karamunge
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later


use mod_quiz\local\access_rule_base;
use mod_quiz\quiz_settings;

class quizaccess_bgwatermark extends access_rule_base {

     public static function make(mod_quiz\quiz_settings $quizobj, $timenow, $canignoretimelimits) {
        // Return an instance so the rule is available in the UI for the quiz.
        return new self($quizobj, $timenow);
    }

    public function description() {
        return get_string('pluginname_desc', 'quizaccess_bgwatermark');
    }


    public function prevent_access() {
        return false;
    }

    public function get_link_encouraging_resume($attempt) {
        return '';
    }

    public function setup_attempt_page($page) {
        global $CFG, $PAGE;

        // Prepare params for JS.
        $params = array(
            'disable_rightclick' => get_config('quizaccess_bgwatermark', 'disable_rightclick'),
            'disable_devtools' => get_config('quizaccess_bgwatermark', 'disable_devtools'),
            'opacity' => get_config('quizaccess_bgwatermark', 'opacity') ?: 0.12,
            'apply_to_question_area' => get_config('quizaccess_bgwatermark','apply_to_question_area'),
            'security_message' => get_string('securitymodeenabled', 'quizaccess_bgwatermark'),
        );

        // Try to fetch stored watermark file URL.
        $fs = get_file_storage();
        $context = context_system::instance();
        $files = $fs->get_area_files($context->id, 'quizaccess_bgwatermark', 'watermarkimage', 0, 'timemodified', false);
        if ($files) {
            $file = reset($files);
            $watermarkurl = moodle_url::make_pluginfile_url($file->get_contextid(), $file->get_component(), $file->get_filearea(), $file->get_itemid(), $file->get_filepath(), $file->get_filename());
            $params['watermarkurl'] = $watermarkurl->out(false);
        }

        $PAGE->requires->js_call_amd('quizaccess_bgwatermark/bgwatermark', 'init', array($params));
    }
}
