import React, {useContext, useRef, useState, useReducer, useLayoutEffect} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import axios from "axios";
import jwtDecode from "jwt-decode";
import {Alert, Backdrop, CircularProgress, Snackbar} from "@mui/material";

const SessionContext = React.createContext({});
export default SessionContext;

export function LoggedIn({children}) {
    const sessionContext = useContext(SessionContext);

    return (
        sessionContext.isLoggedIn() && (
            <>{children}</>
        )
    )
}

export function Initialization({children}) {
    const sessionContext = useContext(SessionContext);

    return (
        sessionContext.isInitialization() && (
            <>{children}</>
        )
    )
}

export function NoLogin({children}) {
    const sessionContext = useContext(SessionContext);

    return (
        sessionContext.isLoggedOut() && (
            <>{children}</>
        )
    )
}

const systemStatusEnum = Object.freeze({
    loggedOut: 0,
    initialization: 1,
    loggedIn: 2

});

const tokenType = Object.freeze({
    idToken: "idToken",
    accessToken: "accessToken",
    refreshToken: "refreshToken",
});

const userModel = Object.freeze({
    username: "",
    email: "",
    full_name: "",
    groups: [],
    employee_no: null,
    mail_notification: true,
    project: 0,
});

const getIdToken = () => sessionStorage.getItem(tokenType.idToken);
const getAccessToken = () => sessionStorage.getItem(tokenType.accessToken);
const getRefreshToken = () => localStorage.getItem(tokenType.refreshToken);
const claimsToUser = (claims) => {
    return {
        username: claims.sub,
        email: claims.email,
        full_name: `${claims.family_name} ${claims.given_name}`,
        picture: claims.picture,
    }
}

