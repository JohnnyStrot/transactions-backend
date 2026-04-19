require('dotenv').config();

import {AppDataSource} from "./data-source";
import express from 'express';
import * as console from "node:console";

const keycloak = require('./keycloak');

const port = process.env.PORT;

// Routes
const routes = require('./routes');

const app = express();

app.use(keycloak.middleware());
app.use(express.json());

// Register routes
app.use('/',
    [
        keycloak.protect("transactions")
    ],
    routes);

AppDataSource.initialize().then(() => {
    console.log("Data source initialized");
    app.listen(port, () => {
        console.log(`Server Started at ${port}`);
    });
});