const asyncHandler = require("express-async-handler");
const Goal = require("../models/goalModel");
const User = require("../models/userModel");

//@desc     Get Goals
//@route    Get /api/goals
//@access   Private
const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user._id });
  res.status(200).json(goals);
});

//@desc     Set a Goal
//@route    POST /api/goals
//@access   Private
const setGoal = asyncHandler(async (req, res) => {
  if (!req.body.text) {
    res.status(400);
    throw new Error("Please add a text field");
  }

  const goal = await Goal.create({
    text: req.body.text,
    user: req.user.id,
  });
  res.status(200).json(goal);
});

//@desc     Update a Goal
//@route    PUT /api/goals/:id
//@access   Private
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    res.status(400);
    throw new Error("Goal not Found");
  }

  const user = await User.findById(req.user.id);
  //check for user
  if (!user) {
    res.status(401);
    throw new Error("User not Found");
  }

  if (goal.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User not Authorized");
  }

  const updatedGoal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.status(200).json(updatedGoal);
});

//@desc     Delete a Goal
//@route    DELETE /api/goals/:id
//@access   Private
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  console.log(goal);
  if (!goal) {
    res.status(400);
    throw new Error("Goal not Found");
  }

  const user = await User.findById(req.user.id);
  //check for user
  if (!user) {
    res.status(401);
    throw new Error("User not Found");
  }

  if (goal.user.toString() !== user.id) {
    res.status(401);
    throw new Error("User not Authorized");
  }

  await goal.deleteOne();

  res.status(200).json({ id: goal.id });
});

module.exports = {
  getGoals,
  setGoal,
  updateGoal,
  deleteGoal,
};
