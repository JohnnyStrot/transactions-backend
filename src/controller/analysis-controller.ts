import {Router} from "express";
import {AppDataSource} from "../data-source";
import {Transaction} from "../entity/Transaction";

export class AnalysisController {

    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get("/dashboard-general", this.dashboardGeneral.bind(this));
    }

    as

    async dashboardGeneral(req, res, next) {
        const transactionRepo = AppDataSource.getRepository(Transaction);
        var table = transactionRepo.createQueryBuilder('transaction').innerJoin("transaction.transactionParts", "transactionPart").leftJoin("transactionPart.product", "product")
        // Sum overall
        const r1: any = await table.select("SUM(transactionPart.value)", "totalSum").where("productId IS NULL OR product.name != 'Kredit'").getRawOne();
        // Sum in last 30 days
        const r2: any = await table.select("SUM(transactionPart.value)", "totalSum30days").where("(productId IS NULL OR product.name != 'Kredit') AND (transaction.timestamp >= NOW() - INTERVAL 30 DAY)").getRawOne();
        // Credit values of transaction partners
        const r3: any = await transactionRepo.createQueryBuilder('transaction').innerJoin("transaction.transactionParts", "transactionPart").leftJoin("transactionPart.product", "product").leftJoin("transaction.transactionPartner", "transactionPartner").leftJoin("transactionPartner.company", "company")
            .select("SUM(value)", "value").addSelect(["company.name", "transactionPartner.name", "city", "street", "house_number", "postcode"]).where("product.name = 'Kredit'").groupBy("transactionPartner.id").having("SUM(value) != 0").orderBy("ABS(SUM(value))", "DESC").getRawMany();
        //const r4: any = await transactionRepo.query("SELECT timestamp AS date, value AS val, SUM(value) OVER(ORDER BY timestamp RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS value FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId");
        // Top ten transactions partners by positive summed value
        const r5: any = await transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) > 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        // Top ten transaction partners by negative summed value
        const r6: any = await transactionRepo.query("SELECT ABS(SUM(value)) AS value, CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END AS name FROM (SELECT ABS(SUM(value)) AS value, IFNULL(company.name, transaction_partner.name) as name, ROW_NUMBER() OVER(ORDER BY ABS(SUM(value)) DESC) AS RowNumber FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId JOIN transaction_partner ON transaction_partner.id=transactionPartnerId LEFT JOIN company ON company.id=transaction_partner.companyId LEFT JOIN product ON product.id=transaction_part.productId WHERE product.id IS NULL OR product.name != 'Kredit' GROUP BY IFNULL(company.name, transaction_partner.name) HAVING SUM(value) < 0) as AggregateQuery GROUP BY CASE WHEN RowNumber > 9 THEN 'Sonstige' ELSE name END ORDER BY ABS(SUM(value)) DESC");
        // Sum of all transactions per month
        const r7: any = await transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE productId IS NULL OR product.name != 'Kredit' GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)");
        // Sum of all transactions per day
        const r8: any = await transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE productId IS NULL OR product.name != 'Kredit' GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-%d') as DATE)");
        // Sum of all expenses per month
        const r9: any = await transactionRepo.query("SELECT SUM(value) AS value, CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE) AS name FROM transaction JOIN transaction_part ON transaction.id=transaction_part.transactionId LEFT JOIN product ON product.id=transaction_part.productId WHERE (productId IS NULL OR product.name != 'Kredit') AND value < 0 GROUP BY CAST(DATE_FORMAT(timestamp ,'%Y-%m-01') as DATE)");

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