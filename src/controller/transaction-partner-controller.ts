import {BaseController} from "./base-controller";
import {FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {TransactionPartner} from "../entity/TransactionPartner";

export class TransactionPartnerController extends BaseController<TransactionPartner> {

    constructor() {
        super(TransactionPartner);
    }

    protected initializeRoutes() {
    }

    buildWhere(query: any): FindOptionsWhere<TransactionPartner> | FindOptionsWhere<TransactionPartner>[] {
        if (query.filter) {
            return [{
                name: this.like(query.filter),
                city: this.like(query.city)
            }, {company: {name: this.like(query.filter)}, city: this.like(query.city)}];
        } else {
            return {
                name: this.like(query.name),
                company: {name: this.like(query.company)},
                city: this.like(query.city)
            };
        }
    }

    getOneRelations() {
        return {company: true};
    }

    getAllRelations(): FindOptionsRelations<TransactionPartner> {
        return {company: true};
    }

    async updateEntity(id: number, received: any) {
        received.transactions = undefined;
        await this.repository.update(id, received);
    }

    buildOrder(query: any): {} {
        return {name: "ASC"};
    }
}