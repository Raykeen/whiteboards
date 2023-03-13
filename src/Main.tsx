import {Link} from "react-router-dom";

export const Main = () => (<div>
    <Link to={"/excalidraw"}>Excalidraw</Link>
    <br/>
    <Link to={"/fabric"}>Fabric</Link>
    <br/>
    <Link to={"/fabricy"}>Fabric + Yjs</Link>
</div>)