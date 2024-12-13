import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import Call from "../models/CallModel.js";
import { findOrCreateUser } from "../utils/userexistcheck.js";
import Role from "../models/RoleModel.js";

//@desc create user
//@route POST '/api/call/add-user"
export const addUser = async (req, res) => {
  try {
    var newUser;
    const { ip } = req.body;
    const userRole = await Role.findOne({ role: "USER" });
    const userExist = await User.findOne({ ip: ip });
    if (!userExist) {
      newUser = await new User({
        name: "guest",
        ip: ip,
        role: userRole._id,
      });
      await newUser.save();
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User created successfully",
      data: userExist ? userExist : newUser,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
};

//@desc add call
//@route POST '/api/call/add-call"
export const addCall = async (req, res) => {
  try {
    const { ip1, ip2, timeDuration } = req.body;
    const user1 = await findOrCreateUser(ip1);
    const user2 = await findOrCreateUser(ip2);
    if (!user1 || !user2) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Failed to find or create users",
      });
    }

    let call = await Call.findOne({ users: { $all: [user1._id, user2._id] } });

    if (call) {
      call.callCount = 1;
      if (call.timeDuration === 0) {
        call.timeDuration = timeDuration;
        console.log("call123", call);
        await call.save();
      } else {
        call = new Call({
          users: [user1._id, user2._id],
          timeDuration: timeDuration,
          callCount: 1,
        });
        await call.save();
      }
    } else {
      call = new Call({
        users: [user1._id, user2._id],
        timeDuration: timeDuration || 0,
        callCount: 1,
      });
      await call.save();
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Call added successfully",
      data: call,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
};

//@desc get call details
//@route GET '/api/call/get-call-details"
export const getCallDetails = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const skip = (page - 1) * limit;
    const filterMonth = parseInt(req.query.month, 10);
    const filterYear = parseInt(req.query.year, 10);

    if (filterMonth && (filterMonth < 1 || filterMonth > 12)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid month. Please provide a value between 1 and 12.",
      });
    }

    const matchOptions = {};
    if (filterYear || filterMonth || search) {
      matchOptions.$and = [
        ...(filterYear
          ? [{ $expr: { $eq: [{ $year: "$createdAt" }, filterYear] } }]
          : []),
        ...(filterMonth
          ? [{ $expr: { $eq: [{ $month: "$createdAt" }, filterMonth] } }]
          : []),
        ...(search
          ? [
              {
                $or: [
                  { "userDetails.name": { $regex: search, $options: "i" } },
                  { "userDetails.email": { $regex: search, $options: "i" } },
                ],
              },
            ]
          : []),
      ];

      if (matchOptions.$and.length === 0) {
        delete matchOptions.$and;
      }
    }

    const aggregationPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "users",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      { $unwind: "$userDetails" },
      ...(Object.keys(matchOptions).length > 0
        ? [{ $match: matchOptions }]
        : []),

      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page } }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const callDetails = await Call.aggregate(aggregationPipeline);
    const metadata = callDetails[0]?.metadata[0] || { total: 0, page: 1 };
    const data = callDetails[0]?.data || [];

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Call details fetched successfully",
      metadata,
      data,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching call details",
      error: error.message,
    });
  }
};

//@desc get all users,unregisterd users,all calls
//@route GET '/api/call/get-dashboard-page-details'
export const getDetails = async (req, res) => {
  try {
    const roleFound = await Role.findOne({ role: "USER" });
    if (!roleFound) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Role 'USER' not found",
      });
    }
    const allUsers = await User.countDocuments({ role: roleFound?._id });
    const userCount = await User.countDocuments({
      role: roleFound?._id,
      email: {
        $exists: true,
        $ne: "",
      },
    });
    const userscallTaken = await Call.aggregate([
      {
        $unwind: "$users",
      },
      { $count: "totalUsers" },
    ]);
    const usersCallTakenCount = userscallTaken[0]?.totalUsers || 0;
    return res.status(StatusCodes.OK).json({
      success: true,
      allusers: allUsers,
      userCount: userCount,
      userscallTaken: usersCallTakenCount,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching call details",
      error: error.message,
    });
  }
};
