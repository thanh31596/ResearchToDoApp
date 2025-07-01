// src/components/Auth/AuthPage.js
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);

    const toggleMode = () => {
        setIsLogin(!isLogin);
    };

    return isLogin ? (
        <LoginForm onToggleMode={toggleMode} />
    ) : (
        <RegisterForm onToggleMode={toggleMode} />
    );
};

export default AuthPage;