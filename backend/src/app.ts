import express from "express";
import cors from "cors";
import collectionRoutes from "./routes/collectionRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use("/api/collections", collectionRoutes);

app.use(errorHandler);

export default app;
