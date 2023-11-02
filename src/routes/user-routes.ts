import { Router } from "express";
import { getRepository } from "typeorm";
import { User } from "../entity/User";
import * as bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import * as jwt from "jsonwebtoken";
import { expressjwt } from "express-jwt";
import * as express from "express";
import * as dotenv from "dotenv";
import { access } from "fs";

dotenv.config();

const secretKey = process.env.SECRET_KEY;
const refreshSecretKey = process.env.REFRESH_SECRET_KEY;
let refreshTokens = [];

const router = Router();

// Middleware for Token Authentication

const authenticateJWT = expressjwt ({
    secret: secretKey,
    algorithms: ["HS256"]
});

// User login authentication

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const userRepository = getRepository(User);

    const user = await userRepository.findOne({ where: { email }});

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            statusCode: StatusCodes.NOT_FOUND,
            message: "User not found"
        })
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            statusCode: StatusCodes.UNAUTHORIZED,
            message: "Invalid Password"
        })
    }

    // Generate the JWT Access Token
    const accessToken = jwt.sign({ id: user.id }, secretKey, { expiresIn: "1h" });

    // Generate the JWT Refresh Token
    const refreshToken = jwt.sign({ id: user.id}, refreshSecretKey, { expiresIn: "5h" });

    // Store the refresh tokens
    refreshTokens.push(refreshToken);

    res.json({
        statusCode: StatusCodes.OK,
        accessToken: accessToken,
        refreshToken: refreshToken,
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
    })
})

// Create a new user

router.post("/create", authenticateJWT, async (req, res) => {
    const userRepository = getRepository(User);

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Create a new user instance with the hashed password
        const user = userRepository.create({
            ...req.body,
            password: hashedPassword // Override the password with hashed password
        });

        // Save the user to the database
        await userRepository.save(user);
        return res.status(StatusCodes.OK).json({
            statusCode: StatusCodes.OK,
            message: "User successfully created"
        })
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to create user"
        })
    }
})

// View user list

router.get("/", authenticateJWT, async (req, res) => {
    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;

    const skip = (page - 1) * limit;

    const userRepository = getRepository(User);
    const [users, totalCount] = await userRepository.findAndCount({
        skip: skip,
        take: limit,
        select: ["id", "firstName", "lastName", "email"]
    });

    const totalPages = Math.ceil(totalCount / limit);

    const paginationMeta = {
        page: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages,
        skip: skip
    };

    res.json({
        statusCode: StatusCodes.OK,
        data: users,
        meta: paginationMeta
    });
});

// Update user

router.put("/:id", authenticateJWT, async (req, res) => {
    const id: number = Number(req.params.id);
    const { firstName, lastName, email, password } = req.body;

    const userRepository = getRepository(User);

    try {
        const user = await userRepository.findOne({ where: { id: id } });

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
               statusCode: StatusCodes.NOT_FOUND,
               message: "User not found" 
            });
        }

        if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            req.body.password = hashedPassword;
        }

        // Merges the new values into the existing user
        userRepository.merge(user, req.body);
        
        // Save the user to the database
        await userRepository.save(user);

        return res.status(StatusCodes.OK).json({
            statusCode: StatusCodes.OK,
            message: "User updated successfully"
        });

    } catch (error) {
        if (error.message === "User not found") {
            res.status(StatusCodes.NOT_FOUND).json({
                statusCode: StatusCodes.NOT_FOUND,
                message: "User not found"
            });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Failed to update user"
            });
        }
    }
});

// Delete a user

router.delete("/:id", authenticateJWT, async (req, res) => {
    const id: number = Number(req.params.id);

    const userRepository = getRepository(User);

    try {
        const user = await userRepository.findOne({ where: { id: id } });

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                statusCode: StatusCodes.NOT_FOUND,
                message: "User not found"
            });
        }

        await userRepository.remove(user);
        return res.status(StatusCodes.OK).json({
            statusCode: StatusCodes.OK,
            message: "User deleted successfully"
        });
    } catch (error) {
        if (error.message === "User not found") {
            res.status(StatusCodes.NOT_FOUND).json({
                statusCode: StatusCodes.NOT_FOUND,
                message: "User not found"
            });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                message: "Failed to delete user"
            });
        }
    }
});

// Refresh the token endpoint

router.post("/token", (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ 
            statusCode: StatusCodes.UNAUTHORIZED,
            message: "Refresh token not provided" 
        });
    }

    if (!refreshTokens.includes(refreshToken)) {
        return res.status(StatusCodes.FORBIDDEN).json({ 
            statusCode: StatusCodes.FORBIDDEN,
            message: "Refresh token not found" 
        });
    }

    jwt.verify(refreshToken, refreshSecretKey, (err: any, user: any) => {
        if (err) {
            return res.status(StatusCodes.FORBIDDEN).json({ 
                statusCode: StatusCodes.FORBIDDEN,
                message: "Invalid refresh token" 
            });
        }

        const newAccessToken = jwt.sign({ id: user.id }, secretKey, { expiresIn: "1h" });

        res.json({
            accessToken: newAccessToken
        });
    });
});

// Error handling middleware for JWT

router.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error.name === "UnauthorizedError") {
        // JWT has expired
        if (error.inner && error.inner.name === "TokenExpiredError") {
            return res.status(StatusCodes.UNAUTHORIZED).json({ 
                statusCode: StatusCodes.UNAUTHORIZED,
                message: "Token has expired" 
            });
        }
        // No JWT provided
        if (error.message === "No authorization token was found") {
            return res.status(StatusCodes.UNAUTHORIZED).json({ 
                statusCode: StatusCodes.UNAUTHORIZED,
                message: "Access denied. No token provided." 
            });
        }
        // Invlaid JWT
        if (error.message === "invalid token") {
            return res.status(StatusCodes.UNAUTHORIZED).json({ 
                statusCode: StatusCodes.UNAUTHORIZED,
                message: "Invalid Token" 
            });
        }
        return res.status(StatusCodes.UNAUTHORIZED).json({ 
            statusCode: StatusCodes.UNAUTHORIZED,
            message: "Unauthorized" 
        });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        statusCode: StatusCodes.UNAUTHORIZED,
        message: "Internal Server Error" 
    });
})

export default router;