# MongoDB Cloud (Atlas) Setup Guide

This guide walks you step-by-step through setting up a **Free MongoDB Cloud (Atlas)** database cluster and connecting it to your **Premium DTS Outgoing Web Application**.

---

## Step 1: Create a Free MongoDB Atlas Account
1. Open your browser and go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. Sign up for a free account (or log in with your Google account).
3. Complete the quick onboarding questionnaire.

---

## Step 2: Create a Free Database Cluster
1. On the **Deploy a database** page, select the **M0 FREE** shared cluster option.
2. Choose your preferred Cloud Provider (AWS, Google Cloud, or Azure) and select a region close to you (e.g., Singapore or N. Virginia).
3. Set your **Cluster Name** (e.g., `Cluster0` or `DTS-Cluster`).
4. Click **Create Cluster**.

---

## Step 3: Create a Database User (Username & Password)
1. Under **Security Quickstart**, choose **Username and Password**.
2. Enter a **Username** (e.g., `dts_admin`).
3. Enter or generate a secure **Password** (e.g., `SecurePass123!`).
4. ⚠️ **IMPORTANT**: Save this username and password! You will need it in your connection string.
5. Click **Create User**.

---

## Step 4: Configure Network Access (IP Whitelist)
1. Under **Network Access**, click **Add My Current IP Address** or **Allow Access from Anywhere**.
2. For testing from any network, enter `0.0.0.0/0` in the Access List Entry.
3. Click **Add Entry**.

---

## Step 5: Get Your MongoDB Connection String URI
1. Go to the **Overview / Clusters** page in MongoDB Atlas.
2. Click the **Connect** button next to your cluster.
3. Choose **Drivers** (Node.js).
4. Copy the connection string format. It will look like this:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/dts_database?retryWrites=true&w=majority
   ```
5. Replace `<username>` with `dts_admin` (your username) and `<password>` with `SecurePass123!` (your password).

---

## Step 6: Paste Connection String into `.env` File
Open the `.env` file in the root of your project:
```env
PORT=5000
MONGODB_URI=mongodb+srv://dts_admin:SecurePass123!@cluster0.abcde.mongodb.net/dts_database?retryWrites=true&w=majority
JWT_SECRET=dts_super_secret_jwt_key_2026
```

---

## Step 7: Start the Express REST API Server
In your terminal, run:
```bash
npm run server
```

You will see:
```text
🚀 Server running on port 5000
✅ Connected successfully to MongoDB Cloud Atlas!
```

---

## Stored Schemas in MongoDB

### 1. Users Collection (`users`)
- `username`: String (Unique)
- `passwordHash`: String (Bcrypt hashed)
- `role`: String (`admin` or `user`)
- `createdAt`: Date

### 2. Documents Collection (`documents`)
- `trackingNo`: String (`DTS Tracking No.`)
- `fromOffice`: String (`From/Office`)
- `details`: String (`Document Details`)
- `receivedBy`: String (`Received By`)
- `toOffice`: String (`To/Office`)
- `date`: String (`Date`)
- `kind`: String (`forward` or `receive`)
- `createdBy`: String (`Username`)
- `createdAt`: Date
