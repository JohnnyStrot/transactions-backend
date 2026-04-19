import {BaseController} from "./base-controller";
import {FindOptionsRelations, FindOptionsWhere} from "typeorm";
import {Company} from "../entity/Company";

export class CompanyController extends BaseController<Company> {

    constructor() {
        super(Company);
    }

    protected initializeRoutes() {
    }

    buildWhere(query: any): FindOptionsWhere<Company> | FindOptionsWhere<Company>[] {
        if (query.filter) {
            return [{name: this.like(query.filter)}];
        } else {
            return {name: this.like(query.name)};
        }
    }

    getOneRelations() {
        return {};
    }

    getAllRelations(): FindOptionsRelations<Company> {
        return {};
    }

    async updateEntity(id: number, received: any) {
        received.subsidiaries = undefined;
        received.products = undefined;
        await this.repository.update(id, received);
    }

    buildOrder(query: any): {} {
        return {name: "ASC"};
    }
}