const Shared = require('../models/sharedBoard')
const Section = require('../models/section')
const Task = require('../models/task')
const { default: mongoose } = require('mongoose')


exports.create = async(req,res)=>{
     try {
    const boardsCount = await Shared.find().count()
    const board = await Shared.create({
      // user: req.user._id,
      users: [{userid:req.user._id}],
      position: boardsCount > 0 ? boardsCount : 0
    })
    res.status(201).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.addSharedUser = async(req,res)=>{
  console.log(req.body.name)
  console.log(req.params)
   const board = await Shared.find({_id:req.params.boardId})
   //console.log(...board.users.add(req.body.name));
   if (!board) return res.status(404).json('Board not found')

  await Shared.findByIdAndUpdate(req.params.boardId,{$push:{users:{userid:mongoose.Types.ObjectId(req.body.name)}}});
}

exports.getAll = async (req, res) => {
  try {
    //console.log(req.user._id)
    //const boards = await Shared.find({ 'users.userid': req.user._id }).sort('-position')
    console.log(req.user._id)
    const boards = await Shared.find({users:{$elemMatch:{"userid":req.user._id}}}).sort('-position')  
    console.log(boards)
    res.status(200).json(boards)
  } catch (err) { 
    res.status(500).json(err)
  }
}


exports.updatePosition = async (req, res) => {
  const { boards } = req.body
  try {
    for (const key in boards.reverse()) {
      const board = boards[key]
      await Shared.findByIdAndUpdate(
        board.id,
        { $set: { position: key } }
      )
    }
    res.status(200).json('updated')
  } catch (err) {
    res.status(500).json(err)
  }
}


exports.getOne = async (req, res) => {
  const { boardId } = req.params
  try {
    const board = await Shared.findOne({ "users.userid": req.user._id, _id: boardId })
    if (!board) return res.status(404).json('Board not found')
    const sections = await Section.find({ board: boardId })
    for (const section of sections) {
      const tasks = await Task.find({ section: section.id }).populate('section').sort('-position')
      section._doc.tasks = tasks
    }
    board._doc.sections = sections
    res.status(200).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}


exports.update = async (req, res) => {
  const { boardId } = req.params
  const { title, description, favourite } = req.body

  try {
    if (title === '') req.body.title = 'Untitled'
    if (description === '') req.body.description = 'Add description here'
    const currentBoard = await Shared.findById(boardId)
    if (!currentBoard) return res.status(404).json('Board not found')

    if (favourite !== undefined && currentBoard.favourite !== favourite) {
      const favourites = await Shared.find({
        users: currentBoard.users,
        favourite: true,
        _id: { $ne: boardId }
      }).sort('favouritePosition')
      if (favourite) {
        req.body.favouritePosition = favourites.length > 0 ? favourites.length : 0
      } else {
        for (const key in favourites) {
          const element = favourites[key]
          await Shared.findByIdAndUpdate(
            element.id,
            { $set: { favouritePosition: key } }
          )
        }
      }
    }

    const board = await Shared.findByIdAndUpdate(
      boardId,
      { $set: req.body }
    )
    res.status(200).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}



exports.getFavourites = async (req, res) => {
  try {
    const favourites = await Shared.find({
      "users.userid": req.user._id,
      favourite: true
    }).sort('-favouritePosition')
    res.status(200).json(favourites)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.updateFavouritePosition = async (req, res) => {
  const { boards } = req.body
  try {
    for (const key in boards.reverse()) {
      const board = boards[key]
      await Shared.findByIdAndUpdate(
        board.id,
        { $set: { favouritePosition: key } }
      )
    }
    res.status(200).json('updated')
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.delete = async (req, res) => {
  const { boardId } = req.params
  try {
    const sections = await Section.find({ board: boardId })
    for (const section of sections) {
      await Task.deleteMany({ section: section.id })
    }
    await Section.deleteMany({ board: boardId })

    const currentBoard = await Shared.findById(boardId)

    if (currentBoard.favourite) {
      const favourites = await Shared.find({
        user: currentBoard.user,
        favourite: true,
        _id: { $ne: boardId }
      }).sort('favouritePosition')

      for (const key in favourites) {
        const element = favourites[key]
        await Shared.findByIdAndUpdate(
          element.id,
          { $set: { favouritePosition: key } }
        )
      }
    }

    await Shared.deleteOne({ _id: boardId })

    const boards = await Shared.find().sort('position')
    for (const key in boards) {
      const board = boards[key]
      await Shared.findByIdAndUpdate(
        board.id,
        { $set: { position: key } }
      )
    }

    res.status(200).json('deleted')
  } catch (err) {
    res.status(500).json(err)
  }
}


