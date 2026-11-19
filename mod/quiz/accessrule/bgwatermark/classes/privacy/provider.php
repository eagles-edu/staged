<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify it...
//
// @package    quizaccess_bgwatermark
// @copyright  2026 Dnyaneshwar Karamunge
// @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later

namespace quizaccess_bgwatermark\privacy;

use core_privacy\local\metadata\null_provider;

defined('MOODLE_INTERNAL') || die();

class provider implements null_provider {
    public static function get_reason() : string {
        return 'privacy:metadata';
    }
}