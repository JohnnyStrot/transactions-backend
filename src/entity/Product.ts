import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent} from "typeorm"
import {Company} from "./Company"
import {TransactionPart} from "./TransactionPart"
import {AbstractEntity} from "./AbstractEntity";
import {ColumnNumericTransformer} from "../ColumnNumericTransformer";

@Entity()
@Tree("closure-table")
export class Product extends AbstractEntity<Product> {

    toJSON() {
        const a = {} as any;

        a.id = this.id;
        a.name = this.name;
        a.size = this.size;
        a.unit = this.unit;
        a.package = this.package;
        a.image_link = this.image_link;
        a.icon = this.icon;
        a.link = this.link;
        a.deposit = this.deposit;
        a.vegan = this.vegan;
        a.vegetarian = this.vegetarian;
        a.lactose_free = this.lactose_free;
        a.gluten_free = this.gluten_free;
        a.favorite = this.favorite;
        a.color = this.color;

        if (this.producer)
            a.producer = this.producer.toJSON();
        if (this.transaction_parts)
            a.transaction_parts = this.transaction_parts.map(p => p.toJSON());
        if (this.parent)
            a.parent = this.parent.toJSON();
        if (this.children)
            a.children = this.children.map(p => p.toJSON());

        a.name = this.name;

        return a;
    }

    merge(ent: Partial<Product>): Product {
        this.id = ent.id;
        this.name = ent.name;
        this.size = ent.size;
        this.unit = ent.unit;
        this.package = ent.package;
        this.image_link = ent.image_link;
        this.icon = ent.icon;
        this.link = ent.link;
        this.deposit = ent.deposit;
        this.vegetarian = ent.vegetarian;
        this.vegan = ent.vegan;
        this.lactose_free = ent.lactose_free;
        this.gluten_free = ent.gluten_free;
        this.favorite = ent.favorite;
        this.color = ent.color;

        return this;
    }

    static fromJSON(json: any) {
        const product = new Product();

        product.merge(json);

        if (json.producer) {
            product.producer = Company.fromJSON(json.producer);
        }
        if (json.transaction_parts) {
            product.transaction_parts = json.transaction_parts.map(TransactionPart.fromJSON).filter(m => m != undefined);
        }
        if (json.children) {
            product.children = json.children.map(Product.fromJSON).filter(m => m != undefined);
        }
        if (json.parent) {
            product.parent = Product.fromJSON(json.parent);
        }
        return product;
    }

    @PrimaryGeneratedColumn()
    id?: number

    @Column({type: 'varchar', length: 142, nullable: true})
    name: string = ""

    @Column({type: 'float', nullable: true})
    size?: number = undefined

    @Column({type: 'varchar', length: 7, nullable: true})
    unit?: string = ""

    @Column({type: 'varchar', length: 32, nullable: true})
    package: string = ""

    @Column({type: 'varchar', length: 512, nullable: true})
    image_link: string = ""
    @Column({type: 'varchar', length: 32, nullable: true})
    icon: string = ""

    @Column({type: 'varchar', length: 512, nullable: true})
    link: string = ""

    @Column({type: "decimal", precision: 10, scale: 2, default: 0, transformer: new ColumnNumericTransformer()})
    deposit: number = 0;

    @Column({type: 'bool', nullable: true, default: null})
    vegan: boolean | null = null

    @Column({type: 'bool', nullable: true, default: null})
    vegetarian: boolean | null = null

    @Column({type: 'bool', nullable: true, default: null})
    lactose_free: boolean | null = null

    @Column({type: 'bool', nullable: true, default: null})
    gluten_free: boolean | null = null

    @Column({type: 'bool', nullable: false, default: false})
    favorite: boolean = false

    @Column({type: 'int', nullable: false, default: 0xFF7F7F7F})
    color: number = 0xFF7F7F7F

    // Sum of transactions for analysis
    @Column({select: false, nullable: true})
    sum: string;

    @ManyToOne(type => Company, comp => comp.products, {nullable: true, onDelete: "SET NULL"})
    producer?: Company | null = null

    @OneToMany(type => TransactionPart, transaction => transaction.product, {nullable: true})
    transaction_parts?: TransactionPart[]

    @TreeChildren({cascade: true})
    children?: Product[]
    @TreeParent({onDelete: 'SET NULL'})
    parent?: Product | null

    toString() {
        return ((this.producer != null ? this.producer.toString() + " " : "") + this.name + (this.size != null ? " (" + this.size + (this.unit != null ? this.unit : "") + ")" : ""));
    }

    flatParentPath(): Product[] {
        return this.parent != undefined ? this.parent.flatParentPath().concat([this]) : [this];
    }
}
