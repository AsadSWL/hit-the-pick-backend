const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


exports.register = async (req, res) => {
    const { firstname, lastname, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ status: false, message: 'User already exists' });
        }

        const user = new User({
            firstname: firstname,
            lastname: lastname,
            email: email,
            password: password,
            role: role,
            status: "Active",
            balance: "100"
        });

        await user.save();

        var authPayload = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            bio: user?.bio ? user?.bio : '',
            balance: user?.balance ? user?.balance : '0',
            image: user?.profileImage ? user?.profileImage : '',
        };

        const token = jwt.sign(authPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ status: true, token, user: { firstname: user.firstname, lastname: user.lastname, email: user.email, role: user.role, bio: user?.bio, image: user?.profileImage } });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Server error' });
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.isPasswordMatch(password);
        if (!isMatch) {
            return res.status(400).json({ status: false, message: 'Invalid credentials' });
        }
        
        if(user.status=="Inactive"){
            return res.status(400).json({ status: false, message: 'Your account is inactive' });
        }

        var authPayload = {
            _id: user._id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            role: user.role,
            bio: user?.bio ? user?.bio : '',
            balance: user?.balance ? user?.balance : 0,
            image: user?.profileImage ? user?.profileImage : '',
        };

        const token = jwt.sign(authPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ status: true, token, user: { email: user.email, role: user.role, bio: user.bio, image: user.profileImage } });
    } catch (err) {
        res.status(500).json({ status: false, message: 'Server error' });
    }
};

exports.varify = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        res.status(200).json({ message: "Token is valid", user: decoded });
    } catch (error) {
        console.error("Token verification error:", error.message);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        const message = `
            You are receiving this because you (or someone else) requested a password reset.
            Please click on the following link to reset your password:
            ${resetUrl}
        `;

        await transporter.sendMail({
            to: user.email,
            subject: 'Password Reset',
            text: message
        });

        res.status(200).json({ status: true, message: 'Password reset link sent to email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
};


exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid or expired token' });
        }

        user.password = password;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ status: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
};