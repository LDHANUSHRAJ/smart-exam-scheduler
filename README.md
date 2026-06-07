# Smart Exam Scheduler

A high-performance, full-stack exam preparation scheduler that uses classic computer science algorithms to generate optimal, adaptive, day-by-day study plans based on exam dates, syllabus weightage, student capability, and personal constraints.

---

## 🚀 Key Features & Algorithmic Engines

The application leverages three core algorithms to provide a conflict-free, high-yield study itinerary:

1. **Graph Coloring (Conflict Detection)**
   - **Problem:** Exam dates can overlap or be clustered close together, causing scheduling congestion.
   - **Solution:** Models the exam schedule as an undirected graph using **NetworkX**, where exams are nodes and edges connect exams scheduled too close to each other (e.g., same day or consecutive days).
   - **Output:** Computes the **chromatic number** (minimum parallel study tracks needed) and maps exams to conflict groups to ensure balanced focus distribution.

2. **0/1 Knapsack Dynamic Programming (Syllabus Allocation)**
   - **Problem:** Students have limited total preparation hours before their exams and must distribute hours to maximize revision yield.
   - **Solution:** Computes a **Priority Score** for each syllabus topic using a formula:
     $$\text{Priority} = w_{\text{exam}} \times \text{Weightage} + w_{\text{diff}} \times \text{Difficulty} - w_{\text{past}} \times \text{Past Score}$$
     Then, runs a 0/1 Knapsack DP optimizer to allocate study blocks to topics, maximizing preparation score while staying within the total study time budget.

3. **Greedy Re-scheduling (Daily Plan Adaptivity)**
   - **Problem:** Student schedules are highly dynamic. If a student skips a session, the system must immediately replan.
   - **Solution:** Iteratively packs the high-priority study sessions into available days, honoring constraints:
     - **Daily Study Hours:** Does not exceed the user's daily study limit.
     - **Sleep Schedules:** Avoids scheduling during the user's designated sleep window.
     - **Buffer Days:** Reserves days right before exams for final review.
     - **Adaptivity:** When a user marks a session as "skipped", the algorithm automatically shifts uncompleted sessions forward into subsequent open slots.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Backend** | Python 3.11 + FastAPI | High-performance async REST API, Pydantic validation |
| **Algorithms** | Pure Python + NetworkX | Graph operations and mathematical scheduling |
| **Database** | PostgreSQL | Relational storage for users, exams, topics, and sessions |
| **Cache** | Redis | Caches daily schedules for ultra-fast retrievals |
| **Frontend** | React 18 + Vite + TypeScript | Interactive, responsive SPA dashboard |
| **Styling** | Premium Vanilla CSS | Harmonious dark theme, glassmorphic cards, and micro-animations |
| **Deployment** | Docker & Compose | Containerized database, cache, backend, and frontend |

---

## 📦 Getting Started with Docker

Ensure you have **Docker** and **Docker Compose** installed.

1. **Clone or navigate** to the project directory:
   ```bash
   cd smart-exam-scheduler
   ```

2. **Spin up the stack**:
   ```bash
   docker-compose up --build
   ```

3. **Access the Application**:
   - **Frontend UI:** [http://localhost:5173](http://localhost:5173)
   - **FastAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)

---

## 🔧 Manual Local Development

If you prefer to run the services individually:

### 1. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the API server (requires PostgreSQL and Redis running locally):
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Unit Tests

Unit tests verify the math and behavior of the three core algorithms.

1. Activate your backend virtual environment.
2. Run pytest from the `backend` directory:
   ```bash
   pytest
   ```
