import { Router } from "express";
const router = Router()

router.get('/', (req, res) => {
    res.json({ message: "Projects" })
})

export default router
