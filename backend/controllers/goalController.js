const asyncHandler = require('express-async-handler')
//@desc     Get Goals
//@route    Get /api/goals
//@access   Private 
const getGoals = asyncHandler (async (req,res) => {
    console.log(req.body)
    res.status(200).json({message: 'got goals'})

})

//@desc     Set a Goal
//@route    POST /api/goals
//@access   Private 
const setGoal = asyncHandler(async (req,res) => {
    if(!req.body.text){
        res.status(400)
        throw new Error('Please add a text field')
    }
    res.status(200).json({message: 'set goals'})
})

//@desc     Update a Goal
//@route    PUT /api/goals/:id
//@access   Private 
const updateGoal = asyncHandler(async (req,res) => {
    res.status(200).json({message: `update goal ${req.params.id}`})
})

//@desc     Delete a Goal
//@route    DELETE /api/goals/:id
//@access   Private 
const deleteGoal = asyncHandler(async (req,res) => {
    res.status(200).json({message: `delete goal ${req.params.id}`}) 
})

module.exports = {
    getGoals,
    setGoal,
    updateGoal,
    deleteGoal
} 