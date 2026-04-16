const express = require("express")
const db = require("./db")
const app = express()
const bcr = require('bcryptjs')
const jwt = require('jsonwebtoken')
const e = require("express")
app.use(express.json())

const PORT = 3000
const SECRET = "123321123"

const attributes = ["str", "agl", "int"];
const keys = ["q", "w", "e", "d", "f", "r"];
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
        const { name, description, attribute, movementSpeed, str, agl, int, hp } = req.body

        if (!name || !name.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно имя" })
        }

        if (!description || !description.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать описание" })
        }

        if (!attribute || !attributes.includes(attribute)) {
            return res
                .status(400)
                .json({ error: "Нужен атрибут" })
        }

        if (!movementSpeed || !movementSpeed.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать скорость" })
        }

        if (!str || !str.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать силу" })
        }

        if (!agl || !agl.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать ловкость" })
        }

        if (!int || !int.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать интеллект" })
        }

        if (!hp || !hp.trim()) {
            return res
                .status(400)
                .json({ error: "Нужно указать здоровье" })
        }

        

        const info = db.prepare(`
            INSERT INTO heroes (name, description, attribute, movementSpeed, str, agl, int, hp, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(name.trim(), description.trim(), attribute.trim(), movementSpeed, str, agl, int, hp,  req.user.id)

        const newHero = db
            .prepare("SELECT * FROM heroes WHERE id = ?")
            .get(info.lastInsertRowid)

        return res.status(201).json(newHero)
    } catch(err) {console.error(err);
        return res.status(500).json({error: "Something went wrong"})
    }
})

app.post("/api/spell", auth, (req, res) => {
    try {
        const { heroesId, title , key, manaCost, cooldown, description   } = req.body;
        const userId = req.user.id;

        const hero = db.prepare("SELECT * FROM heroes WHERE id = ?").get(heroesId);
        if (!hero) {
            return res.status(404).json({ error: "Такого героя не существует" });
        }

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Нужно название" });
        }
        
        if (!description || !description.trim()) {
            return res.status(400).json({ error: "Описание обязательно" });
        }

        if (!key || !keys.includes(key)) {
            return res
                .status(400)
                .json({ error: "Нужна клавиша" })
        }

        if (!manaCost || manaCost < 0) {
            return res.status(400).json({ error: "Нужно указать манакост" });
        }

        if (!cooldown || cooldown < 0) {
            return res.status(400).json({ error: "Нужно указать перезарядку" });
        }
        
        const info = db.prepare(`
            INSERT INTO spell (userId, heroesId, title, description, key, manaCost, cooldown )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, heroesId, title.trim(), description.trim(), key.trim(), manaCost, cooldown );

        const newSpell = db
            .prepare("SELECT * FROM spell WHERE id = ?")
            .get(info.lastInsertRowid);

        return res.status(201).json(newSpell);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create spell" });
    }
});

app.get("/api/heroes/:id", (req, res) => {
    try {
        const { id } = req.params
        const hero = db.prepare("SELECT * FROM heroes WHERE id = ?").get(id)
        if (!hero) return res.status(404).json({ error: "Герой не найден" })
        const spell = db.prepare("SELECT * FROM spell WHERE heroesId = ?").all(id)
        return res.status(200).json({ ...hero, spells: spell })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})
app.get("/api/heroes", (req, res) => {
    try {
        const hero = db.prepare(
            "SELECT * FROM heroes ORDER BY createdAt DESC"
        ).all()

        return res.status(200).json(hero)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to fetch" })
    }
})
app.get("/api/spell", (req, res) => {
    try {
        const spells = db.prepare(
            "SELECT * FROM spell ORDER BY createdAt DESC"
        ).all()

        return res.status(200).json(spells)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Failed to fetch" })
    }
})

app.put("/api/heroes/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const hero = db.prepare("SELECT * FROM heroes WHERE id = ?").get(id)
        if (!hero) {
            return res.status(404).json({ error: "Hero not found" });
        }
        if (!(['admin'].includes(req.user.role) || req.user.id === hero.createdBy)) {
            return res
            .status(403)
            .json({message: 'Доступ запрещен: недостаточно прав'})
        }
        const newHero = { ...hero, ...req.body }
        const updateStmt = db.prepare("UPDATE heroes SET name = ?, description = ?, attribute = ?, movementSpeed = ?, str = ?, agl = ?, int = ?, hp = ? WHERE id = ? ")
        const result = updateStmt.run(
            newHero.name,
            newHero.description,
            newHero.attribute,
            newHero.movementSpeed,
            newHero.str,
            newHero.agl,
            newHero.int,
            newHero.hp,
            id
        );
        const newHeroFromDB = db.prepare("SELECT * FROM heroes WHERE id = ?").get(id)

        res.status(200).json(newHeroFromDB);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update hero" });
    }
})
app.put("/api/spell/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const spells = db.prepare("SELECT * FROM spell WHERE id = ?").get(id)
        if (!spells) {
            return res.status(404).json({ error: "Spell not found" });
        }
        if (req.user.id !== spells.userId || !(['admin'].includes(req.user.role))) {
            return res
            .status(403)
            .json({message: 'Доступ запрещен: недостаточно прав'})
        }
        const newSpell = { ...spells, ...req.body }
        const updateStmt = db.prepare("UPDATE spell SET  title = ?, description = ?, key = ?, manaCost = ?, cooldown = ? WHERE id = ? ")
        const result = updateStmt.run(
            newSpell.title,
            newSpell.description,
            newSpell.key,
            newSpell.manaCost,
            newSpell.cooldown,
            id
        );
        const newSpellFromDB = db.prepare("SELECT * FROM spell WHERE id = ?").get(id)

        res.status(200).json(newSpellFromDB);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update spell" });
    }
})

app.delete("/api/heroes/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const hero = db.prepare("SELECT * FROM heroes WHERE id = ?").get(id)
        if (!hero) return res.status(404).json({ error: "Герой не найден" })
        if (req.user.id !== hero.createdBy || !(['admin'].includes(req.user.role))) {
            return res
            .status(403)
            .json({message: 'Доступ запрещен: недостаточно прав'})
        }
        db.prepare('DELETE FROM heroes WHERE id = ?').run(id)
        return res.status(200).json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})

app.delete("/api/spell/:id", auth, (req, res) => {
    try {
        const { id } = req.params
        const spells = db.prepare("SELECT * FROM spell WHERE id = ?").get(id)
        if (!spells) return res.status(404).json({ error: "Способность не найдена" })
        if (!(['admin'].includes(req.user.role) || req.user.id === spells.userId)) {
            return res
            .status(403)
            .json({message: 'Доступ запрещен: недостаточно прав'})
        }
        db.prepare('DELETE FROM spell WHERE id = ?').run(id)
        return res.status(200).json({ message: 'Deleted successfully' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Something went wrong" })
    }
})
app.listen(PORT)