const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require('../middlewares/auth.middleware');

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['to do', 'in progress', 'done'],
    default: "to do",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  userId: String
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Email is not valid!");
        }
      },
    }
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  }
})

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this.id, email: this.email }, "Thuan");
  return token;
};

const Task = mongoose.model("Task", taskSchema);
const User = mongoose.model("User", userSchema);

const validateTask = (task) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(20).required(),
    status: Joi.string().valid('to do', 'in progress', 'done').default('to do'),
  });
  return schema.validate(task);
};

const validateUser = (user) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
  });
  return schema.validate(user);
};

router.post("/register", async (req, res) => {
  const { error } = validateUser(req?.body);
  if (error) {
    return res.status(400).send({
      message: error?.details,
    });
  }
  const user = await User.findOne({
    email: req?.body?.email,
  });
  if (user) {
    return res.status(400).send("Email exist!");
  }
  try {
    const newUser = new User({
      email: await req?.body?.email,
      password: await req?.body?.password,
    });
    const salt = await bcrypt.genSalt(8);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    const result = await newUser.save();
    return res.send({
      message: "Successful!",
      result: result,
    });
  } catch {
    res.send('Error')
  }
});

router.post("/login", async (req, res) => {
  let user = await User.findOne({
    email: req?.body?.email,
  });
  if (!user) {
    return res.status(400).send("Invalid email or password");
  }
  const isValidPassword = await bcrypt.compare(
    req?.body?.password,
    user?.password
  );
  if (!isValidPassword) {
    return res.status(400).send("Invalid email or password");
  }
  const token = user.generateAuthToken();
  res.send({
    message: "Login successful",
    token: token.toString(),
  });
});

router.get("/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({
    userId: req?.user._id
  });
  if (!tasks) {
    return res.send({
      message: 'Not found'
    })
  }
  res.send(tasks);
});

router.post("/tasks", authMiddleware, async (req, res) => {
  const { error } = validateTask(req?.body);
  if (error) {
    return res.status(400).send({
      message: error?.details,
    });
  }
  try {
    const newTask = new Task({
      name: req?.body?.name,
      status: req?.body?.status,
      userId: req?.user?._id
    });
    const result = await newTask.save()
    return res.send({
      message: "Successful!",
      result: result,
    });
  } catch {
    res.send('Error')
  }
});

router.get("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const idTask = req?.params?.id
    const itemTask = await Task.findOne({
      _id: idTask,
      userId: req?.user._id
    })
    if (!itemTask) {
      return res.send({
        message: 'Not found'
      })
    }
    return res.send({
      result: itemTask,
    });
  } catch {
    res.send('Error')
  }
});

router.put("/tasks/:id", authMiddleware, async (req, res) => {
  const { error } = validateTask(req?.body);
  if (error) {
    return res.status(400).send({
      message: error?.details,
    });
  }
  try {
    const idTask = req?.params?.id
    const itemTask = await Task.findOne({
      _id: idTask,
      userId: req?.user._id
    })
    if (!itemTask) {
      return res.send({
        message: 'Not found'
      })
    }
    Object.assign(itemTask, req?.body)
    const result = await itemTask.save()
    return res.send({
      message: 'Update successful!',
      result: result,
    });
  } catch {
    res.send('Error')
  }
});

router.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const idTask = req?.params?.id
    const itemTask = await Task.findOneAndDelete({
      _id: idTask,
      userId: req?.user._id
    })
    if (!itemTask) {
      return res.send({
        message: 'Not found'
      })
    }
    return res.send({
      message: 'Delete successful!',
      result: itemTask,
    });
  } catch {
    res.send('Error')
  }
});

module.exports = router;
