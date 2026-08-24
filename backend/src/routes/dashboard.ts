import { Router } from "express";
const router = Router()

router.get('/dashboard', (req, res) => {
    res.json({ message: "Dashboard" })
})

export default router