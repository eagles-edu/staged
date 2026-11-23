<?php
// This file is part of Moodle - http://moodle.org/.

namespace block_mwa_dashboard;

defined('MOODLE_INTERNAL') || die();

/**
 * Tests for OpenAI-compatible institutional and local endpoints.
 *
 * @package    block_mwa_dashboard
 * @copyright  2026 Bruno Porto
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class ai_institutional_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
        set_config('ia_enabled', 1, 'block_mwa_dashboard');
        set_config('ia_provider', 'institutional', 'block_mwa_dashboard');
        set_config('ia_institutional_model', 'qwen3:8b', 'block_mwa_dashboard');
    }

    public function test_no_authentication_does_not_require_credential(): void {
        set_config('ia_institutional_url', 'http://127.0.0.1:11434/v1/chat/completions', 'block_mwa_dashboard');
        set_config('ia_institutional_private', 1, 'block_mwa_dashboard');
        set_config('ia_institutional_authentication', 'none', 'block_mwa_dashboard');
        unset_config('ia_institutional_credential', 'block_mwa_dashboard');

        $this->assertTrue(\block_mwa_dashboard\ai\client::is_configured());
        $this->assertSame('none', \block_mwa_dashboard\ai\client::institutional_authentication());
        $this->assertSame('qwen3:8b', \block_mwa_dashboard\ai\client::model());
    }

    public function test_legacy_configuration_keeps_bearer_requirement(): void {
        set_config('ia_institutional_url', 'https://ai.example.org/v1/chat/completions', 'block_mwa_dashboard');
        unset_config('ia_institutional_authentication', 'block_mwa_dashboard');
        unset_config('ia_institutional_credential', 'block_mwa_dashboard');

        $this->assertSame('bearer', \block_mwa_dashboard\ai\client::institutional_authentication());
        $this->assertFalse(\block_mwa_dashboard\ai\client::is_configured());
    }

    public function test_http_requires_private_network_authorisation(): void {
        set_config('ia_institutional_url', 'http://127.0.0.1:11434/v1/chat/completions', 'block_mwa_dashboard');
        $method = new \ReflectionMethod(\block_mwa_dashboard\ai\client::class, 'institutional_url');
        $method->setAccessible(true);

        set_config('ia_institutional_private', 0, 'block_mwa_dashboard');
        $this->assertSame('', $method->invoke(null, false));

        set_config('ia_institutional_private', 1, 'block_mwa_dashboard');
        $this->assertSame(
            'http://127.0.0.1:11434/v1/chat/completions',
            $method->invoke(null, false)
        );
    }
}
