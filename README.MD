# My Personal Notes

## Commands

<!-- creating the virtual environment(already done "fapivenv") -->

# creating the virtual environment(already done "fapivenv")

1. python -m venv fapivenv

<!-- activating the virtual environment -->

2. .\fapivenv\Scripts\activate

<!-- installing fastapi with every dependency -->

# activating the virtual environment

2. .\venv\Script\Activate

# installing fastapi with every dependency

3. pip install "fastapi[standard]"

<!-- creating the requirement.txt of already installed dependency -->

# creating the requirement.txt of already installed dependency

4. pip freeze > requirements.txt

<!-- installing the dependency in requirement.txt (when placing new dependency  in requirement.txt -->

# installing the dependency in requirement.txt (when placing new dependency in requirement.txt)

5. pip install -r requirements.txt

<!-- creating a react template in the frontend map -->

# creating a react template in the frontend map

6. npm create vite@latest frontend --template react

<!-- running the backend server (main.py) -->

# running the backend server (main.py)

7. python .\main.py

uvicorn main:app --reload

<!-- running the frontend  -->

# running the frontend

8. npm run dev

<!-- Link to a FastAPI-React-Integration project -->

https://github.com/techwithtim/FastAPI-React-Integration/blob/8235008d8b384481d1ef9db732d809a1b54cbd19/notes.md

## MongoDB Commands

1. Mongosh
2. exit
3. show dbs
4. use "new database name"
5. db.createCollection("Name of collection")
6. db.dropDatabase()

## MongoDB Commands testings

1. db.students.insertOne({name: "Spongebob", age:30})
2. db.students.find()
3. db.students.insertMany([{name: "Patrick", age: 38, gpa:1.5}, {name: "Sandy", age:27, gpa:4.0}, {name: "Gary", age: 18, gpa:2.5}])

<!-- 1 is positive and -1 is negative -->

4. db.students.find().sort({name: -1})

<!-- 1 is ascending en -1 descending -->

5. db.students.find().sort({gpa: -1}).limit(1)

<!-- Update document with updateOne(filter, update) -->

6. db.students.updateOne({name:"Spongebob"}, {$set:{fullTame:true}})

<!-- field verwijderen(fullTame) door id te gebruiken -->

7. db.students.updateOne({\_id: ObjectId('68c299af259befb1ae735189')}, {$unset: {fullTame: ""}})

<!-- Alle documenten een fulltime field geven -->

8. db.students.updateMany({}, {$set: {fullTime:false}})

<!-- Alle ducumenten die geen fullTime hebben, krijgen een fullTime die true is -->

9. db.students.updateMany({fullTime:{$exist:false}}, {$set: {fullTime:true}})

<!-- Documenten verwijderen met deleteOne of deleteMany -->

10. db.students.deleteOne({name:"Larry"})
11. db.students.deleteMany({fullTime:false})

### Opderators $

1. $set
2. $unset
3. $exist
4. $ne <!-- not equal -- >
5. $lt <!-- less than -->
6. $gt <!-- greater than-->
