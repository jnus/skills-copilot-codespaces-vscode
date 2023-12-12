// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

// Create web server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create get route
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create post route
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');

  // Get the content from the request body
  const { content } = req.body;

  // Get the comments array for the post id
  const comments = commentsByPostId[req.params.id] || [];

  // Push the new comment object to the comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Set the comments array for the post id
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  // Send response
  res.status(201).send(comments);
});

// Create event route
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  // Get the data from the request body
  const { type, data } = req.body;

  // Check if event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comment from the comments array
    const comment = commentsByPostId[data.postId].find((comment) => {
      return comment.id === data.id;
    });

    // Set the status to the comment
    comment.status = data.status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data,
    });
  }

  // Send response
  res.send({});
});

// Listen on port