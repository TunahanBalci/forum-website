@echo off
setlocal enabledelayedexpansion

CD htdocs/forum/data

set /p fullname=Enter full name (Name Surname): 
set /p username=Enter username (nickname): 
set /p email=Enter email: 
set /p birthdate=Enter birthdate (YYYY-MM-DD): 
set /p password=Enter password: 

php -r "echo password_hash('%password%', PASSWORD_DEFAULT);" > hash.txt

set /p hash=<hash.txt

set "fullname=!fullname:'=''!"
set "username=!username:'=''!"
set "email=!email:'=''!"
set "birthdate=!birthdate:'=''!"
set "hash=!hash:'=''!"

:: Build addAdmin.sql

echo DELETE FROM users WHERE nickname = '!username!'; > addAdmin.sql

echo. >> addAdmin.sql

REM INSERT statement
echo INSERT INTO users (fullname, nickname, email, password_hash, birthdate, is_admin, created_at^) VALUES^('!fullname!','!username!','!email!','!hash!','!birthdate!',TRUE,STRFTIME('%%Y-%%m-%%d %%H:%%M:%%f','now','localtime')); >> addAdmin.sql

echo. >> addAdmin.sql

echo -- Password: !password! >> addAdmin.sql

echo Running SQL script...
sqlite3 forum.db < addAdmin.sql

del hash.txt

echo.
echo Done. Admin user "!username!" has been (re)created/updated.
pause
endlocal
