import multer from 'multer'
import { fileURLToPath } from 'url'
import path from 'path'

// Image Upload Code

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imageLocation = path.join(__dirname, '../../public/images')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, imageLocation, function (error, success) {
      if (error) throw error
    })
  },
  filename: function (req, file, cb) {
    const fname = Date.now() + '-' + file.originalname
    return cb(null, fname, function (error, success) {
      if (error) throw error
    })
  },
})

export const upload = multer({ storage: storage })