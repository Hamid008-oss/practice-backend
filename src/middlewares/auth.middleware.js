import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Middleware to verify JWT token
// if res is not used in code below then u can write _ instead of res
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      throw new apiError(401, "Unauthorized request. No token provided.");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if (!user) {
      throw new apiError(401, "Unauthorized request. User not found.");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "Unauthorized request. Invalid token.");
  }
});