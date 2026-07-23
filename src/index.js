require("dotenv").config();

const mode = process.argv[2] || "web";

if (mode === "discord") {
  require("./discord");
} else {
  require("./web");
}

process.on("SIGINT", () => {
  process.exit(0);
});
