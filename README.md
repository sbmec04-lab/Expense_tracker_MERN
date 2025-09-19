
# Expense Tracker - MERN Stack

A full-stack web application built with the MERN (MongoDB, Express, React, Node.js) stack that allows users to track their personal expenses. This application features secure user authentication, personalized dashboards with data visualization, and a modern, responsive user interface with a dark mode theme.



---
## Key Features
* **Secure User Authentication**: Users can sign up and log in securely, with authentication managed by JSON Web Tokens (JWT).
* **Full CRUD Functionality**: Users can Create, Read, Update, and Delete their personal expenses.
* **Personalized Dashboard**: Displays an overview of expenses, including monthly and daily spending summaries.
* **Data Visualization**: Interactive bar charts (using `recharts`) to visualize spending patterns over time.
* **Balance Tracking**: Users can set their monthly income/budget to track their available balance.
* **Dark Mode**: A sleek, modern dark mode theme that persists across user sessions using `localStorage`.
* **Responsive Design**: A polished and fully responsive UI that works seamlessly on desktop and mobile devices.

---
## Tech Stack

### Frontend
* **React.js** (with Vite)
* **React Router** for client-side routing
* **Axios** for API calls
* **Recharts** for data visualization
* **CSS** with custom properties for theming

### Backend
* **Node.js**
* **Express.js**
* **MongoDB** (with Mongoose)
* **JSON Web Tokens (JWT)** for authentication
* **bcryptjs** for password hashing
* **CORS** & **Dotenv**

---
## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites
* Node.js (v18 or later)
* npm (comes with Node.js)
* MongoDB (local installation or a cloud instance from MongoDB Atlas)

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [(https://github.com/sbmec04-lab/Expense_tracker_MERN)]
    cd expense-tracker
    ```

2.  **Backend Setup:**
    ```sh
    # Navigate to the backend folder
    cd backend

    # Install NPM packages
    npm install

    # Create a .env file in the /backend folder
    # Add your variables (see .env.example below)
    ```
    **.env.example**
    ```
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_super_secret_jwt_key
    ```
    **Start the backend server:**
    ```sh
    node server.js
    ```
    The server will be running on `http://localhost:5000`.

3.  **Frontend Setup:**
    ```sh
    # Navigate to the frontend folder from the root directory
    cd frontend

    # Install NPM packages
    npm install

    # Start the frontend development server
    npm run dev
    ```
    The app will open and run on `http://localhost:5173` (or another available port).


