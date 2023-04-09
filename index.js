const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const cors = require('cors');
const fs = require('fs');

// Set up cors to allow cross-origin requests
app.use(cors());

// Serve static files from the 'public' directory
app.use('/download', express.static('zips'));

// Set up multer to upload files to the 'uploads' directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage
});



// Set up a route to handle file uploads
app.post('/upload', upload.single('video'), (req, res) => {
  // Call FFmpeg command after upload is complete
  const videoName = req.file.originalname;
  const command = `ffmpeg -i "./uploads/${videoName}" "./output-frames/output_%06d.jpg"`;
  const zipName = videoName.substring(0, videoName.lastIndexOf('.')) || videoName;
  const zipPath = `./zips/${zipName}.zip`;
  const zipCommand = `zip -r "${zipPath}" ./output-frames`;
  const directory = './output-frames';

  exec(command, { cwd: path.join(__dirname) }, (error, stdout, stderr) => {
    if (error) {
      console.error(`FFmpeg error: ${error}`);
      res.status(500).send('Error processing video file');
    } else {
      console.log(`FFmpeg output: ${stdout}`);
      exec(zipCommand, { cwd: path.join(__dirname) }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Zip error: ${error}`);
          res.status(500).send('Error processing video file');
        } else {
          console.log(`Zip output: ${stdout}`);
          const fileStats = fs.statSync(zipPath);
          const fileSize = fileStats.size;

          // Delete contents of the output-frames directory
          fs.readdir(directory, (err, files) => {
            if (err) throw err;

            for (const file of files) {
              fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
              });
            }
          });

          const readStream = fs.createReadStream(zipPath);
          res.set({
            'Content-Disposition': `attachment; filename=${zipName}.zip`,
            'Content-Type': 'application/zip',
            'Content-Length': fileSize
          });
          readStream.pipe(res);
        }
      });
    }
  });
});



// Start the server
app.listen(80, () => {
  console.log('Server is listening on port 80');
});
