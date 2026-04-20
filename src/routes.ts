import {Router} from "express";
import {CompanyController} from "./controller/company-controller";
import {ProductController} from "./controller/product-controller";
import {TransactionController} from "./controller/transaction-controller";
import {TransactionPartnerController} from "./controller/transaction-partner-controller";
import {AnalysisController} from "./controller/analysis-controller";

const router = Router();

const analysisController = new AnalysisController();
router.use("/analysis", analysisController.router);

const companyController = new CompanyController();
router.use("/company", companyController.router);

const productController = new ProductController();
router.use("/product", productController.router);

const transactionController = new TransactionController();
router.use("/transaction", transactionController.router);

const transactionPartnerController = new TransactionPartnerController();
router.use("/transaction-partner", transactionPartnerController.router);

router.use("/image-upload", require("./controller/image-upload-controller"));

module.exports = router;