# Grade List (mod_gradelist)

## Short Description
Displays a collapsible grade report for all students across all courses a teacher teaches, grouped by letter grade. Students see their own grades across all enrolled courses.

## Full Description
The Grade List activity module allows a teacher to place a single activity resource in their course that automatically generates a comprehensive grade report across every course they teach.

When a teacher clicks the activity, they are presented with a live report pulled directly from Moodle's gradebook. The report lists every enrolled student from every course the teacher is assigned to, showing:

- Student full name
- Username
- Letter grade (based on the grade scale configured in each course)
- Grade percentage
- Course name
- Last course access

When a student clicks the activity, they see their own grades across all courses they are enrolled in, including letter grade, percentage, course name, and last access.

Students are grouped by letter grade in the following order: F, D, C, B, A, and No Grade. Each group is a collapsible section that is collapsed by default when the page loads, allowing the teacher to quickly focus on the grade groups they are most interested in.

The report is always live — no data is cached — so grades reflect the current state of the Moodle gradebook at the time of viewing.

### Key Features
- Live data pulled from Moodle gradebook API on every page load
- Respects the letter grade scale configured for each individual course
- Collapsible grade group sections, collapsed by default
- Colour coded group headers (red for F through blue for A)
- Students with no grade yet are listed separately under "No Grade"
- Sort by Last Name/First Name or Grade (Lowest First)
- Last course access column
- Teacher view shows all students across all taught courses
- Student view shows their own grades across all enrolled courses
- Full Moodle roles and capabilities system support
- Backup and restore support
- Privacy API compliant

### Use Case
This plugin is ideal for teachers who manage multiple courses and want a single at-a-glance view of how all their students are performing, without having to navigate into each course gradebook individually.

## Requirements
- Moodle 4.4 or higher
- PHP 8.1 or higher

## Installation
1. Copy the `gradelist` folder into your Moodle `/mod/` directory
2. Log in as admin and go to **Site Administration → Notifications**
3. Follow the on-screen instructions to complete the installation

## Usage
1. Turn editing on in any course you teach
2. Click **Add an activity or resource**
3. Select **Grade List**
4. The name and description are pre-filled — edit them if desired
5. Save and click the activity to view your grade report

## Author
Brian Pool

## License
This plugin is licensed under the GNU General Public License v3 or later.
See [LICENSE](http://www.gnu.org/copyleft/gpl.html) for details.
