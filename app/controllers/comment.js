'use strict'

var mongoose = require('mongoose')
var Comment = mongoose.model('Comment')
var Creation = mongoose.model('Creation')

var userFields = [
  'avatar',
  'nickname',
  'gender',
  'age',
  'breed'
]

exports.find = function *(next) {
  var feed = this.query.feed
  var cid = this.query.cid
  var id = this.query.id
  var count = 5
  var query = {
    creation: cid
  }

  if (!cid) {
    return (this.body = {
      success: false,
      err: 'id 不能为空'
    })
  }

  if (id) {
    if (feed === 'recent') {
      query._id = {'$gt': id}
    }
    else {
      query._id = {'$lt': id}
    }
  }

  var queryArray = [
    Comment
      .find(query)
      .populate('replyBy', userFields.join(' '))
      .sort({
        'meta.createAt': -1
      })
      .limit(count)
      .exec(),
    Comment.count({creation: cid}).exec()
  ]

  var data = yield queryArray

  this.body = {
    success: true,
    data: data[0],
    total: data[1]
  }
}

exports.save = function *(next) {
  var commentData = this.request.body.comment
  var user = this.session.user
  var creation = yield Creation.findOne({
    _id: commentData.creation
  })
  .exec()

  if (!creation) {
    this.body = {
      success: false,
      err: '视频不见了'
    }

    return next
  }

  var comment

  if (commentData.cid) {
    comment = yield Comment.findOne({
      _id: commentData.cid
    })
    .exec()

    var reply = {
      from: commentData.from,
      to: commentData.tid,
      content: commentData.content
    }

    comment.reply.push(reply)

    comment = yield comment.save()
  }
  else {
    comment = new Comment({
      creation: creation._id,
      replyBy: user._id,
      replyTo: creation.author,
      content: commentData.content
    })

    comment = yield comment.save()
  }

  var queryArray = [
    Comment.find({
      creation: creation._id
    })
    .populate('replyBy', userFields.join(' '))
    .sort({
      'meta.createAt': -1
    })
    .exec(),
    Comment.count({creation: creation._id}).exec()
  ]

  var data = yield queryArray

  this.body = {
    success: true,
    data: data[0],
    total: data[1]
  }
}


