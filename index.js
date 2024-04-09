import express from "express"
import cors from "cors"
import http from "http"
import sqlite3 from 'sqlite3';
import { Server } from 'socket.io';

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

const db = new sqlite3.Database('./game.db');

const app = express()

app.use(express.json())
app.use(cors(corsOptions))

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

let users = [];
let userQueue = [];

let activeUser = null;
let activeQuestion = null;

const changeUser = () => {

    let index = userQueue.indexOf(activeUser) + 1

    if (index == userQueue.length) {
        index = 0
        activeUser = userQueue[index]
        return
    }

    activeUser = userQueue[index]
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Подключение к игре
    socket.on("joinGame", (user) => {

        if (user.role == "user") {
            users.push(user)
        }


        // Возвращает всех подключённых пользователей
        io.emit("all", users)
    });

    // Изменение отвечающего пользователя
    socket.on("changeUser", () => {

        changeUser()

        // Возвращает нового отвечающнго пользователя 
        io.emit("newActiveUser", activeUser)
    })

    // Добавление очков
    socket.on("addPoints", ({ activeUser, points }) => {

        users.find(el => el.username == activeUser.username).points += points

        activeQuestion = null
        userQueue = []
        activeUser = null

        // Возвращение обновленного списка игроков
        io.emit('newUserList', users)

    })

    // Выбор вопросы
    socket.on("selectQuestion", (question) => {

        activeQuestion = question;

        // Возвращает выбранный вопрос на клиент
        io.emit("setActiveQuestion", activeQuestion)
    })

    // Срабатывает когда пользователь жмёт на кнопку ответить
    socket.on("answerQuestion", (user) => {

        if (userQueue.find(el => el.username == user.username)) {
            return
        }

        userQueue.push(user)

        if (!activeUser) {
            activeUser = userQueue[0]

            // Возвращает нового отвечающнго пользователя 
            io.emit("getActiveUser", activeUser)
        }

        // Возвращает список нажавших на кнопук пользоватлей
        io.emit("getQueue", userQueue)
    })

    // Отключение от сервера
    socket.on('disconnect', () => {
        console.log('Отключились')
    })
});


// API
app.get("/", (req, res) => {
    res.send("API")
})

app.get("/games", (req, res) => {

    db.get("SELECT * FROM games", (err, row) => {
        let data = []
        data.push(row)
        res.json(data);
    });

})
app.get("/game/:id", (req, res) => {

    db.get("SELECT * FROM games WHERE id=?", req.params.id, (err, row) => {

        if (row) {
            res.json(row);
            return
        }

        res.json({ message: "Игры с таким id не существует!" });
    });

})

app.post("/game", (req, res) => {

    const { game } = req.body

    console.log(game)

    db.run("INSERT INTO games (gamedata) VALUES (?)", game);

    res.status(201).json({ message: "Игры успешно добавлена!" });
})

server.listen(3800, () => {
    console.log("SERVER START")
})