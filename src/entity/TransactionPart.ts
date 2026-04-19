import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm"
import {Product} from "./Product"
import {Transaction} from "./Transaction"
import {ColumnNumericTransformer} from "../ColumnNumericTransformer";
import {AbstractEntity} from "./AbstractEntity";


@Entity()
export class TransactionPart extends AbstractEntity<TransactionPart> {

    toJSON() {
        const a = {} as any;

        a.id = this.id;
        a.value = this.value;
        a.purpose = this.purpose;
        a.amount = this.amount;

        if (this.product)
            a.product = this.product.toJSON();
        if (this.transaction)
            a.transaction = this.transaction.toJSON();

        return a;
    }

    merge(ent: Partial<TransactionPart>): TransactionPart {
        this.id = ent.id;
        this.value = ent.value;
        this.amount = ent.amount;
        this.purpose = ent.purpose;

        return this;
    }

    static fromJSON(json: any) {
        const transactionPart = new TransactionPart();

        transactionPart.merge(json);

        if (json.product) {
            transactionPart.product = Product.fromJSON(json.product);
        }
        if (json.transaction) {
            transactionPart.transaction = Transaction.fromJSON(json.transaction);
        }
        return transactionPart;
    }

    @PrimaryGeneratedColumn()
    id?: number

    @Column({type: "decimal", precision: 10, scale: 2, default: 0, transformer: new ColumnNumericTransformer()})
    value: number = -0

    @Column({type: "decimal", precision: 10, scale: 3, nullable: true, transformer: new ColumnNumericTransformer()})
    amount?: number | null = null

    @Column({type: 'varchar', length: 127, nullable: true})
    purpose: string = ""

    @ManyToOne(type => Product, product => product.transaction_parts, {nullable: true, onDelete: "SET NULL"})
    product?: Product | null

    @ManyToOne(type => Transaction, transaction => transaction.transactionParts, {
        nullable: true,
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    })
    transaction?: Transaction | null

    toString() {
        const cont = (this.amount != null ? " " + this.amount + (this.product != null ? (this.product.size != null || this.product.unit == null ? "" : this.product.unit) : "") : "") + ((this.product != null ? " " + this.product.toString() : "") + (this.purpose == null ? "" : " " + this.purpose));
        return (this.value + "€" + (cont.trim() != "" ? ": " + cont : ""));
    }
}