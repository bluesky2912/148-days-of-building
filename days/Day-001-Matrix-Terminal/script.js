const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");

// Canvas Size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Characters
const letters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()*&^%アイウエオカキクケコサシスセソ";

// Split into an array
const chars = letters.split("");

// Font Size
const fontSize = 16;

// Number of columns
const columns = Math.floor(canvas.width / fontSize);

// Drops
const drops = [];

for (let i = 0; i < columns; i++) {
    drops[i] = 1;
}

function draw() {

    // Slight fade
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff66";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {

        const text = chars[Math.floor(Math.random() * chars.length)];

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (
            drops[i] * fontSize > canvas.height &&
            Math.random() > 0.975
        ) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

setInterval(draw, 33);

// Resize Canvas
window.addEventListener("resize", () => {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

});