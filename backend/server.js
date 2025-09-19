import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// --- 1. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));


// --- 2. MONGOOSE MODELS (SCHEMAS) ---

// User Schema
// In UserSchema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  monthlyIncome: { type: Number, default: 0 }, // <-- ADD THIS LINE
});

// Password Hashing Middleware
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

// Expense Schema
const ExpenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true, enum: ["Food", "Travel", "Bills", "Other"] },
  date: { type: Date, default: Date.now },
});

const Expense = mongoose.model('Expense', ExpenseSchema);


// --- 3. MIDDLEWARE & HELPER FUNCTIONS ---

// JWT Token Generation
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Authentication Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};


// --- 4. EXPRESS APP & ROUTES ---
const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// --- Authentication Routes ---

// @desc    Register a new user
// @route   POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @desc    Login a user
// @route   POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});


// --- Expense Routes (Protected) ---

// @desc    Add a new expense
// @route   POST /api/expenses
app.post('/api/expenses', protect, async (req, res) => {
    const { title, amount, category, date } = req.body;
    try {
        const newExpense = new Expense({
            user: req.user.id,
            title,
            amount,
            category,
            date: date ? new Date(date) : new Date(),
        });
        const expense = await newExpense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ message: 'Server Error creating expense' });
    }
});

// @desc    Get all expenses for a user
// @route   GET /api/expenses
app.get('/api/expenses', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: 'Server Error fetching expenses' });
    }
});

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
app.delete('/api/expenses/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Ensure the user owns the expense
        if (expense.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await Expense.findByIdAndDelete(req.params.id); // Use the modern method

        res.json({ message: 'Expense removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server Error deleting expense' });
    }
});


// --- Summary Routes (Protected) ---

// @desc    Get monthly expense summary
// @route   GET /api/expenses/summary/monthly
app.get('/api/expenses/summary/monthly', protect, async (req, res) => {
  try {
    const monthlyData = await Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    const formattedData = monthlyData.map(item => ({
        label: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        total: item.total
    }));
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ message: 'Server Error getting monthly summary', error: err.message });
  }
});

// @desc    Get daily expense summary for a specific month
// @route   GET /api/expenses/summary/daily?month=YYYY-MM
app.get('/api/expenses/summary/daily', protect, async (req, res) => {
  const { month } = req.query; // Expects "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "A valid month query (YYYY-MM) is required" });
  }
  const year = parseInt(month.split('-')[0]);
  const monthNum = parseInt(month.split('-')[1]);
  try {
    const dailyData = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          $expr: {
            $and: [
              { $eq: [{ $year: '$date' }, year] },
              { $eq: [{ $month: '$date' }, monthNum] },
            ],
          },
        },
      },
      { $group: { _id: { $dayOfMonth: '$date' }, total: { $sum: '$amount' } } },
      { $sort: { '_id': 1 } },
    ]);
    const formattedData = {
        month: month,
        days: dailyData.map(d => ({ day: d._id, total: d.total }))
    };
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ message: 'Server Error getting daily summary', error: err.message });
  }
});

// --- User Routes (for income) ---
// Add these routes before the app.listen() call

// @desc    Get user's monthly income
// @route   GET /api/user/income
app.get('/api/user/income', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ monthlyIncome: user.monthlyIncome });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Set or update user's monthly income
// @route   POST /api/user/income
app.post('/api/user/income', protect, async (req, res) => {
    const { income } = req.body;
    if (typeof income !== 'number' || income < 0) {
        return res.status(400).json({ message: 'Invalid income amount' });
    }
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.monthlyIncome = income;
        await user.save();
        res.json({ monthlyIncome: user.monthlyIncome });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- 5. START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));