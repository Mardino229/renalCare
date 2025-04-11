import useAuth from "./useAuth.ts";
import {useAxiosPrivate} from "./useAxiosPrivate.ts";
import {useNavigate} from "react-router";

const useLogout = () => {
    const axiosPrivate = useAxiosPrivate();
    const {setAuth} = useAuth();
    const navigate = useNavigate();
    return async () => {
        try {
            await axiosPrivate.post(
                "/logout",
            );
            navigate('/');
        } catch (err) {
            console.log(err);
        }
        setAuth({accessToken:"", username:"", role: ""})
    };

}

export default useLogout;