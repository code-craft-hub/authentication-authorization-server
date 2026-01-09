
import { Request, Response, NextFunction } from "express";

/**
 * Validation middleware factory
 * Validates request body based on endpoint type
 */
export const validationMiddleware = (type: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    switch (type) {
      case "recommendations":
        return validateRecommendationRequest(req, res, next);
      case "interaction":
        return validateInteractionRequest(req, res, next);
      default:
        next();
    }
  };
};

function validateRecommendationRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { jobTitle, skills, page, pageSize } = req.body;

  const errors: string[] = [];

  if (!jobTitle || typeof jobTitle !== "string") {
    errors.push("jobTitle is required and must be a string");
  } else if (jobTitle.length > 200) {
    errors.push("jobTitle must be less than 200 characters");
  }

  if (!Array.isArray(skills)) {
    errors.push("skills must be an array");
  } else if (skills.length === 0) {
    errors.push("skills array cannot be empty");
  } else if (skills.length > 50) {
    errors.push("Maximum 50 skills allowed");
  } else {
    skills.forEach((skill, index) => {
      if (typeof skill !== "string" || skill.trim().length === 0) {
        errors.push(`Skill at index ${index} must be a non-empty string`);
      }
    });
  }

  if (page !== undefined) {
    if (typeof page !== "number" || page < 1) {
      errors.push("page must be a positive number");
    }
  }

  if (pageSize !== undefined) {
    if (typeof pageSize !== "number" || pageSize < 1 || pageSize > 100) {
      errors.push("pageSize must be between 1 and 100");
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors,
    });
    return;
  }

  next();
}

function validateInteractionRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { jobId, interactionType } = req.body;

  const errors: string[] = [];

  if (!jobId || typeof jobId !== "string") {
    errors.push("jobId is required and must be a string");
  }

  const validTypes = [
    "viewed",
    "saved",
    "dismissed",
    "clicked_apply",
    "shared",
    "reported",
  ];
  if (!interactionType || !validTypes.includes(interactionType)) {
    errors.push(`interactionType must be one of: ${validTypes.join(", ")}`);
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors,
    });
    return;
  }

  next();
}