export function SessionProvider({children}) {
    // State
    const [user, setUser] = useState(userModel);
    const [completedInfo, setCompletedInfo] = useState({});
    const [backdropOpen, setBackdropOpen] = useState(false);
    const completed = Boolean(completedInfo.msg);

    // Reducer
    const reducer = (state, action) => {
        const token = action.value;
        switch(action.type) {
            case tokenType.idToken:
                if (token === null) {
                    sessionStorage.removeItem(tokenType.idToken);
                    // setSystemStatus(systemStatusEnum.loggedOut);
                } else {
                    // JWTのClaimを取得し、HDとAUDを検証
                    try {
                        const claims = jwtDecode(token);
                        if (claims.aud === import.meta.env.VITE_AUTH_CLIENT_ID
                            && claims.hd === import.meta.env.VITE_AUTH_HD) {
                            // 検証OK
                            sessionStorage.setItem(tokenType.idToken, token);

                            // Claimよりユーザー情報を取得
                            setUser(claimsToUser(claims));
                        } else {
                            // 検証NG
                            alert("Could not validate credentials");
                            throw new Error("Could not validate credentials");
                        }
                    } catch (err) {
                        alert("idToken: " + err);
                    }
                }
                return {...state, [tokenType.idToken]: action.value};
            case tokenType.accessToken:
                if (token === null) {
                    sessionStorage.removeItem(tokenType.accessToken);
                } else {
                    sessionStorage.setItem(tokenType.accessToken, token);
                }
                return {...state, [tokenType.accessToken]: token}
            case tokenType.refreshToken:
                if (token === null) {
                    localStorage.removeItem(tokenType.refreshToken);
                } else {
                    localStorage.setItem(tokenType.refreshToken, token);
                }
                return {...state, [tokenType.refreshToken]: token};
            default:
                throw new Error("Invalid type");
        }
    }
    const init = (initialToken) => {
        const idToken = initialToken[tokenType.idToken]
        if (idToken !== null) {
            try {
                // Claimよりユーザー情報を取得
                const claims = jwtDecode(idToken);
                setUser(claimsToUser(claims));
            } catch(err) {
                alert("****" + err);
            }
        }

        return initialToken;
    }
    const initialToken = {
        [tokenType.idToken]: getIdToken(),
        [tokenType.accessToken]: getAccessToken(),
        [tokenType.refreshToken]: getRefreshToken(),
    }
    const [token, dispatch] = useReducer(reducer, initialToken, init);

    // ************* Functions **************
    const handleCompleted = () => setCompletedInfo({})
    const setCompleted = (msg, severity = "success") => {
        console.log("******* " + msg + ", " + severity);
        setCompletedInfo({msg: msg, severity: severity, duration: severity === "error" ? null : 4000});
    };
    const errCompleted = (err) => {
        if (err.response) {
            setCompleted(JSON.stringify(err.response.data.detail), "error");
        } else {
            setCompleted(err.message, "error")
        }
    };

    const updateIdToken = (token) => dispatch({type: tokenType.idToken, value: token});
    const updateAccessToken = (token) => dispatch({type: tokenType.accessToken, value: token});
    const updateRefreshToken = (token) => dispatch({type: tokenType.refreshToken, value: token});

    // Login
    const login = (idToken, accessToken, refreshToken) => {
        updateIdToken(idToken);
        updateAccessToken(accessToken);
        updateRefreshToken(refreshToken);
    }
    // Logout
    const logout = () => {
        const data = new FormData();
        data.append("token", token[tokenType.refreshToken]);
        const config = {
            method: "post",
            url: "auth/logout",
            data: data,
        }
        request(config);

        setTimeout(() => {
            updateRefreshToken(null);
            updateAccessToken(null);
            updateIdToken(null);
        }, 100);
    }

    // Request
    const request = async (config, auth=true) => {
        let idToken;
        let result;

        setBackdropOpen(true);
        try {
            config.baseURL = import.meta.env.VITE_API_URL;
            if (auth) {
                // Check token expiration
                idToken = token[tokenType.idToken]
                const claims = jwtDecode(idToken);
                const now = Math.floor(new Date().getTime() / 1000);
                if (claims.exp <= now) {
                    // Expired
                    idToken = await refresh();
                }

                if (!config.headers) {
                    config.headers = {};
                }
                config.headers.Authorization = "Bearer " + idToken;
            }
            for (let i = 0; i < 2; i++) {
                try {
                    result = await axios(config);
                    break;
                } catch (err) {
                    console.log({request: err});
                    if (auth === true && err.response?.status === 401) {
                        idToken = await refresh();
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err) {
            errCompleted(err);
            result = {err: err};
        } finally {
            setBackdropOpen(false);
        }

        return result;
    }

    const refresh = async () => {
        const data = new URLSearchParams();
        data.append("refresh_token", token[tokenType.refreshToken]);
        const config = {
            method: 'post',
            url: import.meta.env.VITE_API_URL + "auth/refresh",
            data: data
        }
        const res = await axios(config);
        updateIdToken(res.data.id_token);
        updateAccessToken(res.data.access_token);

        return res.data.id_token;
    }

    // Context
    const sessionContext = {
        login: login,
        logout: logout,
        request: request,
        refresh: refresh,
        isLoggedIn: () => (token[tokenType.idToken] !== null && user.employee_no !== ""),
        isLoggedOut: () => (token[tokenType.idToken] === null),
        isInitialization: () => (token[tokenType.idToken] !== null && user.employee_no === ""),
        user: user,
        setCompleted: setCompleted,
    }

    const refFirstRef = useRef(true);
    const location = useLocation();

    const callback = async (code) => {
        const params = new FormData();
        params.append("code", code);
        const config = {
            method: "post",
            url: "auth/token",
            data: params,
        }
        try {
            const res = await request(config, false);
            if (res.data) {
                const data = res.data
                const nonce = getNonce();
                if (data.nonce === nonce) {
                    console.log("**** login");
                    login(data.id_token, data.access_token, data.refresh_token);
                    window.location.href = "/";
                } else {
                    console.log({nonce: nonce, data: data});
                    errCompleted("何か変だよ?");
                }
            }
        } catch (err) {
            console.log(err);
            errCompleted("何か変だよ?");
        }
    };


    useLayoutEffect(() => {
        if (import.meta.env.DEV && refFirstRef.current) {
            refFirstRef.current = false;
            return;
        }

        if (token[tokenType.refreshToken] === null) {
            // OpenID認証コールバック
            if (location.pathname === "/login") {
                const code_match = location.search.match(/code=(?<code>[^&]+)/);
                const state_match = location.search.match(/state=(?<state>[^&]+)/);
                const error_match = location.search.match(/error=(?<code>[^&]+)/);
                if (error_match) {
                    setCompleted(error_match.groups.code);
                } else if (code_match && state_match) {
                    const correctState = getState();
                    const state = decodeURIComponent(state_match.groups.state);
                    if (state === correctState) {
                        (callback)(code_match.groups.code);
                    } else {
                        console.log({state: state, correctState: correctState});
                        setCompleted("何か変だよ?");
                    }
                }
            } else if (location.pathname !== "/logout") {
                // OpenID認証開始
                const state = createRandomCode();
                setState(state);
                const nonce = createRandomCode();
                setNonce(nonce);

                const params = new URLSearchParams();
                params.append("client_id", import.meta.env.VITE_AUTH_CLIENT_ID);
                params.append("redirect_uri", import.meta.env.VITE_AUTH_LOGIN_URL);
                params.append("response_type", "code");
                params.append("state", state);
                params.append("scope", "email openid profile");
                params.append("nonce", nonce);
                params.append("access_type", "offline");
                params.append("prompt", "consent");
                params.append("hd", import.meta.env.VITE_AUTH_HD);
                window.location.href = import.meta.env.VITE_AUTH_URL + "?" + params;
            }
        } else {
            if (token[tokenType.idToken] === null) {
                (async () => {
                    setBackdropOpen(true);
                    await refresh();
                })();
            }
        }
    }, [location]);


    return (
        <>
            <SessionContext.Provider value={sessionContext}>
                {children}
            </SessionContext.Provider>
            <Snackbar open={completed} autoHideDuration={completedInfo.duration}
                      message={completedInfo.msg} onClose={handleCompleted}>
                <Alert severity={completedInfo.severity}
                       onClose={handleCompleted}>{completedInfo.msg}</Alert>
            </Snackbar>
            <Backdrop sx={{color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1}} open={backdropOpen}>
                <CircularProgress color="inherit"/>
            </Backdrop>
        </>
    );
}

const storageKeys = Object.freeze({
    state: "state",
    nonce: "nonce",
});

export const createRandomCode = () => {
    const code = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    return code.replaceAll("+", "-").replaceAll("/", "_").slice(0, -1);
}

export const getState = () => {
    return sessionStorage.getItem(storageKeys.state);
}
export const setState = (state) => {
    if (state === null) {
        sessionStorage.removeItem(storageKeys.state);
    } else {
        sessionStorage.setItem(storageKeys.state, state);
    }
}

export const getNonce = () => {
    return sessionStorage.getItem(storageKeys.nonce);
}
export const setNonce = (nonce) => {
    if (nonce === null) {
        sessionStorage.removeItem(storageKeys.nonce);
    } else {
        sessionStorage.setItem(storageKeys.nonce, nonce);
    }
}

export const userInitial = (fullName) => {
    if (fullName) {
        const item = fullName.split(" ")
        if (item.length === 1) {
            return item[0][0] + item[0][1];
        } else {
            return item[0][0] + item[1][0];
        }
    } else {
        return "";
    }
}
