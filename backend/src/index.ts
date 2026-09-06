import express from 'express';
import cors from 'cors';
import v1Router from './routes/index.ts'



const app = express();

app.use(cors());
app.use(express.json());


app.use('/api/v1', v1Router)
















app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
