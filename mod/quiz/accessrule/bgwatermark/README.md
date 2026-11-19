# Quiz Background Watermark (quizaccess_bgwatermark)

## 📌 Overview

Quiz Background Watermark is a Moodle quiz access rule plugin that enhances quiz security and branding by adding a configurable watermark/background image to quiz attempt pages.

It also provides basic client-side restrictions such as disabling right-click and attempting to block developer tools to discourage misuse during assessments.

---

## 🚀 Features

* 🖼️ Add watermark/background image to quiz pages
* 🎯 Apply watermark globally or per question area
* 🔒 Disable right-click (optional)
* 🛡️ Attempt to block developer tools (optional, not foolproof)
* 🎨 Custom opacity control for better readability
* 📱 Works with standard Moodle quiz layouts
* ⚡ Lightweight and easy to install

---

## 🎯 Use Cases

* Branding quiz pages with institute/company logo
* Discouraging screenshots or content sharing
* Creating exam-like environment
* Enhancing visual identity of LMS

---

## ⚙️ Installation

1. Download the plugin ZIP.
2. Go to:

   ```
   Site administration → Plugins → Install plugins
   ```
3. Upload the ZIP file.
4. Follow the installation steps.
5. Purge caches if required.

---

## 🧩 Configuration

Navigate to:

```
Site administration → Plugins → Activity modules → Quiz → Background Watermark
```

### Available Settings:

* **Watermark Image** – Upload logo/background
* **Opacity** – Control transparency (0–1)
* **Disable Right Click** – Enable/disable
* **Disable Developer Tools** – Attempt to block shortcuts
* **Apply to Question Area** – Show watermark per question

---

## 🎓 Usage

Once installed:

* The watermark is automatically applied to all quiz attempt pages.
* No additional configuration is required per quiz.
* Works on:

  * Quiz Attempt page
  * Review page
  * Summary page

---

## 🔐 Security Disclaimer

This plugin provides **basic client-side deterrents only**.

* It does NOT prevent screenshots from external devices.
* Developer tools restrictions can be bypassed by advanced users.
* For high-stakes exams, consider using:

  * Safe Exam Browser (SEB)
  * Proctoring solutions

---

## 📦 Supported Moodle Versions

* Moodle 4.0
* Moodle 4.1
* Moodle 4.2
* Moodle 4.3
* Moodle 4.4
* Moodle 4.5
* Moodle 5.0
* Moodle 5.1

Tested on Moodle 5.0.

---

## 🗄️ Database & Compatibility

* Uses Moodle core APIs (DML, File API)
* Compatible with:

  * MySQL
  * PostgreSQL

---

## 🧠 Technical Details

* Plugin Type: Quiz Access Rule
* Component: `quizaccess_bgwatermark`
* Uses AMD JavaScript module
* Uses Moodle File API for image storage
* Settings stored in `config_plugins`

---

## 🔒 Privacy

This plugin does **not store or process personal data**.

It only displays a static watermark image configured by the administrator.

---

## 🐞 Issue Tracker

Report bugs or request features here:

👉 https://github.com/kdi222/moodle-quizaccess_bgwatermark/issues

---

## 📚 Documentation

Refer to this README for setup and usage instructions.

---

## 📸 Screenshots

(Add screenshots here)

* Quiz page with watermark
![alt text](Quiz_question_screen.png)
* Admin settings page
![alt text](Quiz_backgroun_setting.png)

---

## 👨‍💻 Development

### Requirements

* Moodle 4.0+
* PHP 7.4+

### Setup

Clone repository:

```
git clone https://github.com/kdi222/moodle-quizaccess_bgwatermark.git
```

Place inside:

```
mod/quiz/accessrule/
```

---

## 📜 License

This plugin is licensed under the GNU GPL v3 or later.

---

## 👤 Author

**Dnyaneshwar Karamunge**
email : karamunged@gmail.com
Linkedin : https://www.linkedin.com/in/dnyaneshwar-k/

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

Please use the issue tracker for discussions.

---

## ⭐ Acknowledgements

Built using Moodle Plugin Development guidelines.
