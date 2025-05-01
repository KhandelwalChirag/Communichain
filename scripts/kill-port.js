const { exec } = require('child_process');

const PORT = 3000;

exec(`netstat -ano | findstr :${PORT}`, (error, stdout) => {
  if (error) {
    console.log(`No process found on port ${PORT}`);
    return;
  }

  stdout.split('\n').forEach(line => {
    const pid = line.trim().split(/\s+/).pop();
    if (pid) {
      exec(`taskkill /F /PID ${pid}`, (err) => {
        if (err) {
          console.error(`Failed to kill process ${pid}`);
        } else {
          console.log(`Killed process ${pid} on port ${PORT}`);
        }
      });
    }
  });
});