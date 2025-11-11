import {useContext} from "react";
import {Navigate} from "react-router-dom";
import { AuthContext } from "../components/AuthContext";

export default function RequireAuth({children}) {
    const {currentUser, authType, loading} = useContext(AuthContext);


    if (loading) return null;

    if (!currentUser || !authType) {
        return <Navigate to="/" replace/>;
    }

    return children
}