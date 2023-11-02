import "reflect-metadata";
import { createConnection, Connection } from "typeorm";
import { User } from "./entity/User";

export const initializeDatabaseConnection = async (): Promise<Connection> => {
    return createConnection({
        type: "mysql",
        host: "localhost",
        port: 3306,
        username: "root",
        password: "N1pun$",
        database: "ts_company_typeorm",
        synchronize: true,
        logging: false,
        entities: [User],
        migrations: [__dirname + "/migration/**/*.ts"],
        migrationsTableName: "typeorm_migrations",
        subscribers: [],
    });
}




// import "reflect-metadata"
// import { DataSource } from "typeorm"
// import { User } from "./entity/User"

// export const AppDataSource = new DataSource({
//     type: "mysql",
//     host: "localhost",
//     port: 3306,
//     username: "root",
//     password: "N1pun$",
//     database: "ts_company_typeorm",
//     synchronize: true,
//     logging: false,
//     entities: [User],
//     migrations: [__dirname + "/migration/**/*.ts"],
//     migrationsTableName: "typeorm_migrations",
//     subscribers: [],
// })
