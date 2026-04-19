import {BaseEntity} from "typeorm";

export abstract class AbstractEntity<T extends AbstractEntity<T>> extends BaseEntity {

    id?: number;

    abstract toJSON(): any;

    abstract merge(entity: Partial<T>): T;

}

export interface EntityConstructor<T extends AbstractEntity<T>> {
    new(): T;

    fromJSON(json: any): T;
}