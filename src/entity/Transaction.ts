import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm"
import {TransactionPartner} from "./TransactionPartner"
import {TransactionPart} from "./TransactionPart"
import {AbstractEntity} from "./AbstractEntity";

@Entity()
export class Transaction extends AbstractEntity<Transaction> {

    toJSON() {
        const a = {} as any;

        a.id = this.id;
        a.timestamp = this.timestamp;
        a.remark = this.remark;

        if (this.transactionPartner)
            a.transactionPartner = this.transactionPartner.toJSON();
        if (this.transactionParts)
            a.transactionParts = this.transactionParts.map(s => s.toJSON());

        return a;
    }

    merge(ent: Partial<Transaction>): Transaction {
        this.id = ent.id;
        this.timestamp = ent.timestamp;
        this.remark = ent.remark;

        return this;
    }

    static fromJSON(json: any) {
        const transaction = new Transaction();

        transaction.merge(json);

        if (json.transactionParts) {
            transaction.transactionParts = json.transactionParts.map(TransactionPart.fromJSON).filter(m => m != undefined);
        }
        if (json.transactionPartner) {
            transaction.transactionPartner = TransactionPartner.fromJSON(json.transactionPartner);
        }
        return transaction;
    }

    @PrimaryGeneratedColumn()
    id?: number

    @Column({type: 'timestamp', nullable: true})
    timestamp: Date = new Date()

    @Column({type: 'varchar', length: 127, nullable: true})
    remark: string = ""

    @ManyToOne(type => TransactionPartner, transactionPartner => transactionPartner.transactions, {
        nullable: true,
        onDelete: "SET NULL"
    })
    transactionPartner?: TransactionPartner | null = null

    @OneToMany(type => TransactionPart, transaction => transaction.transaction, {
        nullable: true,
        eager: true,
        cascade: true
    })
    transactionParts?: TransactionPart[]

    public get value(): number {
        return Math.round((this.transactionParts == undefined ? 0 : this.transactionParts.reduce((sum, a) => sum + a.value, 0)) * 100) / 100;
    }

    toString(): string {
        return (this.timestamp.toString() + (this.transactionParts != undefined ? (" " + this.transactionParts.reduce((sum, a) => sum + a.value, 0) + "€") : "") + ((this.transactionPartner instanceof TransactionPartner) ? (" " + this.transactionPartner.toString()) : ""))
    }
}
