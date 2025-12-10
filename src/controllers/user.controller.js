import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }

  } catch (error) {
    throw new apiError(500, "Something went wrong while generating tokens");
  }
}


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


const loginUser = asyncHandler(async (req, res) => {
  //steps to login user

  //get login credentials from frontend req body sey data lengy
  //check if user is registered with given email
  //match password
  //generate tokens acc and ref
  //send cookie
  //send response

  //get login credentials from frontend req body sey data lengy
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new apiError(400, "Email or Username is required to login");
  }
  //here is alternative code for logic when we dont know what will come form frontend
  // if(!(username || email)) {
  //    throw new apiError(400, "username or email required")
  //}


  //check if user is registered with given email or username
  const user = await User.findOne({
    $or: [{ email }, { username }]
  })
  if (!user) {
    throw new apiError(404, "User not found with given email or username");
  }
  //match password
  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid password");
  }
  //generate tokens acc and ref
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
  //remove password and refreshToken from user object
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  //send cookie

  const options = {
    httpOnly: true,
    secure: true
  }
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully."
      )
    )

});


const logoutUser = asyncHandler(async (req, res) => {
  //steps to logout user

  //get user from req.user
  //remove refreshToken from db
  //clear cookies
  //send response

  //get user from req.user
  //remove refreshToken from db
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true,
  }

  //clear cookies
  //send response

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new apiResponse(
        200,
        null,
        "User logged out successfully."
      )
    )

});



export {
  registerUser,
  loginUser,
  logoutUser
};