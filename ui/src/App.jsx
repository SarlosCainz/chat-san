import React, {useContext, useState, useLayoutEffect} from 'react';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {AppBar, Toolbar, Typography, Avatar, Menu, MenuItem, Button} from '@mui/material';
import {indigo} from "@mui/material/colors";

import Body from "./components/Body";
import SessionContext, {LoggedIn, NoLogin} from "./Session.jsx";

function UserMenu() {
    const sessionContext = useContext(SessionContext);

    const [anchorUserMenuEl, setAnchorUserMenuEl] = useState(null);
    const userMenuOpen = Boolean(anchorUserMenuEl);
    const handleUserMenuOpen = (e) => setAnchorUserMenuEl(e.currentTarget);
    const handleUserMenuClose = () => setAnchorUserMenuEl(null);

    const doLogout = () => {
        handleUserMenuClose();
        sessionContext.logout();
    }

    return (
        <>
            <Avatar onClick={handleUserMenuOpen}
                    alt={sessionContext.user.full_name}
                    src={sessionContext.user.picture}
                    sx={{m: 2, bgcolor: indigo[600], width: 35, height: 35}}/>
            <Menu id="user-menu" anchorEl={anchorUserMenuEl} open={userMenuOpen} onClose={handleUserMenuClose}>
                <MenuItem onClick={doLogout}>Logout</MenuItem>
            </Menu>
        </>
    )
}

function Header() {
    const doLogin = () => window.location.href = "/"

    return (
        <>
            <AppBar>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>Chatさん</Typography>
                    <LoggedIn>
                        <UserMenu/>
                    </LoggedIn>
                    <NoLogin>
                        <Button onClick={doLogin}>Login</Button>
                    </NoLogin>
                </Toolbar>
            </AppBar>
            <Toolbar/>
        </>
    )
}

function App() {
    const [isDarkMode, setDarkMode] = useState(false);

    useLayoutEffect(() => {
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        setDarkMode(query.matches);
        query.onchange = event => setDarkMode(event.matches);
    }, []);

    const theme = createTheme({
        palette: {
            mode: isDarkMode ? "dark" : "light",
        },
    });

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Header/>
            <LoggedIn>
                <Body/>
            </LoggedIn>
        </ThemeProvider>
    );
}

export default App
