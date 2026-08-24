import { Router } from "express";
const router = Router()

router.get('/ai', (req, res) => {
    res.json({ message: "AI" })
})

export default router   