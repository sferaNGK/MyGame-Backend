import express from "express"
import cors from "cors"
import http from "http"
import { Server } from 'socket.io';

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

const app = express()

app.use(cors(corsOptions))

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173"
    }
})

let admins = [];
let users = [];
let activeUser;

const changeUser = () => {

    let index = users.indexOf(activeUser) + 1

    if (index == users.length) {
        index = 0
        activeUser = users[index]
        return
    }

    activeUser = users[index]
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on("join", (user) => {

        if (user.role == "admin") {
            admins.push(user)
        } else {
            users.push(user)
        }

        if (!activeUser) {
            activeUser = users[0]
        }

        io.emit("getActiveUser", activeUser)
        io.emit("all", users)
    });

    socket.on("changeUser", () => {

        changeUser()

        io.emit("newActiveUser", activeUser)
    })

    socket.on("addPoints", ({activeUser, points}) => {

        users.find(el => el.username == activeUser.username).points += points

        io.emit('newUserList', users)

    })

    socket.on('disconnect', function () {
        console.log('Отключились')
    })
});

app.get("/", (req, res) => {
    res.send("API")
})

server.listen(3800, () => {
    console.log("SERVER START")
})