import {AppDataSource} from "./data-source";
import express from 'express';
import * as console from "node:console";
import {Product} from "./entity/Product";

require('dotenv').config();

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

async function fixClosureTable() {
    console.log("Fixing closure table")
    let repo = AppDataSource.getRepository(Product);
    var products = await repo.find({relations: ["parent", "producer"]});
    while (products.length > 0) {
        var product = products.shift();
        var parent = product.parent;
        while (parent != null) {
            var a = (await repo.query("SELECT * FROM product_closure WHERE id_ancestor = ? AND id_descendant = ?",
                [parent.id, product.id]));
            if (a.length == 0) {
                console.log("Adding " + parent.id + ", " + product.id)
                await repo.query("INSERT INTO product_closure VALUES (?,?)", [parent.id, product.id]);
            } else console.log(a)

            parent = (await repo.find({relations: ["parent"], where: {id: parent.id}}))[0].parent;
        }
    }
    console.log("Fixed closure table")
}

AppDataSource.initialize().then(async () => {
    console.log("Data source initialized");
    app.listen(port, () => {
        console.log(`Server Started at ${port}`);
    });
});