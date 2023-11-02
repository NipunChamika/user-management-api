import { MigrationInterface, QueryRunner } from "typeorm"
import * as bcrypt from "bcrypt"

export class Migration11698738814577 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE user (
            id INT NOT NULL AUTO_INCREMENT,
            firstName VARCHAR(255) NOT NULL,
            lastName VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            PRIMARY KEY (id));`
        );

        // Hashing password
        const hashedPassword = await bcrypt.hash("password", 10)

        // Seeding data
        await queryRunner.query(
            `INSERT INTO user (firstName, lastName, email, password) VALUES 
            ("Nipun", "Chamika", "nipun.c@softcodeit.com", "${hashedPassword}")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE user`);
    }

}
