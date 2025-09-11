# Commands

# creating the virtual environment(already done "fapivenv")
1. python -m venv fapivenv
# activating the virtual environment 
2. .\fapivenv/Script\activate
# installing fastapi with every dependency
3. pip install "fastapi[standard]"
# creating the requirement.txt of already installed dependency
4. pip freeze > requirement.txt
# installing the dependency in requirement.txt (when placing new dependency in requirement.txt)
5. pip install -r requirement.txt

# creating a react template in the frontend map
6. npm create vite@latest frontend --template react

# running the backend server (main.py)
7. python .\main.py

# running the frontend
8. npm run dev

https://github.com/techwithtim/FastAPI-React-Integration/blob/8235008d8b384481d1ef9db732d809a1b54cbd19/notes.md
