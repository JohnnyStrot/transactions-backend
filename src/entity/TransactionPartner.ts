import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm"
import {Transaction} from "./Transaction"
import {Company} from "./Company"
import {AbstractEntity} from "./AbstractEntity";

@Entity()
export class TransactionPartner extends AbstractEntity<TransactionPartner> {

    toJSON() {
        const a = {} as any;

        a.id = this.id;
        a.name = this.name;
        a.city = this.city;
        a.postcode = this.postcode;
        a.street = this.street;
        a.house_number = this.house_number;
        a.favorite = this.favorite;

        if (this.company)
            a.company = this.company.toJSON();
        if (this.transactions)
            a.transactions = this.transactions.map(s => s.toJSON());

        a.name = this.name;

        return a;
    }

    merge(ent: Partial<TransactionPartner>): TransactionPartner {
        this.id = ent.id;
        this.name = ent.name;
        this.city = ent.city;
        this.postcode = ent.postcode;
        this.street = ent.street;
        this.house_number = ent.house_number;
        this.favorite = ent.favorite;

        return this;
    }

    static fromJSON(json: any) {
        const transactionPartner = new TransactionPartner();

        transactionPartner.merge(json);

        if (json.transactions) {
            transactionPartner.transactions = json.transactions.map(Transaction.fromJSON).filter(m => m != undefined);
        }
        if (json.company) {
            transactionPartner.company = Company.fromJSON(json.company);
        }
        return transactionPartner;
    }

    @PrimaryGeneratedColumn()
    id?: number

    @Column({type: 'varchar', length: 72, nullable: true})
    name: string = ""

    @Column({type: 'varchar', length: 45, nullable: true})
    city: string = ""

    @Column({type: 'varchar', length: 5, nullable: true})
    postcode: string = ""

    @Column({type: 'varchar', length: 45, nullable: true})
    street: string = ""

    @Column({type: 'varchar', length: 10, nullable: true})
    house_number: string = ""

    @Column({type: 'bool', nullable: false, default: false})
    favorite: boolean = false

    @ManyToOne(type => Company, company => company.subsidiaries, {nullable: true, onDelete: "SET NULL"})
    company?: Company | null = null

    @OneToMany(type => Transaction, transaction => transaction.transactionPartner, {
        nullable: true,
        cascade: false,
    })
    transactions?: Transaction[]

    toString(): string {
        return ((this.company != null ? this.company.name + " " : "") + this.name + (this.city != null && this.city != "" ? " " + this.city : "") + (this.street != null && this.street != "" ? " " + this.street : "") + (this.house_number != null && this.house_number != "" ? " " + this.house_number : ""));
    }
}
