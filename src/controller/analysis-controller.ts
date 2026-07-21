import {Router} from "express";
import {AppDataSource} from "../data-source";
import {Transaction} from "../entity/Transaction";
import {Repository, SelectQueryBuilder, TreeRepository} from "typeorm";
import {Product} from "../entity/Product";

export class AnalysisController {

    public router: Router;
    transactionRepo: Repository<Transaction>;
    productRepo: TreeRepository<Product>;

    constructor() {
        this.router = Router();
        this.transactionRepo = AppDataSource.getRepository(Transaction);
        this.productRepo = AppDataSource.getTreeRepository(Product);
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get("/dashboard-general", this.dashboardGeneral.bind(this));

        this.router.get("/sum-exp-inc", this.sumExpInc.bind(this));
        this.router.get("/product-children-sum", this.productChildrenSum.bind(this));

        this.router.get("/sum", this.sum.bind(this));
        this.router.get("/credits", this.credits.bind(this));
        this.router.get("/partners-pie-positive", this.partnersPiePositive.bind(this));
        this.router.get("/partners-pie-negative", this.partnersPieNegative.bind(this));
        this.router.get("/aggregate-monthly", this.aggregateMonthly.bind(this));
        this.router.get("/expenses-monthly", this.expensesMonthly.bind(this));
        this.router.get("/aggregate-daily", this.aggregateDaily.bind(this));
        this.router.get("/timeline", this.timeline.bind(this));
    }

    dateFromToWhere(query) {
        return (query.dateFrom != null ? " AND (timestamp >= ?)" : "") + (query.dateTo != null ? " AND (timestamp <= ?)" : "");
    }

    dateQueryParams(query) {
        var dateFrom = new Date(query.dateFrom);
        var dateTo = new Date(query.dateTo);
        var params = []
        if (query.dateFrom != null) {
            params.push(dateFrom);
        }
        if (query.dateTo != null) {
            params.push(dateTo);
        }
        return params;
    }

    async sumExpInc(req, res) {
        var params = this.dateQueryParams(req.query);
        var sum = await this.transactionRepo.query("SELECT SUM(value) as sum FROM transaction t LEFT JOIN transaction_part p ON t.id=p.transactionId LEFT JOIN product pr ON p.productId=pr.id WHERE (pr.id IS NULL OR pr.name != 'Kredit') AND " + (req.query.income ? "p.value > 0" : "p.value < 0 ") + (req.query.dateFrom != null ? " AND (t.timestamp >= ?)" : "") + (req.query.dateTo != null ? " AND (t.timestamp <= ?)" : ""), params);
        res.send({"sum": +sum[0].sum})
    }

    async productChildrenSum(req, res) {
        var id = req.query.id;
        var income = req.query.income;

        var qb;
        if (id != null) {
            qb = this.productRepo.createQueryBuilder("product").where("product.parentId = :id", {id: id});
        } else {
            qb = this.productRepo.createQueryBuilder("product").where("product.parentId IS NULL");
        }
        qb = qb
            .leftJoin("product_closure", "closure", "closure.id_ancestor = product.id")
            .leftJoin("product", "descendant", "closure.id_descendant = descendant.id")
            .leftJoin("transaction_part", "tp", "tp.productId = descendant.id").innerJoin("transaction", "t", "t.id = tp.transactionId").andWhere(income ? "tp.value > 0 " : "tp.value < 0");
        qb = this.queryBuilderDateParams(qb, req.query, "t");
        qb = qb.groupBy("product.id").addSelect("SUM(tp.value)", "product_sum");
        console.log(qb.getQueryAndParameters());
        console.log(req.query);
        var result = await qb.getMany()
        console.log(result);
        result = result.map((c: Product) => {
            var sum = c.sum;
            delete c.sum;
            return {product: c, sum: sum};
        });
        if (id == null) {
            var sum = await this.queryBuilderDateParams(this.transactionRepo.createQueryBuilder("t")
                    .leftJoin("transaction_part", "tp", "t.id = tp.transactionId")
                    .where("tp.productId IS NULL")
                    .andWhere(income ? "tp.value > 0" : "tp.value < 0"),
                req.query, "t")
                .select("SUM(tp.value) as sum").getRawOne();
            if (sum["sum"] != null)
                result.push({product: null, sum: sum["sum"]})
        }
        res.send(result);
    }

    queryBuilderDateParams<T>(qb: SelectQueryBuilder<T>, reqQuery, transactionAlias): SelectQueryBuilder<T> {
        if (reqQuery.dateFrom != null)
            qb = qb.andWhere(transactionAlias + ".timestamp >= :dateFrom", {dateFrom: new Date(reqQuery.dateFrom)});
        if (reqQuery.dateTo != null)
            qb = qb.andWhere(transactionAlias + ".timestamp <= :dateTo", {dateTo: new Date(reqQuery.dateTo)});

        return qb;
    }

