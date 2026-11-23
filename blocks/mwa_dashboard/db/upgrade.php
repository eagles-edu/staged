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
 * Upgrade steps for block_mwa_dashboard.
 *
 * @package    block_mwa_dashboard
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Execute block_mwa_dashboard upgrade from the given old version.
 *
 * @param int $oldversion The version we are upgrading from.
 * @return bool true on success.
 */
function xmldb_block_mwa_dashboard_upgrade($oldversion) {
    global $DB, $CFG;

    $dbman = $DB->get_manager();

    if ($oldversion < 2026070700) {
        // Create the plugin's own log table.
        $table = new xmldb_table('block_mwa_dashboard_log');

        $table->add_field('id',                  XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid',            XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('userid',              XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('component',           XMLDB_TYPE_CHAR,   '100', null, XMLDB_NOTNULL);
        $table->add_field('action',              XMLDB_TYPE_CHAR,   '100', null, XMLDB_NOTNULL);
        $table->add_field('contextinstanceid',   XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timecreated',         XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('origin',              XMLDB_TYPE_CHAR,    '10');
        $table->add_field('ip',                  XMLDB_TYPE_CHAR,    '45');

        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        $table->add_index('ix_course_time', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'timecreated']);
        $table->add_index('ix_course_user', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'userid']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_block_savepoint(true, 2026070700, 'mwa_dashboard');
    }

    if ($oldversion < 2026070915) {
        // Create the pedagogical intervention messages table.
        $table = new xmldb_table('block_mwa_dashboard_messages');

        $table->add_field('id',                  XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid',            XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
        $table->add_field('userid',              XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
        $table->add_field('teacherid',           XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
        $table->add_field('subject',             XMLDB_TYPE_CHAR,    '255', null, XMLDB_NOTNULL);
        $table->add_field('message',             XMLDB_TYPE_TEXT,      null, null, XMLDB_NOTNULL);
        $table->add_field('timesent',            XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
        $table->add_field('status',              XMLDB_TYPE_CHAR,     '20',  null, XMLDB_NOTNULL, null, 'sent');
        $table->add_field('ai_generated',        XMLDB_TYPE_INTEGER,   '1',  null, XMLDB_NOTNULL, null, '0');
        $table->add_field('intervention_reason', XMLDB_TYPE_CHAR,    '100');
        $table->add_field('moodle_msgid',        XMLDB_TYPE_INTEGER,  '10');

        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ix_course_teacher', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'teacherid']);
        $table->add_index('ix_course_student', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'userid']);
        $table->add_index('ix_timesent',       XMLDB_INDEX_NOTUNIQUE, ['timesent']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_block_savepoint(true, 2026070915, 'mwa_dashboard');
    }

    if ($oldversion < 2026070916) {
        // No schema changes — version bump forces Moodle to re-read services.php
        // and register block_mwa_dashboard_delete_intervention.
        upgrade_block_savepoint(true, 2026070916, 'mwa_dashboard');
    }

    if ($oldversion < 2026071102) {
        // FRANK002 fix: rename block_mwa_messages → block_mwa_dashboard_messages
        // to comply with Frankenstyle table naming (plugintype_pluginname_tablename).
        $oldtable = new xmldb_table('block_mwa_messages');
        $newtable = new xmldb_table('block_mwa_dashboard_messages');

        if ($dbman->table_exists($oldtable) && !$dbman->table_exists($newtable)) {
            $dbman->rename_table($oldtable, 'block_mwa_dashboard_messages');
        } else if (!$dbman->table_exists($newtable)) {
            // Fresh install path — table may not exist yet; create it.
            $newtable->add_field('id',                  XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
            $newtable->add_field('courseid',            XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
            $newtable->add_field('userid',              XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
            $newtable->add_field('teacherid',           XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
            $newtable->add_field('subject',             XMLDB_TYPE_CHAR,    '255', null, XMLDB_NOTNULL);
            $newtable->add_field('message',             XMLDB_TYPE_TEXT,      null, null, XMLDB_NOTNULL);
            $newtable->add_field('timesent',            XMLDB_TYPE_INTEGER,  '10',  null, XMLDB_NOTNULL);
            $newtable->add_field('status',              XMLDB_TYPE_CHAR,     '20',  null, XMLDB_NOTNULL, null, 'sent');
            $newtable->add_field('ai_generated',        XMLDB_TYPE_INTEGER,   '1',  null, XMLDB_NOTNULL, null, '0');
            $newtable->add_field('intervention_reason', XMLDB_TYPE_CHAR,    '100');
            $newtable->add_field('moodle_msgid',        XMLDB_TYPE_INTEGER,  '10');
            $newtable->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
            $newtable->add_index('ix_course_teacher', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'teacherid']);
            $newtable->add_index('ix_course_student', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'userid']);
            $newtable->add_index('ix_timesent',       XMLDB_INDEX_NOTUNIQUE, ['timesent']);
            $dbman->create_table($newtable);
        }

        upgrade_block_savepoint(true, 2026071102, 'mwa_dashboard');
    }

    if ($oldversion < 2026071210) {
        // JS004 fix: template-based rendering update. Also ensure the message
        // table has the send_type field when upgrading from older builds.
        $table = new xmldb_table('block_mwa_dashboard_messages');
        $field = new xmldb_field('send_type', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'moodle');

        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        upgrade_block_savepoint(true, 2026071210, 'mwa_dashboard');
    }

    if ($oldversion < 2026072941) {
        // Store private teacher notes attached to each intervention record.
        $table = new xmldb_table('block_mwa_dashboard_messages');
        $notefield = new xmldb_field('teacher_note', XMLDB_TYPE_TEXT, null, null, null);
        $updatedfield = new xmldb_field('teacher_note_updated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');

        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $notefield)) {
            $dbman->add_field($table, $notefield);
        }

        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $updatedfield)) {
            $dbman->add_field($table, $updatedfield);
        }

        upgrade_block_savepoint(true, 2026072941, 'mwa_dashboard');
    }

    if ($oldversion < 2026073116) {
        // Store tracked activity/resource targets selected in intervention messages.
        $table = new xmldb_table('block_mwa_dashboard_messages');
        $targettypefield = new xmldb_field('target_type', XMLDB_TYPE_CHAR, '30', null, null);
        $targetitemsfield = new xmldb_field('target_items', XMLDB_TYPE_TEXT, null, null, null);

        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $targettypefield)) {
            $dbman->add_field($table, $targettypefield);
        }

        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $targetitemsfield)) {
            $dbman->add_field($table, $targetitemsfield);
        }

        upgrade_block_savepoint(true, 2026073116, 'mwa_dashboard');
    }

    if ($oldversion < 2026080814) {
        $table = new xmldb_table('block_mwa_dashboard_snapshot');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('interventionid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('reason', XMLDB_TYPE_CHAR, '100', null, XMLDB_NOTNULL);
        $table->add_field('situation', XMLDB_TYPE_TEXT, null, null, null);
        $table->add_field('actiontaken', XMLDB_TYPE_TEXT, null, null, null);
        $table->add_field('objective', XMLDB_TYPE_TEXT, null, null, null);
        $table->add_field('snapshotdata', XMLDB_TYPE_TEXT, null, null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_key('fk_intervention', XMLDB_KEY_FOREIGN_UNIQUE, ['interventionid'],
            'block_mwa_dashboard_messages', ['id']);
        $table->add_index('ix_course_user', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'userid']);
        $table->add_index('ix_timecreated', XMLDB_INDEX_NOTUNIQUE, ['timecreated']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026080814, 'mwa_dashboard');
    }

    if ($oldversion < 2026081020) {
        // Data minimisation: IP addresses are not needed by dashboard indicators.
        $table = new xmldb_table('block_mwa_dashboard_log');
        $field = new xmldb_field('ip');
        if ($dbman->table_exists($table) && $dbman->field_exists($table, $field)) {
            $dbman->drop_field($table, $field);
        }
        upgrade_block_savepoint(true, 2026081020, 'mwa_dashboard');
    }

    if ($oldversion < 2026081025) {
        // Remove intermediary-server configuration and require a provider key.
        unset_config('ia_endpoint', 'block_mwa_dashboard');
        unset_config('ia_apikey', 'block_mwa_dashboard');

        $provider = (string)get_config('block_mwa_dashboard', 'ia_provider');
        if ($provider === 'claude') {
            set_config('ia_provider', 'anthropic', 'block_mwa_dashboard');
        } else if (!in_array($provider, ['deepseek', 'openai', 'gemini', 'anthropic'], true)) {
            set_config('ia_provider', 'deepseek', 'block_mwa_dashboard');
        }
        set_config('ia_model', 'recommended', 'block_mwa_dashboard');

        upgrade_block_savepoint(true, 2026081025, 'mwa_dashboard');
    }

    if ($oldversion < 2026081027) {
        // Institutional providers use dedicated credentials and are opt-in.
        set_config('ia_institutional_private', 0, 'block_mwa_dashboard');
        upgrade_block_savepoint(true, 2026081027, 'mwa_dashboard');
    }

    if ($oldversion < 2026081028) {
        // Final transport allowlist and direct-identifier rejection for AI requests.
        upgrade_block_savepoint(true, 2026081028, 'mwa_dashboard');
    }

    if ($oldversion < 2026081029) {
        // Establish the first rotation timestamp without retaining previous credentials.
        if (trim((string)get_config('block_mwa_dashboard', 'ia_apikey')) !== '' &&
                !(int)get_config('block_mwa_dashboard', 'apikey_lastrotated')) {
            set_config('apikey_lastrotated', time(), 'block_mwa_dashboard');
        }
        if (trim((string)get_config('block_mwa_dashboard', 'ia_institutional_apikey')) !== '' &&
                !(int)get_config('block_mwa_dashboard', 'ia_institutional_apikey_lastrotated')) {
            set_config('ia_institutional_apikey_lastrotated', time(), 'block_mwa_dashboard');
        }
        upgrade_block_savepoint(true, 2026081029, 'mwa_dashboard');
    }

    if ($oldversion < 2026081030) {
        // Automated privacy regression tests accompany the hardened transport filter.
        upgrade_block_savepoint(true, 2026081030, 'mwa_dashboard');
    }

    if ($oldversion < 2026081031) {
        $table = new xmldb_table('block_mwa_dashboard_aiaudit');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('operation', XMLDB_TYPE_CHAR, '40', null, XMLDB_NOTNULL);
        $table->add_field('purpose', XMLDB_TYPE_CHAR, '100', null, XMLDB_NOTNULL);
        $table->add_field('provider', XMLDB_TYPE_CHAR, '30', null, XMLDB_NOTNULL);
        $table->add_field('endpoint', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('categories', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ix_user_time', XMLDB_INDEX_NOTUNIQUE, ['userid', 'timecreated']);
        $table->add_index('ix_course_time', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'timecreated']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026081031, 'mwa_dashboard');
    }

    if ($oldversion < 2026081032) {
        // Rename credential config keys to remove 'apikey' terminology.
        $migrations = [
            'ia_apikey' => 'ia_provider_credential',
            'apikey_lastrotated' => 'ia_credential_lastrotated',
            'ia_institutional_apikey' => 'ia_institutional_credential',
            'ia_institutional_apikey_lastrotated' => 'ia_institutional_credential_lastrotated',
        ];
        foreach ($migrations as $old => $new) {
            $value = get_config('block_mwa_dashboard', $old);
            if ($value !== false) {
                set_config($new, $value, 'block_mwa_dashboard');
                unset_config($old, 'block_mwa_dashboard');
            }
        }
        upgrade_block_savepoint(true, 2026081032, 'mwa_dashboard');
    }


    if ($oldversion < 2026081078) {
        // Repair AI audit storage for sites upgraded through intermediate development builds.
        // Some installations can have a plugin version newer than the original audit-table
        // migration while the table itself is absent. This makes a successful AI response
        // appear as "Error writing to database" when the audit metadata is recorded.
        $table = new xmldb_table('block_mwa_dashboard_aiaudit');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('operation', XMLDB_TYPE_CHAR, '40', null, XMLDB_NOTNULL);
        $table->add_field('purpose', XMLDB_TYPE_CHAR, '100', null, XMLDB_NOTNULL);
        $table->add_field('provider', XMLDB_TYPE_CHAR, '30', null, XMLDB_NOTNULL);
        $table->add_field('endpoint', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('categories', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ix_user_time', XMLDB_INDEX_NOTUNIQUE, ['userid', 'timecreated']);
        $table->add_index('ix_course_time', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'timecreated']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026081078, 'mwa_dashboard');
    }

    if ($oldversion < 2026081080) {
        // Re-check audit storage after the 1.0.78 repair. AI functionality itself is
        // non-blocking if audit persistence is temporarily unavailable.
        $table = new xmldb_table('block_mwa_dashboard_aiaudit');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('operation', XMLDB_TYPE_CHAR, '40', null, XMLDB_NOTNULL);
        $table->add_field('purpose', XMLDB_TYPE_CHAR, '100', null, XMLDB_NOTNULL);
        $table->add_field('provider', XMLDB_TYPE_CHAR, '30', null, XMLDB_NOTNULL);
        $table->add_field('endpoint', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('categories', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ix_user_time', XMLDB_INDEX_NOTUNIQUE, ['userid', 'timecreated']);
        $table->add_index('ix_course_time', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'timecreated']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026081080, 'mwa_dashboard');
    }

    if ($oldversion < 2026081204) {
        // Optimise per-student log queries constrained and ordered by time.
        $table = new xmldb_table('block_mwa_dashboard_log');
        $index = new xmldb_index(
            'ix_course_user_time',
            XMLDB_INDEX_NOTUNIQUE,
            ['courseid', 'userid', 'timecreated']
        );
        if ($dbman->table_exists($table) && !$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }
        upgrade_block_savepoint(true, 2026081204, 'mwa_dashboard');
    }

    if ($oldversion < 2026081300) {
        // Store explicit, per-course consent for event capture. Existing
        // courses intentionally remain disabled until a block is configured.
        $table = new xmldb_table('block_mwa_dashboard_course');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('enabled', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_key('fk_course', XMLDB_KEY_FOREIGN_UNIQUE, ['courseid'], 'course', ['id']);

        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        upgrade_block_savepoint(true, 2026081300, 'mwa_dashboard');
    }

    if ($oldversion < 2026081510) {
        // Re-apply message provider defaults so Moodle-only intervention delivery
        // uses the block popup notification and never the email processor.
        require_once($CFG->libdir . '/messagelib.php');
        message_update_providers('block_mwa_dashboard');
        upgrade_block_savepoint(true, 2026081510, 'mwa_dashboard');
    }

    if ($oldversion < 2026081522) {
        // Allow the standard non-editing teacher role to manage pedagogical interventions.
        $systemcontext = context_system::instance();
        foreach (get_archetype_roles('teacher') as $role) {
            assign_capability(
                'block/mwa_dashboard:manageinterventions',
                CAP_ALLOW,
                $role->id,
                $systemcontext->id,
                true
            );
        }
        upgrade_block_savepoint(true, 2026081522, 'mwa_dashboard');
    }

    if ($oldversion < 2026081524) {
        $table = new xmldb_table('block_mwa_dashboard_course');
        $field = new xmldb_field('excludedcmids', XMLDB_TYPE_TEXT, null, null, null, null, null, 'enabled');
        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_block_savepoint(true, 2026081524, 'mwa_dashboard');
    }

    if ($oldversion < 2026082701) {
        $table = new xmldb_table('block_mwa_dashboard_course');
        $field = new xmldb_field('approvalgrade', XMLDB_TYPE_INTEGER, '3', null, XMLDB_NOTNULL, null, '60', 'enabled');
        if ($dbman->table_exists($table) && !$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }
        upgrade_block_savepoint(true, 2026082701, 'mwa_dashboard');
    }

    if ($oldversion < 2026082721) {
        // Capability archetypes in access.php are applied automatically only
        // during installation. Synchronise existing standard non-editing
        // teacher roles so upgraded sites can open and use the dashboard too.
        $systemcontext = context_system::instance();
        foreach (get_archetype_roles('teacher') as $role) {
            foreach ([
                'block/mwa_dashboard:view',
                'block/mwa_dashboard:useai',
                'block/mwa_dashboard:manageinterventions',
            ] as $capability) {
                assign_capability(
                    $capability,
                    CAP_ALLOW,
                    $role->id,
                    $systemcontext->id,
                    true
                );
            }
        }
        accesslib_clear_all_caches(true);
        upgrade_block_savepoint(true, 2026082721, 'mwa_dashboard');
    }

    if ($oldversion < 2026100711) {
        $table = new xmldb_table('block_mwa_dashboard_watch');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('cmid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('enabled', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '1');
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ux_user_cm', XMLDB_INDEX_UNIQUE, ['userid', 'cmid']);
        $table->add_index('ix_course_cm', XMLDB_INDEX_NOTUNIQUE, ['courseid', 'cmid']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        require_once($CFG->libdir . '/messagelib.php');
        message_update_providers('block_mwa_dashboard');
        upgrade_block_savepoint(true, 2026100711, 'mwa_dashboard');
    }

    if ($oldversion < 2026100712) {
        // Re-register the notification provider on sites that installed the
        // first monitoring build before its delivery correction.
        require_once($CFG->libdir . '/messagelib.php');
        message_update_providers('block_mwa_dashboard');
        upgrade_block_savepoint(true, 2026100712, 'mwa_dashboard');
    }

    if ($oldversion < 2026100713) {
        // Activity monitoring now delivers email directly after the event;
        // disable the generic email processor to prevent duplicate copies.
        require_once($CFG->libdir . '/messagelib.php');
        message_update_providers('block_mwa_dashboard');
        upgrade_block_savepoint(true, 2026100713, 'mwa_dashboard');
    }

    if ($oldversion < 2026100714) {
        // Register the complete activity event set, including first forum
        // discussions and assignments that save without a final submit action.
        upgrade_block_savepoint(true, 2026100714, 'mwa_dashboard');
    }

    if ($oldversion < 2026100715) {
        // Client compatibility fix for Moodle AJAX promises without finally().
        upgrade_block_savepoint(true, 2026100715, 'mwa_dashboard');
    }

    if ($oldversion < 2026100716) {
        // Expose per-teacher monitoring controls directly on activity cards.
        upgrade_block_savepoint(true, 2026100716, 'mwa_dashboard');
    }

    if ($oldversion < 2026100717) {
        $table = new xmldb_table('block_mwa_dashboard_chatstate');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('teacherid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('studentid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'open');
        $table->add_field('archived', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ux_course_teacher_student', XMLDB_INDEX_UNIQUE, ['courseid', 'teacherid', 'studentid']);
        $table->add_index('ix_teacher_status', XMLDB_INDEX_NOTUNIQUE, ['teacherid', 'status', 'archived']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026100717, 'mwa_dashboard');
    }

    if ($oldversion < 2026100718) {
        // Compact chat header and quoted-message presentation.
        upgrade_block_savepoint(true, 2026100718, 'mwa_dashboard');
    }

    if ($oldversion < 2026100719) {
        $table = new xmldb_table('block_mwa_dashboard_chatquote');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('messageid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('quotedmessageid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('teacherid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ux_message', XMLDB_INDEX_UNIQUE, ['messageid']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026100719, 'mwa_dashboard');
    }

    if ($oldversion < 2026100720) {
        // Public maintenance release 4.7.1.
        upgrade_block_savepoint(true, 2026100720, 'mwa_dashboard');
    }

    if ($oldversion < 2026100721) {
        // Harden institutional AI input, optimize the Moodle inbox queries,
        // and align the chat source with Moodle coding standards.
        upgrade_block_savepoint(true, 2026100721, 'mwa_dashboard');
    }

    if ($oldversion < 2026101300) {
        // Preload message read actions and quote previews in bulk.
        upgrade_block_savepoint(true, 2026101300, 'mwa_dashboard');
    }

    if ($oldversion < 2026101301) {
        // Complete the Moodle language-string migration for the message search.
        upgrade_block_savepoint(true, 2026101301, 'mwa_dashboard');
    }

    if ($oldversion < 2026101302) {
        // Refine the academic-context panel in Moodle Messages.
        upgrade_block_savepoint(true, 2026101302, 'mwa_dashboard');
    }

    if ($oldversion < 2026101303) {
        // Present the inbox and open conversation as white cards on the shared blue canvas.
        upgrade_block_savepoint(true, 2026101303, 'mwa_dashboard');
    }

    if ($oldversion < 2026101304) {
        // Detect current Database activity records as submitted work awaiting grading.
        upgrade_block_savepoint(true, 2026101304, 'mwa_dashboard');
    }

    if ($oldversion < 2026101305) {
        // Consolidate assignment submission subplugins in the Assignment event bucket.
        upgrade_block_savepoint(true, 2026101305, 'mwa_dashboard');
    }

    if ($oldversion < 2026101306) {
        // Final documented build of the 4.7.1 maintenance release.
        upgrade_block_savepoint(true, 2026101306, 'mwa_dashboard');
    }

    if ($oldversion < 2026101400) {
        // Replace the bulk-message progress bar with an overlaid animated status card.
        upgrade_block_savepoint(true, 2026101400, 'mwa_dashboard');
    }

    if ($oldversion < 2026101401) {
        // Simplify the bulk-message form when the Other reason is selected.
        upgrade_block_savepoint(true, 2026101401, 'mwa_dashboard');
    }

    if ($oldversion < 2026101402) {
        // Show dismissible bulk-message delivery errors with per-student details.
        upgrade_block_savepoint(true, 2026101402, 'mwa_dashboard');
    }

    if ($oldversion < 2026101403) {
        // Use the browser timer when automatically dismissing successful bulk-message status.
        upgrade_block_savepoint(true, 2026101403, 'mwa_dashboard');
    }

    if ($oldversion < 2026101404) {
        // Add unread-message and awaiting-grading KPIs to the Action Center.
        upgrade_block_savepoint(true, 2026101404, 'mwa_dashboard');
    }

    if ($oldversion < 2026101405) {
        // Group Moodle Messages under the Follow-up navigation section.
        upgrade_block_savepoint(true, 2026101405, 'mwa_dashboard');
    }

    if ($oldversion < 2026101406) {
        // Simplify the Action Center to the five operational KPIs.
        upgrade_block_savepoint(true, 2026101406, 'mwa_dashboard');
    }

    if ($oldversion < 2026101407) {
        // Open the class list filtered to students whose submissions await grading.
        upgrade_block_savepoint(true, 2026101407, 'mwa_dashboard');
    }

    if ($oldversion < 2026101408) {
        // Prevent the Action Center KPI row from clipping help tooltips.
        upgrade_block_savepoint(true, 2026101408, 'mwa_dashboard');
    }

    if ($oldversion < 2026101426) {
        $table = new xmldb_table('block_mwa_dashboard_notice');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('courseid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('teacherid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('studentid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('noticekey', XMLDB_TYPE_CHAR, '255', null, XMLDB_NOTNULL);
        $table->add_field('kind', XMLDB_TYPE_CHAR, '40', null, XMLDB_NOTNULL);
        $table->add_field('payload', XMLDB_TYPE_TEXT, null, null, XMLDB_NOTNULL);
        $table->add_field('status', XMLDB_TYPE_CHAR, '20', null, XMLDB_NOTNULL, null, 'active');
        $table->add_field('resolution', XMLDB_TYPE_CHAR, '30', null, null);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('timeresolved', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_index('ux_teacher_course_notice', XMLDB_INDEX_UNIQUE, ['teacherid', 'courseid', 'noticekey']);
        $table->add_index('ix_teacher_course_status', XMLDB_INDEX_NOTUNIQUE, ['teacherid', 'courseid', 'status']);
        $table->add_index('ix_student_kind', XMLDB_INDEX_NOTUNIQUE, ['studentid', 'kind']);
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        upgrade_block_savepoint(true, 2026101426, 'mwa_dashboard');
    }

    if ($oldversion < 2026101427) {
        // Align Action Center labels and card border styling.
        upgrade_block_savepoint(true, 2026101427, 'mwa_dashboard');
    }

    if ($oldversion < 2026101428) {
        // Add notice KPI icons and contextual class-list filter visibility.
        upgrade_block_savepoint(true, 2026101428, 'mwa_dashboard');
    }

    if ($oldversion < 2026101429) {
        // Improve retention drill-down and remove the obsolete class-list filter.
        upgrade_block_savepoint(true, 2026101429, 'mwa_dashboard');
    }

    if ($oldversion < 2026101430) {
        // Align notice colors and refine the retention message shortcut.
        upgrade_block_savepoint(true, 2026101430, 'mwa_dashboard');
    }

    if ($oldversion < 2026101431) {
        // Prevent Moodle message search and filter controls from being clipped.
        upgrade_block_savepoint(true, 2026101431, 'mwa_dashboard');
    }

    if ($oldversion < 2026101432) {
        // Clarify the notices card help text.
        upgrade_block_savepoint(true, 2026101432, 'mwa_dashboard');
    }

    if ($oldversion < 2026101433) {
        // Release 4.7.2 documentation and package metadata.
        upgrade_block_savepoint(true, 2026101433, 'mwa_dashboard');
    }

    if ($oldversion < 2026101434) {
        // Rebuild AMD artifacts, use notice templates and remove notice-history N+1 queries.
        upgrade_block_savepoint(true, 2026101434, 'mwa_dashboard');
    }

    if ($oldversion < 2026101435) {
        // Standardize notice KPI interactions and add the Moodle chat emoji picker.
        upgrade_block_savepoint(true, 2026101435, 'mwa_dashboard');
    }

    if ($oldversion < 2026101436) {
        // Use the language API exclusively for the emoji picker label.
        upgrade_block_savepoint(true, 2026101436, 'mwa_dashboard');
    }

    if ($oldversion < 2026101437) {
        // Show notice KPI accent colors only during hover.
        upgrade_block_savepoint(true, 2026101437, 'mwa_dashboard');
    }

    if ($oldversion < 2026101438) {
        // Split expensive logs and grades requests to prevent batched HTTP 503 failures.
        upgrade_block_savepoint(true, 2026101438, 'mwa_dashboard');
    }

    if ($oldversion < 2026101439) {
        // Refine retention labels and remove colored side borders from its detail cards.
        upgrade_block_savepoint(true, 2026101439, 'mwa_dashboard');
    }

    if ($oldversion < 2026101440) {
        // Expose the retention drill title to JavaScript translations.
        upgrade_block_savepoint(true, 2026101440, 'mwa_dashboard');
    }

    if ($oldversion < 2026101441) {
        // Align the notices KPIs with the Action Center KPI component.
        upgrade_block_savepoint(true, 2026101441, 'mwa_dashboard');
    }

    if ($oldversion < 2026101442) {
        // Remove the redundant access date group label from class filters.
        upgrade_block_savepoint(true, 2026101442, 'mwa_dashboard');
    }

    if ($oldversion < 2026101443) {
        // Round the notices KPI accent border like the Action Center KPIs.
        upgrade_block_savepoint(true, 2026101443, 'mwa_dashboard');
    }

    if ($oldversion < 2026101444) {
        // Make notice KPIs filter the list and remove the unread-only filter.
        upgrade_block_savepoint(true, 2026101444, 'mwa_dashboard');
    }

    if ($oldversion < 2026101445) {
        // Align intervention period filters with the heatmap and shorten the completed follow-up label.
        upgrade_block_savepoint(true, 2026101445, 'mwa_dashboard');
    }

    if ($oldversion < 2026101446) {
        // Start intervention period filters with the All option in the requested order.
        upgrade_block_savepoint(true, 2026101446, 'mwa_dashboard');
    }

    if ($oldversion < 2026101447) {
        // Reposition the activity monitoring control and shorten the class list title.
        upgrade_block_savepoint(true, 2026101447, 'mwa_dashboard');
    }

    if ($oldversion < 2026101448) {
        // Move Moodle Messages to the top bar and place monitoring after the no-access message action.
        upgrade_block_savepoint(true, 2026101448, 'mwa_dashboard');
    }

    if ($oldversion < 2026101449) {
        // Visually align the Moodle Messages and group controls in the top bar.
        upgrade_block_savepoint(true, 2026101449, 'mwa_dashboard');
    }

    if ($oldversion < 2026101450) {
        // Simplify the top actions and remove the nested-box appearance.
        upgrade_block_savepoint(true, 2026101450, 'mwa_dashboard');
    }

    if ($oldversion < 2026101451) {
        // Optically align the group selector with the Moodle Messages action.
        upgrade_block_savepoint(true, 2026101451, 'mwa_dashboard');
    }

    if ($oldversion < 2026101452) {
        // Calculate partial achievement from grade items released so far, not the final course maximum.
        upgrade_block_savepoint(true, 2026101452, 'mwa_dashboard');
    }

    if ($oldversion < 2026101453) {
        // Release 4.7.4.
        upgrade_block_savepoint(true, 2026101453, 'mwa_dashboard');
    }

    if ($oldversion < 2026101454) {
        // Include students without a grade in the released-grade partial achievement rule.
        upgrade_block_savepoint(true, 2026101454, 'mwa_dashboard');
    }

    if ($oldversion < 2026101455) {
        // Release 4.7.5 with the corrected partial achievement target.
        upgrade_block_savepoint(true, 2026101455, 'mwa_dashboard');
    }

    if ($oldversion < 2026101456) {
        // Detect overdue viewed activities without submissions, including zero grades.
        upgrade_block_savepoint(true, 2026101456, 'mwa_dashboard');
    }

    if ($oldversion < 2026101457) {
        // Tie missed-delivery notices to the effective deadline and real module access.
        upgrade_block_savepoint(true, 2026101457, 'mwa_dashboard');
    }

    if ($oldversion < 2026101458) {
        // Use the same overdue state shown by the red activity marker across the dashboard.
        upgrade_block_savepoint(true, 2026101458, 'mwa_dashboard');
    }

    if ($oldversion < 2026101459) {
        // Match viewed activities by module id or activity/student names.
        upgrade_block_savepoint(true, 2026101459, 'mwa_dashboard');
    }

    if ($oldversion < 2026101460) {
        // Use submission events as a fallback while Moodle updates live activity state.
        upgrade_block_savepoint(true, 2026101460, 'mwa_dashboard');
    }

    if ($oldversion < 2026101461) {
        // Restore the proven 4.7.2 activity-state rules while retaining later UI work.
        upgrade_block_savepoint(true, 2026101461, 'mwa_dashboard');
    }

    if ($oldversion < 2026101462) {
        // Expose per-student activity views directly with the grade-state payload.
        upgrade_block_savepoint(true, 2026101462, 'mwa_dashboard');
    }

    if ($oldversion < 2026101463) {
        // Always open the Action Center and surface active viewed-without-submission notices.
        upgrade_block_savepoint(true, 2026101463, 'mwa_dashboard');
    }

    if ($oldversion < 2026101464) {
        // Give final academic achievement precedence over engagement classification.
        upgrade_block_savepoint(true, 2026101464, 'mwa_dashboard');
    }

    if ($oldversion < 2026101465) {
        // Split goal reached and high participation by final academic percentage.
        upgrade_block_savepoint(true, 2026101465, 'mwa_dashboard');
    }

    if ($oldversion < 2026101466) {
        // Clarify the new-message notice wording.
        upgrade_block_savepoint(true, 2026101466, 'mwa_dashboard');
    }

    if ($oldversion < 2026101467) {
        // Reopen automatically resolved notices when their condition remains active.
        upgrade_block_savepoint(true, 2026101467, 'mwa_dashboard');
    }

    if ($oldversion < 2026101468) {
        // Reuse the Activities viewed-without-delivery list in the notices card.
        upgrade_block_savepoint(true, 2026101468, 'mwa_dashboard');
    }

    if ($oldversion < 2026101469) {
        // Hide internal assignment components and open directly on the Action Center.
        upgrade_block_savepoint(true, 2026101469, 'mwa_dashboard');
    }

    if ($oldversion < 2026101470) {
        // Add page-level data refresh controls that preserve the current page.
        upgrade_block_savepoint(true, 2026101470, 'mwa_dashboard');
    }

    if ($oldversion < 2026101471) {
        // Align the return-to-course and refresh actions in the Action Center header.
        upgrade_block_savepoint(true, 2026101471, 'mwa_dashboard');
    }

    if ($oldversion < 2026101472) {
        // Build page refresh controls with DOM nodes instead of inline HTML strings.
        upgrade_block_savepoint(true, 2026101472, 'mwa_dashboard');
    }

    if ($oldversion < 2026101473) {
        // Release 4.7.6.
        upgrade_block_savepoint(true, 2026101473, 'mwa_dashboard');
    }

    if ($oldversion < 2026101474) {
        // Restore the proven 4.7.4 initial loading flow without background flashing.
        upgrade_block_savepoint(true, 2026101474, 'mwa_dashboard');
    }

    if ($oldversion < 2026101475) {
        // Mark missing delivery as overdue only after the activity actually closes.
        upgrade_block_savepoint(true, 2026101475, 'mwa_dashboard');
    }

    if ($oldversion < 2026101476) {
        // Require an individual released grade before evaluating partial achievement.
        upgrade_block_savepoint(true, 2026101476, 'mwa_dashboard');
    }

    if ($oldversion < 2026101477) {
        // Keep the Moodle Web Analytics brand name untranslated.
        upgrade_block_savepoint(true, 2026101477, 'mwa_dashboard');
    }

    if ($oldversion < 2026101478) {
        // Release 4.7.7.
        upgrade_block_savepoint(true, 2026101478, 'mwa_dashboard');
    }

    if ($oldversion < 2026101479) {
        // Refresh cached profile scripts and templates.
        upgrade_block_savepoint(true, 2026101479, 'mwa_dashboard');
    }

    if ($oldversion < 2026101480) {
        // Release 4.7.8.
        upgrade_block_savepoint(true, 2026101480, 'mwa_dashboard');
    }

    if ($oldversion < 2026101481) {
        // Shared student classification and indicator explanations.
        upgrade_block_savepoint(true, 2026101481, 'mwa_dashboard');
    }

    if ($oldversion < 2026101482) {
        // Replace visible explanation text with interactive exclamation tooltips.
        upgrade_block_savepoint(true, 2026101482, 'mwa_dashboard');
    }

    if ($oldversion < 2026101483) {
        // Remove the student indicator explanation control.
        upgrade_block_savepoint(true, 2026101483, 'mwa_dashboard');
    }

    if ($oldversion < 2026101484) {
        // Release 4.8: rename the class chat navigation item.
        upgrade_block_savepoint(true, 2026101484, 'mwa_dashboard');
    }
    return true;
}
