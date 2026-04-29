import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

import { importMedicinesFromCSV } from "./csv-import";
import { importMedicinesFromExcel } from "./excel-import";
import session from "express-session";
import MongoStore from "connect-mongo";
import { optimizeDatabaseForLargeDatasets } from "./index-optimizer";
import { mongoDBService } from "./services/mongodb-service";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Load ENV properly (only once)
dotenv.config();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional: load .env from root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Debug logs
console.log("✅ ENV CHECK");
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Loaded" : "Missing");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "Loaded" : "Missing");

// Validate session secret
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("❌ SESSION_SECRET must be set in environment variables");
}

// Global flag
declare global {
  var useMongoStorage: boolean;
}

// ---------------- MongoDB Init ----------------
async function initializeMongoDB() {
  try {
    const isMongoConnected = await mongoDBService.connect();

    if (isMongoConnected) {
      global.useMongoStorage = true;
      console.log("✅ Using MongoDB");

      try {
        await optimizeDatabaseForLargeDatasets();
        console.log("✅ DB optimized (700k+ support)");
      } catch (err: any) {
        console.error("❌ Index optimization failed:", err?.message);
      }
    } else {
      global.useMongoStorage = false;
      console.log("⚠️ Using memory storage");
    }
  } catch (err) {
    global.useMongoStorage = false;
    console.error("❌ MongoDB error:", err);
  }
}

// ---------------- Data Import ----------------
async function importMedicineData() {
  try {
    const excelSuccess = await importMedicinesFromExcel();
    if (excelSuccess) {
      console.log("✅ Excel import success");
      return;
    }

    console.log("⚠️ Excel failed, trying CSV...");

    const csvSuccess = await importMedicinesFromCSV();
    if (csvSuccess) {
      console.log("✅ CSV import success");
      return;
    }

    console.warn("⚠️ No data imported");
  } catch (err) {
    console.error("❌ Import error:", err);
  }
}

// ---------------- Session Store ----------------
async function setupSessionStore() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log("⚠️ Using memory session store");
      return undefined;
    }

    const store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: "pillnow",
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60,
      autoRemove: "native",
      touchAfter: 3600,
      crypto: {
        secret: sessionSecret!,
      },
    });

    console.log("✅ Mongo session store ready");
    return store;
  } catch (err) {
    console.error("❌ Session store failed:", err);
    return undefined;
  }
}

// ---------------- MAIN ----------------
(async () => {
  await initializeMongoDB();
  await importMedicineData();

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const sessionStore = await setupSessionStore();

  app.use(
    session({
      name: "pillnow.sid",
      secret: sessionSecret!,
      resave: false, // ✅ FIXED (was true - causes issues)
      saveUninitialized: false, // ✅ FIXED
      store: sessionStore,
      rolling: true,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  // ---------------- Logger ----------------
  app.use((req, res, next) => {
    const start = Date.now();

    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      const duration = Date.now() - start;

      if (req.path.startsWith("/api")) {
        log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
      }

      return originalJson(body);
    };

    next();
  });

  // ---------------- Routes ----------------
  const server = await registerRoutes(app);

  // ---------------- Error Handler ----------------
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Server Error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
    });
  });

  // ---------------- Vite / Static ----------------
 console.log("✅ API-only backend running");

  // ---------------- Start Server ----------------
  const port = Number(process.env.PORT) || 5000;

  server.listen(port, "0.0.0.0", () => {
    log(`✅ Server running on port ${port}`);
  });
})();