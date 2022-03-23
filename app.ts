import express from 'express'
import { createReadStream, ReadStream, statSync } from 'fs'
import Ffmpeg from 'fluent-ffmpeg';
import cors from 'cors'

const app = express()

const port: number = 3000
const VIDEO_FILE: string = `./assets/file_example_MP4_1280_10MG.mp4`

app.use(cors())
app.set('etag', false)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    app.set('etag', false)
    next()
})

app.use(express.static("./public/"))


app.get('/video/:name', async (req, res) => {
    var name = req?.params?.name || "0xselfdestruct";
    console.log(name)
    const stat = statSync(VIDEO_FILE)

    const fileSize = stat.size
    const range = req.headers.range
    let file: ReadStream;
    if (range) {

        const parts = range.replace(/bytes=/, "").split("-");

        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunksize = (end - start) + 1;
        file = createReadStream(VIDEO_FILE, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/webm',
            'Content-Disposition': 'attachment',
            'Transfer-Encoding': 'chunked',

        }

        res.writeHead(206, head);

    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/webm',
            'Content-Disposition': 'attachment',
            // 'Transfer-Encoding': 'chunked',
        }

        res.writeHead(200, head);
        file = createReadStream(VIDEO_FILE)

    }
    const ffmpeg = Ffmpeg(file, { timeout: 6000, })
    res.on("close", () => { ffmpeg.kill("SIGKILL"); return "killed" });
    ffmpeg.inputFormat("mp4")
        .outputFormat("webm")
        .on("progress", (progress) => {
            console.log(progress.percent)
        })
        .on("error", (error) => {
            console.log(error)
        })
        .fpsOutput(8)
        .addOptions([
            "-frag_size 10485760",
            "-analyzeduration 1000000",
            "-movflags frag_keyframe+empty_moov",
            "-preset ultrafast",
        ])
        .videoFilters([
            {
                filter: 'drawtext',
                options: {
                    text: name,
                    fontsize: 75,
                    fontcolor: '#ef53533d',
                    x: "(main_w/2-text_w/2)",
                    y: "(main_h/2-text_h/2)"

                }
            }
        ])
    Ffmpeg.ffprobe(VIDEO_FILE, (err, data) => {
        ffmpeg.setDuration(data.format.duration || 0)
        ffmpeg.pipe(res, { end: true })
    })

})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



export default app