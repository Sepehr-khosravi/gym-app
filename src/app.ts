import express from "express";
import helmet from "helmet";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(helmet(
    {
        xssFilter : true
    }
));
app.use(cors({
    methods : ["GET", "POST", "DELETE", "PUT", "PATCH"],
    origin : "*"
}));


export default app;