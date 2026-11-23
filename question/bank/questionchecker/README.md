# Question Checker #

Question Checker is a question bank plugin that enables verification of both Multiple choice and Essay questions through Moodle's AI subsystem.

Teachers can select a Multiple choice or Essay type question, whose question text gets sent to an AI provider:

- For Multiple choice questions, the AI provider returns the options it deems correct. In case of a disagreement with the question author's solution, an explanation is requested.
- For Essay questions, the AI provider is requested to provide a sample solution, such that the teacher can dry-run the question and check whether the provided answer meets his/her expectations.

## Installing via uploaded ZIP file ##

1. Log in to your Moodle site as an admin and go to _Site administration >
   Plugins > Install plugins_.
2. Upload the ZIP file with the plugin code. You should only be prompted to add
   extra details if your plugin type is not automatically detected.
3. Check the plugin validation report and finish the installation.

## Installing manually ##

The plugin can be also installed by putting the contents of this directory to

    {your/moodle/dirroot}/question/bank/questionchecker

Afterwards, log in to your Moodle site as an admin and go to _Site administration >
Notifications_ to complete the installation.

Alternatively, you can run

    $ php admin/cli/upgrade.php

to complete the installation from the command line.

## License ##

2026 Christian Grévisse <christian.grevisse@uni.lu>

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program.  If not, see <https://www.gnu.org/licenses/>.
