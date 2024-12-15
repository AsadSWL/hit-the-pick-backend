const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.register = async (req, res) => {
    const { firstname, lastname, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ status: false, message: "User already exists" });
        }

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

        const user = new User({
            firstname,
            lastname,
            email,
            password,
            role,
            status: "Inactive", // User starts as inactive
            balance: "100.00",
            verificationToken: hashedToken,
        });

        await user.save();

        const activationUrl = `${process.env.FRONTEND_BASE_URL}/verify/${verificationToken}`;
        const message = `
            Welcome to our platform!
            Please click the following link to verify your email:
            ${activationUrl}
        `;

        await transporter.sendMail({
            to: user.email,
            subject: "Account Activation",
            text: message,
        });

        res.status(201).json({
            status: true,
            message: "Registration successful! Please check your email to verify your account.",
        });
    } catch (err) {
        console.error("Registration Error:", err.message);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

exports.verify = async (req, res) => {
    const { token } = req.params;

    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({ verificationToken: hashedToken });

        if (!user) {
            return res.status(400).json({ status: false, message: "Invalid or expired token" });
        }

        user.status = "Active";
        user.verificationToken = undefined;
        await user.save();

        res.status(200).json({ status: true, message: "Account successfully activated. You can now log in." });
    } catch (err) {
        console.error("Email Verification Error:", err.message);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ status: false, message: "Invalid credentials" });
        }

        if (user.status === "Inactive") {
            return res.status(400).json({ status: false, message: "Your account is inactive. Please verify your email." });
        }

        const isMatch = await user.isPasswordMatch(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, message: "Invalid credentials" });
        }

        const authPayload = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            bio: user?.bio || "",
            image: user?.profileImage || "",
        };

        const token = jwt.sign(authPayload, process.env.JWT_SECRET, { expiresIn: "24h" });
        res.status(200).json({
            status: true,
            token,
            user: {
                email: user.email,
                role: user.role,
                bio: user.bio,
                image: user.profileImage,
            },
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.FRONTEND_BASE_URL}/reset-password/${resetToken}`;
        const message = `
            You are receiving this because you (or someone else) requested a password reset.
            Please click the following link to reset your password:
            ${resetUrl}
        `;

        await transporter.sendMail({
            to: user.email,
            subject: "Password Reset",
            text: message,
        });

        res.status(200).json({ status: true, message: "Password reset link sent to email." });
    } catch (err) {
        console.error("Forgot Password Error:", err.message);
        res.status(500).json({ status: false, message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ status: false, message: "Invalid or expired token" });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ status: true, message: "Password reset successfully." });
    } catch (err) {
        console.error("Reset Password Error:", err.message);
        res.status(500).json({ status: false, message: "Server error" });
    }
};
