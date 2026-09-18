import {AbstractEntity, EntityConstructor} from "../entity/AbstractEntity";
import {Request, Response, Router} from "express";
import {FindManyOptions, FindOptionsOrder, FindOptionsRelations, FindOptionsWhere, Like, Repository} from "typeorm";
import {AppDataSource} from "../data-source";
import * as console from "node:console";


export abstract class BaseController<T extends AbstractEntity<T>> {

    public router: Router;
    protected repository: Repository<T>;
    protected entityCtor: EntityConstructor<T>;

    constructor(entityCtor: EntityConstructor<T>) {
        this.entityCtor = entityCtor;
        this.repository = AppDataSource.getRepository(entityCtor);

        this.router = Router();
        this.initializeRoutes();
        this.initializeGenericRoutes();
    }

    private initializeGenericRoutes() {
        this.router.get("/", this.getAll.bind(this));
        this.router.get("/:id", this.getOne.bind(this));
        this.router.put("/:id", this.update.bind(this));
        this.router.delete("/:id", this.delete.bind(this));
        this.router.post("/", this.create.bind(this));
    }

    protected initializeRoutes(): void {

    }

    protected async getAll(req: Request, res: Response) {
        let options = {} as FindManyOptions<T>;
        if (req.query.take) {
            const take = Number.parseInt(req.query.take);
            if (!isNaN(take)) {
                options.take = take;
            }
        }
        if (req.query.skip) {
            const skip = Number.parseInt(req.query.skip);
            if (!isNaN(skip)) {
                options.skip = skip;
            }
        }
        options.relations = this.getAllRelations();
        options.where = this.buildWhere(req.query);
        options.order = this.buildOrder(req.query);

        const items = await this.repository.findAndCount(options);
        res.json({entities: items[0].map(c => c.toJSON()), count: items[1]});
    }

    abstract getOneRelations(): FindOptionsRelations<T>;

    abstract getAllRelations(): FindOptionsRelations<T>;

    protected async getOne(req: Request, res: Response) {
        const item = await this.repository.findOne({
            where: {id: Number(req.params.id)} as any,
            order: this.getOneOrder(),
            relations: this.getOneRelations()
        });
        if (!item) {
            res.status(404).send("Not found");
            return;
        }
        res.json(item.toJSON());
    }

    protected getOneOrder(): FindOptionsOrder<T> {
        return {};
    }

    protected async delete(req: Request, res: Response) {
        await this.repository.delete({id: Number(req.params.id)} as any);
        res.sendStatus(200);
    }

    protected async create(req: Request, res: Response) {
        const entity = await this.createEntity();
        res.status(200).json(entity.toJSON());
    }

    protected async update(req: Request, res: Response) {
        try {
            const received = this.entityCtor.fromJSON(req.body) as any;

            var find = await this.updateEntity({id: Number(req.params.id)} as any, received);
            if (find) {
                res.send(find);
            } else {
                res.sendStatus(200);
            }
        } catch (err) {
            console.log(err);
            res.sendStatus(500);
        }
    }

    abstract updateEntity(id: number, received: any);

    async createEntity(): Promise<T> {
        return await this.repository.save(this.repository.create());
    }

    buildOrder(query: any) {
        return {} as any;
    }

    abstract buildWhere(query: any): FindOptionsWhere<T> | FindOptionsWhere<T>[];

    like(opt: string) {
        if (opt)
            return Like(`%${opt}%`);
        return undefined;
    }
}