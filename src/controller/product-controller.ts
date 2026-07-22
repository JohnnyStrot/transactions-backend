import {BaseController} from "./base-controller";
import {FindOptionsOrder, FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {Product} from "../entity/Product";
import console from "node:console";

export class ProductController extends BaseController<Product> {

    constructor() {
        super(Product);
    }

    protected initializeRoutes() {
        this.router.get("/children/:id", this.getChildren.bind(this));

    }

    buildWhere(query: any): FindOptionsWhere<Product> | FindOptionsWhere<Product>[] {
        if (query.filter) {
            return [{name: this.like(query.filter)}, {producer: {name: this.like(query.filter)}}];
        } else {
            return {name: this.like(query.name), producer: {name: this.like(query.producer)}};
        }
    }

    getOneRelations(): FindOptionsRelations<Product> {
        return {producer: true, parent: {producer: true}};
    }

    getAllRelations(): FindOptionsRelations<Product> {
        return {producer: true};
    }

    protected async getChildren(req, res) {
        const item = await this.repository.findOne({
            where: {id: Number(req.params.id)} as any,
            order: this.getOneOrder(),
            relations: {children: {producer: true}}
        });
        console.log(item.children.map((c) => c.toJSON()));
        return res.json(item.children.map((c) => c.toJSON()));
    }

    async updateEntity(id: number, received: any) {
        received.transaction_parts = undefined;
        received.children = undefined;
        delete received.sum;
        await this.repository.save(received);
    }

    buildOrder(query: any): FindOptionsOrder<Product> {
        return {favorite: "DESC", name: "ASC"};
    }

    async createEntity(): Promise<Product> {
        var p = this.repository.create();
        delete p.sum;
        return await this.repository.save(p);
    }
}