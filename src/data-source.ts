import "reflect-metadata";
import { createConnection, Connection } from "typeorm";
import { User } from "./entity/User";
import * as dotenv from "dotenv";

dotenv.config();

export const initializeDatabaseConnection = async (): Promise<Connection> => {
    return createConnection({
        type: "mysql",
        host: process.env.MYSQL_HOST,
        port: +process.env.MYSQL_PORT,
        username: process.env.MYSQL_ROOT,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        synchronize: true,
        logging: false,
        entities: [User],
        migrations: [__dirname + "/migration/**/*.ts"],
        migrationsTableName: "typeorm_migrations",
        subscribers: [],
    });
}
