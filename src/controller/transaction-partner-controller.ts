import {BaseController} from "./base-controller";
import {FindOptionsOrder, FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {TransactionPartner} from "../entity/TransactionPartner";

export class TransactionPartnerController extends BaseController<TransactionPartner> {

    constructor() {
        super(TransactionPartner);
    }

    protected initializeRoutes() {
        this.router.get("/search-partner", this.searchPartner.bind(this));
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

    buildOrder(query: any): FindOptionsOrder<TransactionPartner> {
        return {favorite: "DESC", name: "ASC"};
    }

    async searchPartner(req, res) {
        var qb;


        var dateEnd = new Date(Date.now())
        var dateStart = new Date(Date.now() - 10368000000)

        qb = this.repository.createQueryBuilder("tp")
            .leftJoinAndSelect("tp.company", "company")
            .leftJoin("transaction", "t", "tp.id = t.transactionPartnerId")
            .addSelect('COUNT(t.id)', 'tp_count')
            .orderBy('tp_count', "DESC")
            //.where("t.timestamp >= :dateStart AND t.timestamp <= :dateEnd", {dateStart: dateStart, dateEnd: dateEnd})
            .groupBy("tp.id");
        if (req.query.search) {
            qb = qb.andWhere("(tp.name LIKE :search OR (company.name IS NOT NULL AND company.name LIKE :search))", {search: "%" + req.query.search + "%"})
        }
        if (req.query.city) {
            qb = qb.andWhere("(tp.city LIKE :city)", {city: "%" + req.query.city + "%"});
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

        var tps = await qb.getMany();
        res.send(tps)

    }
}