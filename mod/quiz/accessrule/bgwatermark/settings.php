<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify it...
//
// @package    quizaccess_bgwatermark
// @copyright  2026 Dnyaneshwar Karamunge
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later


defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('quizaccess_bgwatermark_settings', get_string('settingsheading', 'quizaccess_bgwatermark'));

    // Image upload setting.
    $name = 'quizaccess_bgwatermark/watermarkfile';
    $title = get_string('watermarkfile', 'quizaccess_bgwatermark');
    $description = get_string('watermarkfile_help', 'quizaccess_bgwatermark');
    $setting = new admin_setting_configstoredfile($name, $title, $description, 'watermarkimage', 0, array('maxbytes' => 1024*1024, 'accepted_types' => array('gif','jpg','jpeg','png','svg')));
    $settings->add($setting);

    // Opacity
    $settings->add(new admin_setting_configtext('quizaccess_bgwatermark/opacity', get_string('opacity','quizaccess_bgwatermark'), get_string('opacity_help','quizaccess_bgwatermark'), '0.12', PARAM_FLOAT));

    // Disable right click
    $settings->add(new admin_setting_configcheckbox('quizaccess_bgwatermark/disable_rightclick', get_string('disable_rightclick','quizaccess_bgwatermark'), '', 1));

    // Disable devtools
    $settings->add(new admin_setting_configcheckbox('quizaccess_bgwatermark/disable_devtools', get_string('disable_devtools','quizaccess_bgwatermark'), '', 0));

    // Apply to question area
    $settings->add(new admin_setting_configcheckbox('quizaccess_bgwatermark/apply_to_question_area', get_string('apply_to_question_area','quizaccess_bgwatermark'), '', 1));

    $ADMIN->add('modquiz', $settings);
}