    async sum(req, res) {
        var params = this.dateQueryParams(req.query);
        var sum = await this.transactionRepo.query("SELECT SUM(value) as sum FROM transaction t LEFT JOIN transaction_part p ON t.id=p.transactionId LEFT JOIN product pr ON p.productId=pr.id WHERE (pr.id IS NULL OR pr.name != 'Kredit')" + (req.query.dateFrom != null ? " AND (t.timestamp >= ?)" : "") + (req.query.dateTo != null ? " AND (t.timestamp <= ?)" : ""), params);
        res.send({"sum": +sum[0].sum})
    }

    async credits(req, res) {
        const credits: any = await this.transactionRepo.createQueryBuilder('transaction').innerJoin("transaction.transactionParts", "transactionPart").leftJoin("transactionPart.product", "product").leftJoin("transaction.transactionPartner", "transactionPartner").leftJoin("transactionPartner.company", "company")
            .select("SUM(value)", "value").addSelect(["company.name", "company.id", "transactionPartner.name", "city", "street", "house_number", "postcode", "transactionPartner.id"]).where("product.name = 'Kredit'").groupBy("transactionPartner.id").having("SUM(value) != 0").orderBy("ABS(SUM(value))", "DESC").getRawMany();
        var send = credits.map((c) => {
            return {
                transactionPartner: {
                    company: c.company_id ? {id: c.company_id, name: c.company_name} : null,
                    name: c.transactionPartner_name,
                    city: c.city,
                    street: c.street,
                    house_number: c.house_number,
                    postcode: c.postcode,
                    id: c.transactionPartner_id,
                }, value: c.value
            };
        });
        res.send(send);
    }

    async partnersPiePositive(req, res) {
        const partners: any = await this.transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) > 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        res.send(partners);
    }

    async partnersPieNegative(req, res) {
        const partners: any = await this.transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) < 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        res.send(partners);
    }

    async aggregateDaily(req, res) {
        const daily: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE) AS date FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE productId IS NULL OR product.name != 'Kredit' GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE)");
        res.send(daily);
    }

    async aggregateMonthly(req, res) {
        const monthly: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS date FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE (productId IS NULL OR product.name != 'Kredit') " + this.dateFromToWhere(req.query) + " GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)", this.dateQueryParams(req.query));
        res.send(monthly);
    }

    async expensesMonthly(req, res) {
        const expenses: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS date FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE (productId IS NULL OR product.name != 'Kredit') AND value < 0 " + this.dateFromToWhere(req.query) + " GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)", this.dateQueryParams(req.query));
        res.send(expenses);
    }

    async timeline(req, res) {
        const timeline: any = await this.transactionRepo.query("SELECT timestamp AS date, value AS value, SUM(value) OVER(ORDER BY timestamp RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS value FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId");
        res.send(timeline);
    }


    async dashboardGeneral(req, res, next) {
        var table = this.transactionRepo.createQueryBuilder('transaction').innerJoin("transaction.transactionParts", "transactionPart").leftJoin("transactionPart.product", "product")
        // Sum overall
        const r1: any = await table.select("SUM(transactionPart.value)", "totalSum").where("productId IS NULL OR product.name != 'Kredit'").getRawOne();
        // Sum in last 30 days
        const r2: any = await table.select("SUM(transactionPart.value)", "totalSum30days").where("(productId IS NULL OR product.name != 'Kredit') AND (transaction.timestamp >= NOW() - INTERVAL 30 DAY)").getRawOne();
        // Credit values of transaction partners
        const r3: any = await this.transactionRepo.createQueryBuilder('transaction').innerJoin("transaction.transactionParts", "transactionPart").leftJoin("transactionPart.product", "product").leftJoin("transaction.transactionPartner", "transactionPartner").leftJoin("transactionPartner.company", "company")
            .select("SUM(value)", "value").addSelect(["company.name", "transactionPartner.name", "city", "street", "house_number", "postcode"]).where("product.name = 'Kredit'").groupBy("transactionPartner.id").having("SUM(value) != 0").orderBy("ABS(SUM(value))", "DESC").getRawMany();
        const r4: any = await this.transactionRepo.query("SELECT timestamp AS date, value AS val, SUM(value) OVER(ORDER BY timestamp RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS value FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId");
        // Top ten transactions partners by positive summed value
        const r5: any = await this.transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) > 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        // Top ten transaction partners by negative summed value
        const r6: any = await this.transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) < 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        // Sum of all transactions per month
        const r7: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE productId IS NULL OR product.name != 'Kredit' GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)");
        // Sum of all transactions per day
        const r8: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE productId IS NULL OR product.name != 'Kredit' GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE)");
        // Sum of all expenses per month
        const r9: any = await this.transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE (productId IS NULL OR product.name != 'Kredit') AND value < 0 GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)");

        res.send({
            totalSum: r1.totalSum,
            totalSum30days: r2.totalSum30days,
            //timeline: r4,
            credit: r3,
            piePartner: [r5, r6],
            aggrMonth: r7,
            aggrDay: r8,
            expensesMonth: r9
        })
    }
}