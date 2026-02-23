import type { RequestHandler } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
}

export const firebaseAuth = admin.auth();

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    if (!decoded.email?.endsWith("@grgplayscapes.com")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    (req as any).user = {
      claims: {
        sub: decoded.uid,
        email: decoded.email,
        first_name: decoded.name?.split(" ")[0] || "",
        last_name: decoded.name?.split(" ").slice(1).join(" ") || "",
        profile_image_url: decoded.picture || "",
      },
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
