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
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle. If not, see <https://www.gnu.org/licenses/>.

/**
 * English language strings for the Prompt2Slide AI module.
 *
 * @package    mod_pptgen
 * @copyright  2026 Ananth B K <ananth.bk@ipath.io> (IntegrationPath India LLC)
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

// ------------------------------------------------------------
// Core plugin strings
// ------------------------------------------------------------
$string['pluginname'] = 'Prompt2Slide AI';
$string['modulename'] = 'Prompt2Slide AI';

/**
 * IMPORTANT:
 * Moodle core expects the key 'modulenameplural' (NO underscore).
 * Your earlier file used 'modulename_plural', which does not satisfy core checks.
 * Keep both keys to avoid breaking any custom code that might still use the underscore variant.
 */
$string['modulenameplural'] = 'Prompt2Slide AI activities';
$string['modulename_plural'] = 'Prompt2Slide AI activities';

$string['modulename_link'] = 'mod/pptgen/view';
$string['pluginadministration'] = 'Prompt2Slide AI Administration';

/**
 * These are commonly used by index.php and tables in modules.
 * If your code calls get_string('name','pptgen') or get_string('noinstances','pptgen'),
 * these MUST exist.
 */
$string['noinstances'] = 'No Prompt2Slide AI activities found in this course.';
$string['name'] = 'Name';

/**
 * Standard activity name field string used in mod_form.php.
 * This fixes the [[pptgenname]] placeholder shown in your screenshot.
 */
$string['pptgenname'] = 'Activity name';
$string['pptgenname_help'] = 'Enter a name for this Prompt2Slide AI activity.';

// ------------------------------------------------------------
// Settings strings
// ------------------------------------------------------------
$string['aiprovider'] = 'AI Provider';
$string['aiprovider_desc'] = 'Choose which AI service to use.';

$string['header_gemini'] = 'Google Gemini Settings';
$string['geminiapikey'] = 'Gemini API Key';
$string['geminiapikey_desc'] = 'Enter your Google Gemini API key.';

$string['header_openai'] = 'OpenAI Settings';
$string['openaiapikey'] = 'OpenAI API Key';
$string['openaiapikey_desc'] = 'Enter your OpenAI API key.';
$string['openaimodel'] = 'OpenAI Model';
$string['openaimodel_desc'] = 'e.g., gpt-6-luna';

$string['header_custom'] = 'Custom API (Ollama/Local)';
$string['customendpoint'] = 'Custom Endpoint';
$string['customendpoint_desc'] = 'Full URL (e.g., http://localhost:11434/v1/chat/completions)';
$string['customapikey'] = 'Custom API Key';
$string['customapikey_desc'] = 'Leave empty for local Ollama.';
$string['custommodel'] = 'Custom Model Name';
$string['custommodel_desc'] = 'e.g., llama3, mistral, qwen2.5';

// ------------------------------------------------------------
// View.php UI strings
// ------------------------------------------------------------
$string['prompt_label'] = 'Enter your presentation topic';
$string['slides_label'] = 'Number of slides (1-20)';
$string['generate_btn'] = 'Generate Presentation';
$string['download_btn'] = 'Download PPT';
$string['success_msg'] = 'Presentation generated successfully!';
$string['error_disk'] = 'Generated PPT file was not created on disk.';
$string['error_exception'] = 'Generation failed: {$a}';
$string['error_no_response'] = 'The AI provider returned no response.';
$string['error_parse_slides'] = 'Could not parse slides from the AI response.';
$string['error_gemini_nokey'] = 'Gemini API key is not configured. Set it in the Prompt2Slide AI settings.';
$string['error_gemini_http'] = 'Gemini API error: HTTP {$a}';
$string['error_gemini_format'] = 'Invalid response format from Gemini.';
$string['error_gemini_truncated'] = 'Gemini stopped before finishing the slides. Try fewer slides or a shorter topic.';
$string['error_openai_nokey'] = 'OpenAI API key is not configured. Set it in the Prompt2Slide AI settings.';
$string['error_openai_http'] = 'OpenAI API error: HTTP {$a}';
$string['error_openai_format'] = 'Invalid response format from OpenAI.';
$string['error_openai_truncated'] = 'OpenAI stopped before finishing the slides. Try fewer slides or a shorter topic.';
$string['error_ollama_http'] = 'Ollama API error (HTTP {$a}). Make sure "ollama serve" is running.';
$string['error_ollama_format'] = 'Invalid response format from Ollama.';
$string['error_template_missing'] = 'PPT template not found at: {$a}';
$string['error_pptx_open'] = 'Unable to open the PPTX file.';
$string['topic_display'] = 'Topic: {$a}';
$string['loading_text'] = 'Please wait while the AI generates your presentation... This may take up to 60 seconds.';

// ------------------------------------------------------------
// Privacy API
// ------------------------------------------------------------
$string['privacy:metadata'] = 'The Prompt2Slide AI plugin does not store any personal data.';

// ------------------------------------------------------------
// Capabilities (required for db/access.php)
// ------------------------------------------------------------
$string['pptgen:addinstance'] = 'Add a new Prompt2Slide AI activity';
$string['pptgen:view'] = 'View Prompt2Slide AI activity';

// Form + UI labels
$string['prompt'] = 'Prompt';
$string['slides'] = 'Number of slides';
$string['generateppt'] = 'Generate PPT';
$string['downloadppt'] = 'Download PPT';
$string['exception'] = 'Exception';
$string['generating'] = 'Generating presentation...';

// Notifications
$string['notfproblem'] = 'Something went wrong while generating the presentation.';
