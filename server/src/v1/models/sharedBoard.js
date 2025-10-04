const mongoose = require('mongoose')
const Schema = mongoose.Schema
const {schemaOptions} = require('./modelOptions')

const idSchema = new Schema({
        userid:{
            type:Schema.Types.ObjectId,
            ref:'User',
            required:true
        }
})
const sharedSchema = new Schema({
    users:[idSchema],
    icon:{
        type:String,
        default:'📃'
    },
    title:{
        type:String,
        default:'Untitled'
    },
    description:{
        type:String,
        default: `Add description here
    🟢 You can add multiline description
    🟢 Let's start...`
    },
    position:{
        type:Number
    },
    favourite:{
        type:Boolean,
        default:false
    },
    favoutitePosition:{
        type:Number,
        default:0
    }
},schemaOptions)

module.exports = mongoose.model('SharedBoard',sharedSchema)