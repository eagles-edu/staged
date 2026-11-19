/**
 *
 * @package    quizaccess_bgwatermark
 * @copyright  2026 Dnyaneshwar Karamunge
 * @license    PHP and HTML: http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later. Other parts: http://themeforest.net/licenses
 */
define(['jquery'], function($) {
    return {
        init: function(cfg) {
            // create watermark element
            var $wm = $('<div id="quiz-bgwatermark-overlay" aria-hidden="true"></div>');
            $('body').append($wm);

            if (cfg.opacity !== undefined) {
                $wm.css('opacity', cfg.opacity);
            }

            if (cfg.apply_to_question_area == 1 || cfg.apply_to_question_area === '1') {
                $wm.addClass('apply-to-question-areas');
            } else {
                $wm.addClass('apply-global');
            }

            // Disable right-click
            if (parseInt(cfg.disable_rightclick)) {
                $(document).on('contextmenu.bgwatermark', function(e) {
                    e.preventDefault();
                });
            }

            // Simple attempt to block devtools (detects common key combos). Not foolproof.
            if (parseInt(cfg.disable_devtools)) {
                $(document).on('keydown.bgwatermark', function(e) {
                    if (e.keyCode === 123 ||
                        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
                        (e.ctrlKey && e.keyCode === 85)) {
                        e.preventDefault();
                        return false;
                    }
                });

                var threshold = 160;
                setInterval(function() {
                    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
                        if (!$('#devtools-detect').length) {
                        $('body').append(
                            '<div id="devtools-detect" style="position:fixed; inset:0; background:#fff; z-index:99999; display:flex; align-items:center; justify-content:center;">'
                            + message +
                            '</div>'
                        );
                    }
                    } else {
                        $('#devtools-detect').remove();
                    }
                }, 1000);
            }

            // If server included watermark URL, set it.
            if (cfg.watermarkurl) {
                $wm.css('background-image', 'url(' + cfg.watermarkurl + ')');
            }

            // Apply to question areas or global overlay
            if ($wm.hasClass('apply-to-question-areas')) {
                // For each question container, add an inline watermark element.
                $('.que, .question, .answer').each(function() {
                    var $container = $(this);
                    var $wmi = $('<div class="quiz-bgwatermark-inline" aria-hidden="true"></div>');
                    if (cfg.watermarkurl) {
                        $wmi.css('background-image','url(' + cfg.watermarkurl + ')');
                    }
                    $container.css('position','relative').prepend($wmi);
                });
            } else {
                // global overlay
                $wm.css({position:'fixed', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex: 1});
            }

        }
    };
});
