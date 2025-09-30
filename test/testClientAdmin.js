const { io } = require("socket.io-client");

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGQ2M2VmZDBlYzIzYjczOTAwYzk2NjgiLCJpYXQiOjE3NTkyMDk0NDYsImV4cCI6MTc1OTIzODI0Nn0.Cb_ci-FGTABgv2GTrto5G6-cNAlyqKsG67Mgl5BFpJA";

const socket = io("http://localhost:3000", {
  auth: { token: token },
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
  console.log(data);
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err.message);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
