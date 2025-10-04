const Board = require('../models/board')
const Section = require('../models/section')
const Task = require('../models/task')
const cacheService = require('../../services/cache.service')
const kafkaProducer = require('../../services/kafka.producer')

exports.create = async (req, res) => {
  try {
    const boardsCount = await Board.find({ user: req.user._id }).count()
    const board = await Board.create({
      user: req.user._id,
      position: boardsCount > 0 ? boardsCount : 0
    })

    // Send Kafka event
    await kafkaProducer.sendBoardEvent('created', board)

    // Invalidate user boards cache
    await cacheService.del(`user:${req.user._id}:boards`)

    res.status(201).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.getAll = async (req, res) => {
  try {
    const cacheKey = `user:${req.user._id}:boards`
    
    // Try cache first
    const boards = await cacheService.getOrSet(
      cacheKey,
      async () => {
        return await Board.find({ user: req.user._id })
          .sort('-position')
          .lean()
      },
      300 // 5 minutes cache
    )

    res.status(200).json(boards)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.updatePosition = async (req, res) => {
  const { boards } = req.body
  try {
    for (const key in boards.reverse()) {
      await Board.findByIdAndUpdate(
        boards[key].id,
        { $set: { position: key } }
      )
    }

    // Invalidate cache
    await cacheService.del(`user:${req.user._id}:boards`)

    res.status(200).json('updated')
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.getFavourites = async (req, res) => {
  try {
    const cacheKey = `user:${req.user._id}:favorites`
    
    const favourites = await cacheService.getOrSet(
      cacheKey,
      async () => {
        return await Board.find({
          user: req.user._id,
          favourite: true
        })
        .sort('-favouritePosition')
        .lean()
      },
      300 // 5 minutes cache
    )

    res.status(200).json(favourites)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.updateFavouritePosition = async (req, res) => {
  const { boards } = req.body
  try {
    for (const key in boards.reverse()) {
      await Board.findByIdAndUpdate(
        boards[key].id,
        { $set: { favouritePosition: key } }
      )
    }

    // Invalidate cache
    await cacheService.del(`user:${req.user._id}:favorites`)

    res.status(200).json('updated')
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.getOne = async (req, res) => {
  const { boardId } = req.params
  try {
    const cacheKey = `board:${boardId}:full`
    
    const board = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const board = await Board.findOne({ 
          user: req.user._id, 
          _id: boardId 
        })
        
        if (!board) return null

        const sections = await Section.find({ board: boardId })
        
        for (const section of sections) {
          const tasks = await Task.find({ section: section.id })
            .populate('section')
            .sort('-position')
          section._doc.tasks = tasks
        }
        
        board._doc.sections = sections
        
        // Update last accessed time (don't wait for it)
        Board.findByIdAndUpdate(boardId, { 
          lastAccessedAt: new Date() 
        }).exec()
        
        return board
      },
      600 // 10 minutes cache
    )

    if (!board) {
      return res.status(404).json({ message: 'Board not found' })
    }

    res.status(200).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.update = async (req, res) => {
  const { boardId } = req.params
  try {
    const board = await Board.findOne({ 
      user: req.user._id, 
      _id: boardId 
    })

    if (!board) {
      return res.status(404).json({ message: 'Board not found' })
    }

    // Update board
    Object.assign(board, req.body)
    board.incrementVersion()
    await board.save()

    // Send Kafka event
    await kafkaProducer.sendBoardEvent('updated', board, {
      updatedFields: Object.keys(req.body)
    })

    // Invalidate cache
    const keys = board.getInvalidationKeys()
    await cacheService.del(keys)

    res.status(200).json(board)
  } catch (err) {
    res.status(500).json(err)
  }
}

exports.delete = async (req, res) => {
  const { boardId } = req.params
  try {
    const board = await Board.findOne({ 
      user: req.user._id, 
      _id: boardId 
    })

    if (!board) {
      return res.status(404).json({ message: 'Board not found' })
    }

    const sections = await Section.find({ board: boardId })
    for (const section of sections) {
      await Task.deleteMany({ section: section.id })
    }
    await Section.deleteMany({ board: boardId })
    await Board.deleteOne({ _id: boardId })

    // Send Kafka event
    await kafkaProducer.sendBoardEvent('deleted', board)

    // Invalidate cache
    const keys = board.getInvalidationKeys()
    await cacheService.del(keys)

    res.status(200).json('deleted')
  } catch (err) {
    res.status(500).json(err)
  }
}