
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

/**
 * Create authentication routes
 */
export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  // Public routes
  router.post("/signup", controller.signUp);
  router.post("/signin", controller.signIn);
  router.post("/refresh", controller.refreshToken);

  // Protected routes (require authentication)
  router.post("/signout", authMiddleware, controller.signOut);
  router.post("/signout-all", authMiddleware, controller.signOutAll);
  router.get("/me", authMiddleware, controller.getCurrentUser);
  router.patch("/user", authMiddleware, controller.updateUser);
  router.post("/change-password", authMiddleware, controller.changePassword);
  router.patch("/profile", authMiddleware, controller.updateProfile);
  router.delete("/account", authMiddleware, controller.deleteAccount);

  return router;
}