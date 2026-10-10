# 🛒 DS Mart - An Interactive Data Structures Shopping Game

A full-screen interactive supermarket shopping game demonstrating **Stack (LIFO)**, **Singly Linked List**, and **Queue (FIFO)** data structures built directly in **C**.

---

## 🚀 How to Run the Project

### 1. Open Terminal in this folder
```bash
cd backend
```

### 2. Compile the C Engine
```bash
gcc -O2 ds_core.c -o ds_core.exe
```

### 3. Start the Server
```bash
node server.js
```

### 4. Open in Browser
Visit: **http://localhost:3000**

---

## 🎮 How to Play
* **Move the Cute Boy**: Use **Arrow Keys** or **W, A, S, D** (or the on-screen D-pad).
* **Collect Products (Stack Push)**: Walk up to any shelf and press **E** or **Spacebar**.
* **Remove Product (Stack Pop)**: Press **P** or click the **Pop [P]** button in the bottom-right HUD.
* **Inspect Memory (Linked List)**: Click **Linked List** in the bottom-right HUD to view pointers (`struct Node* next`) and run search traversals.
* **Billing Stage (Queue FIFO)**: Collect 4+ items and visit the **Billing Counter** to dequeue waiting customers.
* **Full Screen**: Click the **`□` Maximize** button in the title bar or press **F11** anytime!
