
import { Router } from "express";
import intelligenceRouter from "./intelligence";
const router = Router()

router.use((req, res, next) => {
    console.log("INDEX ROUTER HIT:", req.method, req.originalUrl);
    next();
});
router.use("/projects", intelligenceRouter);

export default router