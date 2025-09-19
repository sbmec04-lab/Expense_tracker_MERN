import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import ThemeToggle from './ThemeToggle'; // <-- 1. IMPORT THE TOGGLE

const categories = ["Food", "Travel", "Bills", "Other"];
const categoryColors = {
  Food: "#28a745",
  Travel: "#007bff",
  Bills: "#fd7e14",
  Other: "#6c757d",
};

export default function Dashboard({ token }) {
  // State for expenses and form inputs
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState("");

  // State for charts and summaries
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [dailyData, setDailyData] = useState([]);

  // State for balance and income
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  // Memoized Axios instance to prevent re-creation on every render
  const api = useMemo(() => axios.create({
    baseURL: "http://localhost:5000",
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  // --- Calculations ---
  const currentMonthTotal = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === currentMonth;
      })
      .reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  const availableBalance = monthlyIncome - currentMonthTotal;

  // --- Data Fetching and Management Functions ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [expRes, monRes, incomeRes] = await Promise.all([
        api.get("/api/expenses"),
        api.get('/api/expenses/summary/monthly'),
        api.get('/api/user/income')
      ]);

      setExpenses(expRes.data);
      setMonthlyIncome(incomeRes.data.monthlyIncome);

      const monthlySummary = monRes.data || [];
      setMonthlyData(monthlySummary);
      
      if (monthlySummary.length > 0 && !selectedMonth) {
        const lastMonthLabel = monthlySummary[monthlySummary.length - 1].label;
        setSelectedMonth(lastMonthLabel);
        const dayRes = await api.get(`/api/expenses/summary/daily?month=${lastMonthLabel}`);
        setDailyData(dayRes.data.days || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      if (err.response?.status === 401) handleLogout();
    }
  }, [api, selectedMonth]);

  useEffect(() => {
    fetchAllData();
  }, []); // Note: We only want this to run once on initial load.

  const handleMonthChange = async (newMonth) => {
    setSelectedMonth(newMonth);
    if (newMonth) {
      try {
        const res = await api.get(`/api/expenses/summary/daily?month=${newMonth}`);
        setDailyData(res.data?.days || []);
      } catch (err) {
        console.error("fetchDaily error:", err);
      }
    } else {
      setDailyData([]);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!title || !amount) return alert("Please enter title and amount.");
    try {
      const body = { title, amount: Number(amount), category, date: date || new Date().toISOString() };
      const res = await api.post("/api/expenses", body);
      setExpenses([res.data, ...expenses]); // Add to state without full refetch
      setTitle(""); setAmount(""); setCategory("Other"); setDate("");
      // You might want to refetch summary data here if a new month is added
      // fetchAllData(); 
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add expense.");
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      setExpenses(currentExpenses =>
        currentExpenses.filter(expense => expense._id !== id)
      );
    } catch (err) {
      console.error("deleteExpense error:", err);
      alert("Failed to delete the expense. Please try again.");
    }
  };

 const handleSetIncome = async () => {
    const incomeInput = prompt("Enter your total monthly income or budget:", monthlyIncome);
    if (incomeInput === null) return;
    const newIncome = parseFloat(incomeInput);
    if (isNaN(newIncome) || newIncome < 0) {
      return alert("Please enter a valid, non-negative number.");
    }
    try {
      const res = await api.post('/api/user/income', { income: newIncome });
      setMonthlyIncome(res.data.monthlyIncome); // This is the state setter from useState
      alert("Income updated successfully!");
    } catch (err) {
      alert("Failed to update income. Please try again.");
    }
};

  return (
    <div>
      <div className="header">
        <h1>Expense Tracker</h1>
      <div className="header-controls">
          <ThemeToggle /> {/* <-- 2. ADD THE TOGGLE COMPONENT */}
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="card balance-card">
        <div className="balance-row">
          <span>Monthly Income:</span>
          <span className="balance-value">₹{monthlyIncome.toFixed(2)}</span>
        <button className="btn-update" onClick={handleSetIncome}>Update</button>
        </div>
        <div className="balance-row">
          <span>Total Spent (This Month):</span>
          <span className="balance-value">₹{currentMonthTotal.toFixed(2)}</span>
        </div>
        <hr className="balance-hr" />
        <div className="balance-row final-balance">
          <span>Available Balance:</span>
          <span className={availableBalance >= 0 ? 'balance-positive' : 'balance-negative'}>
            ₹{availableBalance.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="card total-card">
        <h3>This Month's Total</h3>
        <p className="total-amount">₹{currentMonthTotal.toFixed(2)}</p>
      </div>
      
      <div className="charts-container">
        <div className="card chart-card">
          <div className="card-header"><h3>Monthly Spending</h3></div>
          {monthlyData.length > 0 ?
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="total" name="Total" fill="#007bff" /></BarChart>
            </ResponsiveContainer> : <p className="center-text">No monthly data available.</p>}
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3>Daily Breakdown for: 
              <select value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)} style={{marginLeft: '10px'}}>
                <option value="">--Select Month--</option>
                {monthlyData.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
              </select>
            </h3>
          </div>
          {dailyData.length > 0 ?
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#28a745" /></BarChart>
            </ResponsiveContainer> : <p className="center-text">No daily data for selected month.</p>}
        </div>
      </div>

      <div className="card">
        <form className="expense-form" onSubmit={addExpense}>
          <h3>Add New Expense</h3>
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01"/>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="submit">Add Expense</button>
        </form>
      </div>

      <div className="card">
        <div className="card-header"><h3>Recent Expenses</h3></div>
        <ul className="expense-list">
          {expenses.length > 0 ? expenses.map((exp) => (
            <li key={exp._id} className="expense-item">
              <div className="expense-left">
                <div className="category-badge" style={{ background: categoryColors[exp.category] }} />
                <div>
                  <div className="expense-title">{exp.title}</div>
                  <div className="expense-meta">{new Date(exp.date).toLocaleDateString()} • {exp.category}</div>
                </div>
              </div>
              <div className="expense-right">
                <div className="expense-amount">₹{exp.amount.toFixed(2)}</div>
                <button className="delete-btn" onClick={() => deleteExpense(exp._id)}>✕</button>
              </div>
            </li>
          )) : <p className="center-text">No expenses found. Add one above!</p>}
        </ul>
      </div>
    </div>
  );
}