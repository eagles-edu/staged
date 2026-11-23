<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Message provider definitions for block_mwa_dashboard.
 *
 * @package    block_mwa_dashboard
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$messageproviders = [
    // Pedagogical intervention messages sent by teachers.
    'intervention' => [
        'defaults' => [
            'popup' => MESSAGE_PERMITTED + MESSAGE_DEFAULT_ENABLED,
            'email' => MESSAGE_DISALLOWED,
        ],
    ],
    // New posts, submissions and attempts in activities monitored by a teacher.
    'activitywatch' => [
        'defaults' => [
            'popup' => MESSAGE_PERMITTED + MESSAGE_DEFAULT_ENABLED,
            // Email is sent explicitly for monitored activities. Keeping the
            // processor disabled prevents duplicate copies.
            'email' => MESSAGE_DISALLOWED,
        ],
    ],
];
