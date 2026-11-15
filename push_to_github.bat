@echo off
chcp 65001 > nul
title Выгрузка RusLearn на GitHub
echo ======================================================================
echo  🚀 Выгрузка школьного проекта РусЛёрн на GitHub:
echo  https://github.com/SAgan432/ruslern
echo ======================================================================
echo.
echo 1. Сейчас откроется всплывающее окно GitHub или страница в браузере.
echo 2. Нажмите "Sign in with your browser" и подтвердите вход.
echo.
cd /d "%~dp0"
git add .
git commit -m "Full RusLearn release with document and anti-cheat" 2>nul
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ======================================================================
    echo  ✅ УСПЕШНО ВЫГРУЖЕНО НА GITHUB!
    echo  Ссылка на репозиторий: https://github.com/SAgan432/ruslern
    echo ======================================================================
) else (
    echo.
    echo ❌ Не удалось отправить автоматически.
    echo Если окно входа не открылось, выполните команду с токеном GitHub:
    echo git push https://ВАШ_ТОКЕН@github.com/SAgan432/ruslern.git main
)
echo.
pause
