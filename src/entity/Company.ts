import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm"
import {TransactionPartner} from "./TransactionPartner"
import {Product} from "./Product"
import {AbstractEntity} from "./AbstractEntity";

@Entity()
export class Company extends AbstractEntity<Company> {

    toJSON() {
        const a = {} as any;

        a.id = this.id;

        if (this.products)
            a.products = this.products.map(p => p.toJSON());
        if (this.subsidiaries)
            a.subsidiaries = this.subsidiaries.map(s => s.toJSON());

        a.name = this.name;

        return a;
    }

    merge(ent: Partial<Company>): Company {
        this.id = ent.id;
        this.name = ent.name;

        return this;
    }

    static fromJSON(json: any) {
        const company = new Company();

        company.merge(json);

        if (json.products) {
            json.products.forEach((product) => {
                product.companyId = company.id;
            });
            company.products = json.products.map(Product.fromJSON).filter(m => m != undefined);
        }
        return company;
    }

    @PrimaryGeneratedColumn()
    id?: number

    @Column({type: 'varchar', length: 142, nullable: false})
    name: string = ""

    @OneToMany(type => Product, product => product.producer, {nullable: true})
    products?: Product[]

    @OneToMany(type => TransactionPartner, tp => tp.company, {nullable: true})
    subsidiaries?: TransactionPartner[]

    toString() {
        return this.name;
    }
}
