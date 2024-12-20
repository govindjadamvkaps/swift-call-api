import { StatusCodes } from "http-status-codes";
import User from "../models/UserModel.js";
import Call from "../models/CallModel.js";
import { findOrCreateUser } from "../utils/userexistcheck.js";
import Role from "../models/RoleModel.js";
import { Server as SocketIOServer } from "socket.io";
import { getActiveSessions } from "../utils/socketData.js";
import geoip from "geoip-country";
var activeUsersCount = 0;
//@desc create user
//@route POST '/api/call/add-user"
export const addUser = async (req, res) => {
  try {
    var newUser;
    const { username, ip } = req.body;
    const userRole = await Role.findOne({ role: "USER" });

    const userExist = await User.findOne({ username: username });
    var geo = geoip.lookup(ip);
    if (!userExist) {
      newUser = await new User({
        name: "guest",
        username: username,
        role: userRole._id,
        ip: ip,
        country: geo?.country,
      });

      await newUser.save();
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "User name already exist",
      });
    }
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User created successfully",
      data: newUser,
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
    const { username1, username2, timeDuration } = req.body;
  
    const user1 = await findOrCreateUser(username1);
    const user2 = await findOrCreateUser(username2);
   
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
    // return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    //   success: false,
    //   message: "An error occurred while fetching users",
    //   error: error.message,
    // });
  }
};

//@desc get call details
//@route GET '/api/call/get-call-details"
export const getCallDetails = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    let endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const month = parseInt(req.query.month) || 0;
    const year = parseInt(req.query.year) || 0;
    const country = req.query.country || "";

    const skip = (page - 1) * limit;

    // Ensure dates are valid
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid startDate provided",
      });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid endDate provided",
      });
    }

    // If endDate is provided but not startDate, set startDate to the beginning of time
    if (endDate && !startDate) {
      startDate = new Date(0);
    }

    // If only startDate is provided, set endDate to current date
    if (startDate && !endDate) {
      endDate = new Date();
    }

    // Match users based on country or name search
    const matchStage = {};
    if (country) matchStage.country = { $regex: country, $options: "i" };
    if (search) matchStage.name = { $regex: search, $options: "i" };

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "calls",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$userId", "$users"] },
                    ...(startDate && endDate
                      ? [
                          { $gte: ["$createdAt", startDate] },
                          {
                            $lt: [
                              "$createdAt",
                              new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
                            ],
                          },
                        ]
                      : []),
                    ...(month
                      ? [{ $eq: [{ $month: "$createdAt" }, month] }]
                      : []),
                    ...(year ? [{ $eq: [{ $year: "$createdAt" }, year] }] : []),
                  ],
                },
              },
            },
            {
              $unwind: "$users",
            },
            {
              $project: {
                connectedUserId: {
                  $cond: [{ $ne: ["$users", "$$userId"] }, "$users", null],
                },
                timeDuration: 1,
                createdAt: 1,
              },
            },
            { $match: { connectedUserId: { $ne: null } } },
          ],
          as: "calls",
        },
      },
      {
        $unwind: {
          path: "$calls",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "calls.connectedUserId",
          foreignField: "_id",
          pipeline: [{ $project: { password: 0 } }],
          as: "connectedUserDetails",
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          email: { $first: "$email" },
          avatar: { $first: "$avatar" },
          username: { $first: "$username" },
          country: { $first: "$country" },
          role: { $first: "$role" },
          calls: { $push: "$calls" },
          connectedUserDetails: {
            $push: { $arrayElemAt: ["$connectedUserDetails", 0] },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
          username: 1,
          country: 1,
          role: 1,
          connectedUserDetails: {
            $filter: {
              input: "$connectedUserDetails",
              as: "user",
              cond: { $ne: ["$$user", null] },
            },
          },
          totalCalls: { $size: "$calls" },
          totalDuration: {
            $reduce: {
              input: "$calls",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: [
                      { $eq: [{ $type: "$$this.timeDuration" }, "string"] },
                      {
                        $sum: [
                          {
                            $multiply: [
                              {
                                $toInt: {
                                  $arrayElemAt: [
                                    { $split: ["$$this.timeDuration", ":"] },
                                    0,
                                  ],
                                },
                              },
                              3600,
                            ],
                          },
                          {
                            $multiply: [
                              {
                                $toInt: {
                                  $arrayElemAt: [
                                    { $split: ["$$this.timeDuration", ":"] },
                                    1,
                                  ],
                                },
                              },
                              60,
                            ],
                          },
                          {
                            $toInt: {
                              $arrayElemAt: [
                                { $split: ["$$this.timeDuration", ":"] },
                                2,
                              ],
                            },
                          },
                        ],
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { name: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page } }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    const metadata = result[0]?.metadata[0] || { total: 0, page };
    const data = result[0]?.data || [];
    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Call details fetched successfully",
      metadata,
      data,
    });
  } catch (error) {
    console.error("Error in getCallDetails:", error);
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
    let io;
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
    if (!io) {
      io = new SocketIOServer();
    }

    const activeUsers = io ? Object.keys(io.sockets.sockets).length : 0;
    const activeUsersList = getActiveSessions();
    const totalCount = Object.values(activeUsersList).reduce((sum, session) => {
      return sum + session.length;
    }, 0);

    return res.status(StatusCodes.OK).json({
      success: true,
      allusers: allUsers,
      userCount: userCount,
      userscallTaken: usersCallTakenCount,
      totalCount,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching call details",
      error: error.message,
    });
  }
};
