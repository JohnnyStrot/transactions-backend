import {BaseController} from "./base-controller";
import {FindOptionsOrder, FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {Product} from "../entity/Product";
import console from "node:console";
import {TransactionPart} from "../entity/TransactionPart";

export class ProductController extends BaseController<Product> {

    constructor() {
        super(Product);
    }

    protected initializeRoutes() {
        this.router.get("/search-with-price", this.searchWithPrice.bind(this));
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

    protected async searchWithPrice(req, res) {
        var qb;

        qb = this.repository.createQueryBuilder("p")
            .leftJoinAndSelect("p.producer", "producer")
            .leftJoin(qb => {
                    qb = qb.select('tp.value', 'sum')
                        .addSelect("tp.productId", "productId")
                        .addSelect("t.timestamp", "timestampLastTransaction")
                        .addSelect("ROW_NUMBER() OVER (PARTITION BY productId ORDER BY partner.id = :partner ASC, t.timestamp DESC)", "rn")
                        .from(TransactionPart, "tp")
                        .leftJoin("transaction", "t", "tp.transactionId = t.id")
                        .leftJoin("t.transactionPartner", "partner", "partner.id = t.transactionPartnerId");

                    if (req.query.partner != null) {
                        qb = qb.andWhere("(partner.id = :partner OR partner.companyId = :company)");
                    }
                    qb.setParameters({
                        partner: req.query.partner,
                        company: req.query.company
                    });

                    return qb;
                },
                'price', 'p.id=price.productId')
            .addSelect("price.sum", "p_sum")
            .orderBy("price.timestampLastTransaction", "DESC")
            .addOrderBy("p.name", "ASC")
            .where("(price.rn = 1 OR price.rn IS NULL)");

        if (req.query.name) {
            qb = qb.andWhere("(p.name LIKE :name OR (producer.name IS NOT NULL AND producer.name LIKE :name))", {name: "%" + req.query.name + "%"})
        }
        if (req.query.producer) {
            qb = qb.andWhere("(producer.name LIKE :producer)", {producer: "%" + req.query.producer + "%"});
        }
        if (req.query.take) {
            const take = Number.parseInt(req.query.take);
            if (!isNaN(take)) {
                qb = qb.limit(take);

                if (req.query.skip) {
                    const skip = Number.parseInt(req.query.skip);
                    if (!isNaN(skip)) {
                        qb = qb.offset(skip);
                    }
                }
            }
        }
        console.log(qb.getQuery());
        var prods = await qb.getMany();
        console.log(prods);
        res.send(prods.map(p => {
            return {product: p, sum: p.sum};
        }));
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