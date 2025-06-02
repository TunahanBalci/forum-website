@echo off
echo ================================
echo Creating forum.db if not exists
echo ================================

CD htdocs/forum/data

:: Create SQLite DB
sqlite3 forum.db "VACUUM;"

if exist schema.sql (
    echo Initializing schema...
    sqlite3 forum.db < schema.sql
) else (
    echo schema.sql not found! Skipping schema import.
)

if exist init_categories.sql (
    echo Inserting initial categories...
    sqlite3 forum.db < init_categories.sql
) else (
    echo init_categories.sql not found! Skipping category import.
)

echo Done.
pause
