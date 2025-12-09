import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
  //steps to register user

  //get user details from frontend
  //validation - not empty
  //check if user already registered: email, username
  //check for imgs, check for avatar
  //upload them to cloudinary
  //create user object - create entry in db
  //remove password and refreshToken from response
  //check for user creation success
  //send response

  //get user details from frontend
  const { fullName, username, email, password } = req.body;
  // console.log("email: ", email);

  //validation - not empty
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  //check if user already registered: email, username
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existedUser) {
    throw new apiError(409, "User already registered with this email or username");
  }

  //check for imgs, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  //upload them to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //check for avatar cz its compulsory
  if (!avatar) {
    throw new apiError(400, "Avatar upload failed");
  }

  //create user object - create entry in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  //remove password and refreshToken from response and
  //check for user creation success
  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new apiError(500, "User registration failed, please try again");
  }

  //send response
  return res.status(201).json(
    new apiResponse(200, createdUser, "User registered successfully.")
  )

});


export { registerUser };