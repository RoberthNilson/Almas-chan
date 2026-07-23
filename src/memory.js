const mongoose = require("mongoose");
const dns = require("dns");

function getUri() {
  return process.env.MONGO_URI || "mongodb://localhost:27017/alma-chan";
}

async function connect() {
  if (mongoose.connection.readyState === 0) {
    try {
      dns.setServers(["8.8.8.8", "8.8.4.4"]);
      await mongoose.connect(getUri(), {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      console.log("🗄️ MongoDB conectado");
    } catch (err) {
      console.log("⚠️ MongoDB não disponível:", err.message);
      console.log("   Configure MONGO_URI no .env (ex: MongoDB Atlas)");
    }
  }
  return mongoose.connection;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function mustConnect() {
  if (!isConnected()) await connect();
  return isConnected();
}

function toObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject({ virtuals: true });
  obj.id = obj._id.toString();
  delete obj.__v;
  return obj;
}

function toArr(docs) {
  return docs.map(d => toObj(d));
}

// --- Schemas ---
const factSchema = new mongoose.Schema({
  user_id: { type: String, default: "default", index: true },
  fact: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  name: String,
  preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  role: String,
  content: String,
  created_at: { type: Date, default: Date.now },
});

const learningLogSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  summary: String,
  created_at: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
  user_id: { type: String, default: "default", index: true },
  title: String,
  description: { type: String, default: "" },
  priority: { type: String, default: "normal" },
  due_date: String,
  category: { type: String, default: "" },
  recurring: String,
  status: { type: String, default: "pending" },
  created_at: { type: Date, default: Date.now },
  completed_at: Date,
});

const eventSchema = new mongoose.Schema({
  user_id: { type: String, default: "default", index: true },
  title: String,
  description: { type: String, default: "" },
  start_time: String,
  end_time: String,
  location: { type: String, default: "" },
  created_at: { type: Date, default: Date.now },
});

const reminderSchema = new mongoose.Schema({
  user_id: { type: String, default: "default", index: true },
  title: String,
  remind_at: Date,
  recurring: String,
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

const Fact = mongoose.model("Fact", factSchema);
const User = mongoose.model("User", userSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
const LearningLog = mongoose.model("LearningLog", learningLogSchema);
const Task = mongoose.model("Task", taskSchema);
const Event = mongoose.model("Event", eventSchema);
const Reminder = mongoose.model("Reminder", reminderSchema);

// --- Memory ---
async function rememberFact(fact) {
  await connect();
  try {
    await Fact.create({ fact, user_id: "default" });
  } catch {}
}

async function getFacts() {
  await connect();
  return (await Fact.find({ user_id: "default" }).sort({ _id: 1 })).map(r => r.fact);
}

async function forgetFact(index) {
  await connect();
  const rows = await Fact.find({ user_id: "default" }).sort({ _id: 1 });
  if (index >= 0 && index < rows.length) {
    await Fact.deleteOne({ _id: rows[index]._id });
  }
}

async function setUserName(userId, name) {
  await connect();
  await User.updateOne({ user_id: userId }, { $set: { name } }, { upsert: true });
}

async function getUserName(userId) {
  await connect();
  const row = await User.findOne({ user_id: userId });
  return row?.name || null;
}

async function setPreference(userId, key, value) {
  await connect();
  await User.updateOne(
    { user_id: userId },
    { $set: { [`preferences.${key}`]: value } },
    { upsert: true }
  );
}

async function getPreferences(userId) {
  await connect();
  const row = await User.findOne({ user_id: userId });
  return row?.preferences || {};
}

async function saveConversation(userId, role, content) {
  await connect();
  await Conversation.create({ user_id: userId, role, content });
}

async function getConversationHistory(userId, limit = 20) {
  await connect();
  const rows = await Conversation.find({ user_id: userId })
    .sort({ _id: -1 }).limit(limit);
  return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

async function clearConversationHistory(userId) {
  await connect();
  await Conversation.deleteMany({ user_id: userId });
}

async function saveLearningLog(userId, summary) {
  await connect();
  await LearningLog.create({ user_id: userId, summary });
}

async function getLearningLogs(userId, limit = 7) {
  await connect();
  const rows = await LearningLog.find({ user_id: userId })
    .sort({ _id: -1 }).limit(limit);
  return rows.map(r => ({ summary: r.summary, created_at: r.created_at }));
}

// --- Tasks ---
async function addTask(userId, title, description, priority, dueDate, category, recurring) {
  await connect();
  const task = await Task.create({
    user_id: userId, title, description: description || "",
    priority: priority || "normal", due_date: dueDate || null,
    category: category || "", recurring: recurring || null,
  });
  return toObj(task);
}

async function listTasks(userId, status) {
  await connect();
  const filter = { user_id: userId };
  if (status) filter.status = status;
  return toArr(await Task.find(filter).sort({ due_date: 1, _id: -1 }));
}

async function completeTask(userId, id) {
  await connect();
  const task = await Task.findOneAndUpdate(
    { _id: id, user_id: userId },
    { $set: { status: "done", completed_at: new Date() } },
    { new: true }
  );
  return toObj(task);
}

async function deleteTask(userId, id) {
  await connect();
  await Task.deleteOne({ _id: id, user_id: userId });
}

// --- Events ---
async function addEvent(userId, title, description, startTime, endTime, location) {
  await connect();
  const ev = await Event.create({
    user_id: userId, title, description: description || "",
    start_time: startTime, end_time: endTime || null, location: location || "",
  });
  return toObj(ev);
}

async function listEvents(userId, date) {
  await connect();
  const filter = { user_id: userId };
  if (date) {
    filter.start_time = { $regex: `^${date}` };
  } else {
    filter.start_time = { $gte: new Date().toISOString().slice(0, 10) };
  }
  return toArr(await Event.find(filter).sort({ start_time: 1 }).limit(20));
}

async function deleteEvent(userId, id) {
  await connect();
  await Event.deleteOne({ _id: id, user_id: userId });
}

// --- Reminders ---
async function addReminder(userId, title, remindAt, recurring) {
  await connect();
  const rem = await Reminder.create({
    user_id: userId, title, remind_at: remindAt, recurring: recurring || null,
  });
  return toObj(rem);
}

async function getDueReminders() {
  await connect();
  return toArr(await Reminder.find({ active: true, remind_at: { $lte: new Date() } }));
}

async function deactivateReminder(id) {
  await connect();
  await Reminder.updateOne({ _id: id }, { $set: { active: false } });
}

module.exports = {
  connect, rememberFact, getFacts, forgetFact,
  setUserName, getUserName, setPreference, getPreferences,
  saveConversation, getConversationHistory, clearConversationHistory,
  saveLearningLog, getLearningLogs,
  addTask, listTasks, completeTask, deleteTask,
  addEvent, listEvents, deleteEvent,
  addReminder, getDueReminders, deactivateReminder,
};
