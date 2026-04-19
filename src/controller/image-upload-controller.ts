import {AppDataSource} from "../data-source";
import express from "express";
import console from "node:console";
import {ImageUploadTypes} from "./image-upload-types";

const fs = require("fs");
const path = require("path")
const multer = require('multer')

const dotenv = require('dotenv');

dotenv.config({path: './config.env'});

var router = express.Router();

function uploadStorage(type, attr, clear_dest) {
    return multer.diskStorage({
        destination: function (req, file, callback) {
            const dest = process.env.IMAGE_FOLDER + '/' + type + '/' + attr;
            const idd = req.params["id"];

            if (!fs.existsSync(dest + "/" + idd)) {
                fs.mkdirSync(dest + "/" + idd);
            }
            if (clear_dest) {
                for (const file of fs.readdirSync(dest + "/" + idd)) {
                    fs.unlinkSync(path.join(dest + "/" + idd, file));
                }
            }
            callback(null, process.env.IMAGE_FOLDER + '/' + type + '/' + attr + '/' + idd);
        },
        filename: function (req, file, callback) {
            callback(null, file.originalname);
        }
    })
}

function uploadImage(type, attr, clear_dest) {
    return multer({storage: uploadStorage(type, attr, clear_dest)});
}

async function updateDatabase(type: string, attr: string, id: number, file: string, remove: boolean) {
    if (attr == "images") {
        if (remove) {
            await AppDataSource.manager.query("DELETE FROM " + type + "_image WHERE id = ? AND file = ?", [id, file,]);
        } else {
            const res = await AppDataSource.manager.query("SELECT * FROM " + type + "_image WHERE id = ? AND file = ?", [id, file,]);
            if (!res || res.length == 0)
                await AppDataSource.manager.query("INSERT INTO " + type + "_image VALUES (?,?)", [id, file,]);
        }
    } else {
        await AppDataSource.manager.query("UPDATE " + type + " SET " + attr + " = ? " + " WHERE id = ?", [remove ? null : file, id,]);
    }
}


for (let a of ImageUploadTypes) {
    let type = a.type;
    let attr = a.attr;
    let clear_dest = a.clear_dest;
    router.post("/" + type + "/" + attr + "/:id",
        clear_dest ? uploadImage(type, attr, clear_dest).single('file') : uploadImage(type, attr, clear_dest).array('file'),
        async (req: any, res) => {
            const id = req.params["id"];
            if (!req.file && !req.files) {
                console.log("No file received");
                return res.sendStatus(400);
            } else if (req.files) {
                console.log("Files received");
                req.files.forEach(async file => {
                    await updateDatabase(type, attr, id, file.filename, false);
                })
                return res.send({
                    files: req.files.map(c => c.filename)
                })
            } else {
                console.log('File   asdasdasdasda received');
                await updateDatabase(type, attr, id, req.file.filename, false);
                return res.send({
                    file: req.file.filename
                })
            }
        });
    router.delete("/" + type + "/" + attr + "/:id", async (req: any, res) => {
        if (!req.body.file) {
            console.log("No file name received");
            return res.sendStatus(400);

        } else {
            console.log('file name received');
            const id = req.params["id"];
            let filename = req.body.file.split("/").pop();
            let file = process.env.IMAGE_FOLDER + '/' + type + '/' + attr + "/" + id + "/" + filename;
            await updateDatabase(type, attr, id, filename, true);
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                return res.status(200).send({
                    file: "image-data/" + type + "/" + attr + "/" + id + "/" + filename
                })
            } else {
                return res.sendStatus(500);
            }
        }
    });
}

module.exports = router;
