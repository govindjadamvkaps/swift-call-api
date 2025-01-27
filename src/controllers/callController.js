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
    const { userId, ip } = req.body;
    const userRole = await Role.findOne({ role: "USER" });

    const userExist = await User.findOne({ _id: userId });
    var geo = geoip.lookup(ip);
    if (!userExist) {
      newUser = await new User({
        name: "guest",
        role: userRole._id,
        ip: ip,
        country: geo?.country,
      });

      await newUser.save();
    } else {
      if (!userExist?.ip) {
        await User.findByIdAndUpdate({ _id: userId }, { $set: { ip: ip } });
      }
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

    let call = await Call.findOne({ users: { $all: [user1, user2] } });
    console.log("call", call);
    if (call) {
      call.callCount = 1;
      if (call.timeDuration === 0) {
        call.timeDuration = timeDuration;

        await call.save();
      } else {
        call = new Call({
          users: [user1, user2],
          timeDuration: timeDuration,
          callCount: 1,
        });
        await call.save();
      }
    } else {
      call = new Call({
        users: [user1, user2],
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    let endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const month = parseInt(req.query.month) || 0;
    const year = parseInt(req.query.year) || 0;
    const country = req.query.country || "";

    const skip = (page - 1) * limit;

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

    if (endDate && !startDate) startDate = new Date(0);
    if (startDate && !endDate) endDate = new Date();

    const matchStage = {};
    if (country) matchStage.country = { $regex: country, $options: "i" };
    if (search) matchStage.name = { $regex: search, $options: "i" };

    const dateMatchStage = {};
    if (startDate && endDate) {
      dateMatchStage.createdAt = {
        $gte: startDate,
        $lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    if (month) {
      dateMatchStage.$expr = {
        $and: [
          { $eq: [{ $month: "$createdAt" }, month] },
          ...(year ? [{ $eq: [{ $year: "$createdAt" }, year] }] : []),
        ],
      };
    } else if (year) {
      dateMatchStage.$expr = { $eq: [{ $year: "$createdAt" }, year] };
    }

    const pipeline = [
      {
        $match: {
          country: {
            $ne: null,
            $ne: "",
            $exists: true,
          },
          ...matchStage,
          ...(Object.keys(dateMatchStage).length > 0 ? dateMatchStage : {}),
        },
      },
      {
        $lookup: {
          from: "calls",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $in: ["$$userId", "$users"] } } },
            { $match: dateMatchStage },
            {
              $project: {
                otherUser: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$users",
                        as: "u",
                        cond: { $ne: ["$$u", "$$userId"] },
                      },
                    },
                    0,
                  ],
                },
                timeDuration: 1,
              },
            },
          ],
          as: "calls",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "calls.otherUser",
          foreignField: "_id",
          as: "connectedUsers",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          country: 1,
          isRegistered: {
            $and: [
              { $ne: ["$email", null] },
              { $ne: ["$role", "super-admin"] },
            ],
          },
          totalCalls: { $size: "$calls" },
          connectedUsers: {
            $map: {
              input: "$connectedUsers",
              as: "user",
              in: {
                country: "$$user.country",
                count: {
                  $size: {
                    $filter: {
                      input: "$calls",
                      as: "call",
                      cond: { $eq: ["$$call.otherUser", "$$user._id"] },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$country",
          users: { $push: "$$ROOT" },
          totalUsers: { $sum: 1 },
          totalRegisteredUsers: {
            $sum: {
              $cond: [
                { $and: ["$isRegistered", { $ne: ["$role", "super-admin"] }] },
                1,
                0,
              ],
            },
          },
          totalCalls: { $sum: "$totalCalls" },
          connectedCountries: { $push: "$connectedUsers" },
        },
      },
      {
        $project: {
          _id: 0,
          country: "$_id",
          totalUsers: 1,
          totalRegisteredUsers: 1,
          totalCalls: 1,
          connectedCountries: {
            $reduce: {
              input: "$connectedCountries",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $project: {
          country: 1,
          totalUsers: 1,
          totalRegisteredUsers: 1,
          totalCalls: 1,
          connectedCountries: {
            $reduce: {
              input: "$connectedCountries",
              initialValue: [],
              in: {
                $cond: {
                  if: {
                    $eq: [
                      { $indexOfArray: ["$$value.country", "$$this.country"] },
                      -1,
                    ],
                  },
                  then: {
                    $concatArrays: [
                      "$$value",
                      [{ country: "$$this.country", total: "$$this.count" }],
                    ],
                  },
                  else: {
                    $map: {
                      input: "$$value",
                      as: "v",
                      in: {
                        $cond: {
                          if: { $eq: ["$$v.country", "$$this.country"] },
                          then: {
                            country: "$$v.country",
                            total: { $add: ["$$v.total", "$$this.count"] },
                          },
                          else: "$$v",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      { $sort: { country: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page, limit } }],
          data: [{ $skip: skip }, { $limit: limit }],
          summary: [
            {
              $group: {
                _id: null,
                totalUsers: { $sum: "$totalUsers" },
                totalRegisteredUsers: { $sum: "$totalRegisteredUsers" },
                totalCalls: { $sum: "$totalCalls" },
                totalCountries: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    const metadata = result[0]?.metadata[0] || { total: 0, page, limit };
    const data = result[0]?.data || [];
    const filteredSummary = result[0]?.summary[0] || {
      totalUsers: 0,
      totalRegisteredUsers: 0,
      totalCalls: 0,
      totalCountries: 0,
    };

    // Get total stats without filters
    const totalStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalRegisteredUsers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$email", null] },
                    { $ne: ["$role", "super-admin"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalCountries: { $addToSet: "$country" },
        },
      },
      {
        $lookup: {
          from: "calls",
          pipeline: [{ $group: { _id: null, totalCalls: { $sum: 1 } } }],
          as: "callStats",
        },
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          totalRegisteredUsers: 1,
          totalCountries: { $size: "$totalCountries" },
          totalCalls: { $arrayElemAt: ["$callStats.totalCalls", 0] },
        },
      },
    ]);

    const totalSummary = totalStats[0] || {
      totalUsers: 0,
      totalRegisteredUsers: 0,
      totalCalls: 0,
      totalCountries: 0,
    };

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Call details fetched successfully",
      metadata,
      data,
      filteredSummary,
      totalSummary,
    });
  } catch (error) {
    console.error("Error in getCallDetails:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
    const { startDate, endDate, month, year, country } = req.query;
    const filters = {};

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid startDate provided",
          });
        }
        filters.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid endDate provided",
          });
        }
        filters.createdAt.$lte = new Date(end.setHours(23, 59, 59, 999)); // Set to end of day
      }
    }

    // Month and year filter
    if (month || year) {
      const currentDate = new Date();
      const monthNum = month ? parseInt(month) : currentDate.getMonth() + 1;
      const yearNum = year ? parseInt(year) : currentDate.getFullYear();

      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid month or year provided",
        });
      }

      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0); // Last day of the month
      endDate.setHours(23, 59, 59, 999);

      filters.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Country filter
    if (country) {
      filters.country = { $regex: new RegExp("^" + country + "$", "i") };
    }

    const roleFound = await Role.findOne({ role: "USER" });
    if (!roleFound) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Role 'USER' not found",
      });
    }

    // Apply role filter
    filters.role = roleFound._id;

    const allUsers = await User.countDocuments(filters);
    const userCount = await User.countDocuments({
      ...filters,
      email: { $exists: true, $ne: "" },
    });

    const userscallTaken = await Call.aggregate([
      { $match: filters },
      { $unwind: "$users" },
      { $group: { _id: null, totalUsers: { $sum: 1 } } },
    ]);
    const usersCallTakenCount = userscallTaken[0]?.totalUsers || 0;

    const activeUsersList = getActiveSessions();
    const totalCount = Object.values(activeUsersList).reduce(
      (sum, session) => sum + session.length,
      0
    );

    return res.status(StatusCodes.OK).json({
      success: true,
      allusers: allUsers,
      userCount: userCount,
      userscallTaken: usersCallTakenCount,
      totalCount,
    });
  } catch (error) {
    console.error("Error in getDetails:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while fetching user details",
      error: error.message,
    });
  }
};
