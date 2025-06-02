# 🗨️ Forum Project

Welcome to your very own **Forum Website**!  
This project is a fully functional, real-time web forum—built in PHP with SQLite.  
It’s perfect for anyone who wants to learn, experiment, and practice web development.

## 🌐 Live Demo

You can try out the forum live at:

➡️ [forumankara.dns-cloud.net](http://forumankara.dns-cloud.net/)

**Visit the link above to explore the platform and test its features in real time!**

---

## 🚀 Features

- **User Authentication**  
  - Register, log in, log out. The system holds your session, so you won't need to log in every time you visit.

- **Real-Time Private Messaging**  
  - Chat with other users instantly.

- **Thread Creation**  
  - Start discussions on any topic. You can also edit or delete your own thread.

- **Nested Posts & Replies**  
  - Post under threads, and reply directly to other users’ posts; edit or delete your own post.

- **Like/Dislike System**  
  - Show appreciation or disagreement on posts and threads.

- **Public User Profiles**  
  - View user stats, nicknames, post/thread count, bios, birth dates, and profile pictures

- **Profile Editing**  
  - Change your nickname, update your bio, or upload a new profile image

---

## 🛠️ Getting Started – Setup Instructions

Follow these steps to get your forum running locally:

### 1️⃣ Install PHP

- Download [PHP](https://windows.php.net/download)  
- Install it to a folder (Recommended: `C:/PHP/`)
- Add the PHP directory to your system’s **PATH** environment variable

### 2️⃣ Configure PHP

- In your PHP folder, create a `php.ini` file  
  - Tip: Copy and rename `php.ini-development` to `php.ini`
- Edit `php.ini`:
  - Enable SQLite extensions:
    ```
    extension=pdo_sqlite
    extension=sqlite3
    ```
  - Set the correct extension directory (adjust the path if needed):
    ```
    extension_dir = "C:/PHP/ext"
    ```

### 3️⃣ Install SQLite 3

- Download [SQLite3](https://www.sqlite.org/download.html)  
- Install to a folder (Recommended: `C:/SQLite/`)
- Add the SQLite directory to your system’s **PATH**

### 4️⃣ (If Needed) Configure Apache

If you use Apache (recommended for production/local hosting):

- Edit `conf/httpd.conf` in your Apache directory.
- Update these lines (adjust if you used a different PHP install location):

    ```
    LoadFile "C:/PHP/php8ts.dll"
    LoadModule php_module "C:/PHP/php8apache2_4.dll"
    PHPIniDir "C:/PHP"
    ```

### 5️⃣ Initialize and Run

- In the project folder, you’ll find these batch scripts:
  - `INSTALL_SERVICE.bat` – Installs Apache as a Windows service
  - `INITIALIZE_DATABASE.bat` – Sets up the database schema and initial data
  - `START.bat` – Starts Apache service, if stopped
- **Run these in order** to get the server and database ready!

---

## 🙋‍♂️ Credits

- **Project:** By Tunahan BALCI
- **Assisted by:** ChatGPT and Claude AI tools

---

## 💡 Why This Project?

I have created this project to impove my skills in following:
- **PHP**
- **SQLite**
- **Database Design**
- **Authentication and Session Management**

---

Feel free to create an issue, start a discussion, or reach out.  

---

