$stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
git add .
git commit -m "deploy: update bundle @ $stamp"
git push
