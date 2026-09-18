import {BaseController} from "./base-controller";
import {Between, FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {Transaction} from "../entity/Transaction";
import {AppDataSource} from "../data-source";
import {TransactionPart} from "../entity/TransactionPart";

export class TransactionController extends BaseController<Transaction> {

    constructor() {
        super(Transaction);
    }

    protected initializeRoutes() {
        this.router.get("/create-part", this.createPart.bind(this));
    }

    buildWhere(query: any): FindOptionsWhere<Transaction> | FindOptionsWhere<Transaction>[] {
        var filter = {} as FindOptionsWhere<Transaction>;
        if (query.transactionPartner) {
            filter.transactionPartner = [{
                name: this.like(query.transactionPartner)
            }, {
                company: {name: this.like(query.transactionPartner)}
            }];
        }
        if (query.dateFrom && query.dateTo) {
            filter.timestamp = Between(new Date(query.dateFrom), new Date(query.dateTo));
        } else if (query.dateTo || query.dateFrom) {
            var date = query.dateTo ?? query.dateFrom;
            var date0 = new Date(date);
            date0.setHours(0, 0, 0, 0);
            var date1 = new Date(date0.getTime() + 60 * 60 * 24);
            filter.timestamp = Between(date0, date1);
        }
        if (query.remark) {
            filter.remark = this.like(query.remark);
        }
        if (query.partner) {
            filter.transactionPartner = [{name: this.like(query.partner)}, {company: {name: this.like(query.partner)}}];
        }
        if (query.product) {
            filter.transactionParts = {product: [{name: this.like(query.product)}, {producer: {name: this.like(query.product)}}]};
        }
        return filter;
    }

    protected async createPart(req, res) {
        var part = AppDataSource.getRepository(TransactionPart).create();
        part = await AppDataSource.getRepository(TransactionPart).save(part);
        res.json(part.toJSON());
    }

    getOneRelations(): FindOptionsRelations<Transaction> {
        return {transactionPartner: {company: true}, transactionParts: {product: {producer: true}}};
    }

    getAllRelations(): FindOptionsRelations<Transaction> {
        return {transactionPartner: {company: true}, transactionParts: {product: {producer: true}}};
    }

    async updateEntity(id: number, received: any) {
        var tps = received.transactionParts;
        received.transactionParts = undefined;
        var t = await this.repository.save(received);
        await AppDataSource.getRepository(TransactionPart).delete({transaction: t});
        for (const part of tps) {
            part.transaction = t;
            await AppDataSource.getRepository(TransactionPart).save(part);
        }
        return await this.repository.findOne({where: {id: t.id}});
    }

    buildOrder(query: any): {} {
        return {timestamp: "DESC"};
    }
}