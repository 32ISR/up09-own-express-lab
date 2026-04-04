const express = require("express")
const db = require("./db")
const app = express()
const bcr = require('bcryptjs')
const jwt = require('jsonwebtoken')
const e = require("express")
app.use(express.json())

const PORT = 3000
const SECRET = "123321123"

const auth = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) return res.status(401).json({ error: "Failed to provide token" })

    const token = authHeader.split(" ")[1]
    if (!token) return res.status(401).json({ error: "Token has invalid form" })

    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    } catch (error) {
        console.error(error)
        return res.status(403).json({ error: "Invalid token" })
    }
}

app.post("/api/auth/register", (req, res) => {
    try {
        console.log(req.body);
        const { username, password, email, role } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: "." })
        }

        if (username.length < 3) {
            return res.status(400).json({ error: "Недостаточно символов в пароле" })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Недостаточно символов в пароле" })
        }

        const existing = db.prepare(
            "SELECT id FROM users WHERE username = ?"
        ).get(username)

        if (existing) return res.status(409).json({ error: "Пользователь уже существует" })

        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)

        const info = db.prepare(`INSERT INTO users (username, email, password, role)
            VALUES(?,?,?,?)`).run(username.trim(), email.trim(), hash, role || "user")

        const newUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid)

        const { password: _, ...safeUser } = newUser

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to create" })
    }
})

app.post("/api/auth/login", (req, res) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({ error: "Missing data" })
        }

        const user = db.prepare(
            "SELECT * FROM users WHERE username = ?"
        ).get(username)
        if (!user) {
            return res.status(400).json({ error: "Пользователя нету" })
        }

        const valid = bcr.compareSync(password, user.password)
        if (!valid) return res.status(400).json({ error: "Пароль невереный" })

        const { password: _, ...safeUser } = user
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(200).json({ success: true, token, user: safeUser })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something wrong" })
    }
})
app.get("/api/auth/profile", auth, (req, res) => {
    try {
        const user = db.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).get(req.user.id)
        const { password, ...safeUser } = user
        return res.status(200).json(safeUser)
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something wrong" })
    }
})

app.post("/api/heroes", auth, (req, res) => {
    try {
        const { title, description} = req.body

        if (!title || !title.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно название" })
        }

        if (!description || !description.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно описание" })
        }

        const info = db.prepare(`
            INSERT INTO heroes (title, description, createdBy)
            VALUES (?, ?, ?)
            `).run(title.trim(), description.trim(), req.user.id)

        const newHero = db
            .prepare("SELECT * FROM heroes WHERE id = ?")
            .get(info.lastInsertRowid)

        return res.status(201).json(newHero)
    } catch(err) {
        return res.status(500).json({error: "Something went wrong"})
    }
})

app.post("/api/guides", auth, (req, res) => {
    try {
        const { rating, comment } = req.body
        const { id } = req.params
        const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id)
        if (!book) {
            return res.status(404).json({ error: "Такой книжки не существует" })
        }
        if (!rating || !(rating > 0 && rating <= 5)) {
            return res
                .status(400)
                .json({ error: "Укажите оценку" })
        }

        if (!comment || !comment.trim()) {
            return res
                .status(400)
                .json({ error: "Напишите отзыв" })
        }

        const info = db.prepare(`
            INSERT INTO review (userId, bookId, rating, comment)
            VALUES (?, ?, ?, ? )
            `).run(req.user.id, id, Number(rating), comment.trim())

        const newGuide = db
            .prepare("SELECT * FROM guides WHERE id = ?")
            .get(info.lastInsertRowid)

        return res.status(201).json(newGuide)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to create" })
    }
})

app.listen(PORT)