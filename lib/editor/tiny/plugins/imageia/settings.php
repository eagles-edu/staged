<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Settings for the tiny_imageia plugin.
 *
 * @package    tiny_imageia
 * @copyright  2026 Miguël Dhyne <miguel.dhyne@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_imageia/apikey',
        get_string('apikey', 'tiny_imageia'),
        get_string('apikey_desc', 'tiny_imageia'),
        ''
    ));

    $settings->add(new admin_setting_heading(
        'tiny_imageia/watermarkheading',
        get_string('watermark_heading', 'tiny_imageia'),
        get_string('watermark_heading_desc', 'tiny_imageia')
    ));

    $settings->add(new admin_setting_configselect(
        'tiny_imageia/watermarkmode',
        get_string('watermarkmode', 'tiny_imageia'),
        get_string('watermarkmode_desc', 'tiny_imageia'),
        'optional_on',
        [
            'disabled' => get_string('watermarkmode_disabled', 'tiny_imageia'),
            'optional_off' => get_string('watermarkmode_optional_off', 'tiny_imageia'),
            'optional_on' => get_string('watermarkmode_optional_on', 'tiny_imageia'),
            'forced' => get_string('watermarkmode_forced', 'tiny_imageia'),
        ]
    ));

    $settings->add(new admin_setting_configtext(
        'tiny_imageia/watermarktext',
        get_string('watermarktext', 'tiny_imageia'),
        get_string('watermarktext_desc', 'tiny_imageia'),
        '',
        PARAM_TEXT,
        60
    ));
}
