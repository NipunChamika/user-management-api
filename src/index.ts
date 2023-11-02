import * as express from "express";
import { initializeDatabaseConnection } from './data-source';
import userRoutes from "./routes/user-routes";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

initializeDatabaseConnection()
    .then(connection => {
        console.log("Database connection established");

        // Routes
        app.use("/user", userRoutes);

        const PORT = process.env.PORT;
        app.listen(PORT, () => {
            console.log(`Server started on http://localhost:${PORT}`);
        });
    })
    .catch (error => {
        console.error("Failed to establish database connection", error);
    });
