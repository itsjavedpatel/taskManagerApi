const { io } = require("socket.io-client");

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQ2NWY2YWQ2YWY2OTM1Nzk0YTJjZDEiLCJpYXQiOjE3NTkyMDkyMTksImV4cCI6MTc1OTIzODAxOX0.uTM3jsWq999J8hMzGBPLTltPligMOJQ1_KkIIo8gYhU";

const socket = io("http://localhost:3000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("Connected with socket id:", socket.id);
});

socket.on("notification", (data) => {
  console.log("Notification received:", data);
});

socket.emit("joinboard", "68d64c9ecd12984c276ba4c9");
socket.on("joinedboard", (data) => {
  console.log("Board joined", data);
});

// listen message from board
socket.on("boardNotification", (data) => {
  console.log("notification", data);
});

socket.on("erorr", (data) => {
  console.log("Error :", data);
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
