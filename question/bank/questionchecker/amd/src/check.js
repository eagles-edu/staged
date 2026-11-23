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
 * AMD module for the Question Checker feature.
 *
 * @module     qbank_questionchecker/check
 * @copyright  2026 Christian Grévisse <christian.grevisse@uni.lu>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import Selectors from 'qbank_questionchecker/selectors';

class Check {
    constructor(questionid, contextid) {
        this.questionid = questionid;
        this.contextid = contextid;
        this.registerEventListeners();
        this.hideMessage();
    }

    registerEventListeners() {
        const checkButton = document.querySelector(Selectors.ELEMENTS.CHECKBUTTON);
        if (checkButton) {
            checkButton.addEventListener('click', async() => {

                this.hideMessage();

                checkButton.setAttribute('disabled', 'disabled');
                const oldText = checkButton.innerHTML;
                checkButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';

                const request = {
                    methodname: 'qbank_questionchecker_check_questions',
                    args: {
                        questionid: this.questionid,
                        contextid: this.contextid
                    }
                };

                try {
                    const responseObj = await Ajax.call([request])[0];
                    if (responseObj.error) {
                        this.showMessage(responseObj.error.exception.message, true);
                    } else {
                        this.showMessage(responseObj, false);
                    }
                } catch (error) {
                    this.showMessage(error.message, true);
                } finally {
                    checkButton.removeAttribute('disabled');
                    checkButton.innerHTML = oldText;
                }
            });
        }
    }

    showMessage(message, error) {
        const errorField = document.querySelector(Selectors.ELEMENTS.CHECKRESULT);
        if (errorField) {
            errorField.innerHTML = message;
            errorField.style.display = 'block';
            errorField.classList.add(error ? 'alert-danger' : 'alert-info');
        }
    }

    hideMessage() {
        const errorField = document.querySelector(Selectors.ELEMENTS.CHECKRESULT);
        if (errorField) {
            errorField.innerHTML = '';
            errorField.style.display = 'none';
            errorField.classList.remove('alert-info', 'alert-danger');
        }
    }
}

export const init = (questionid, contextid) => {
    new Check(questionid, contextid);
};
