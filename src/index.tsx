import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider  } from "react-router-dom";
import './index.css';
import ExcalidrawApp from './excalidraw/ExcalidrawApp';
import {FabricApp} from "./fabric/FabricApp";
import { Main } from "./Main";
import {FabricY} from "./fabricy/FabricY";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Main />
    },

    {
        path: "/excalidraw",
        element: <ExcalidrawApp />
    },
    {
        path: "/fabric",
        element: <FabricApp />
    },
    {
        path: "/fabricy",
        element: <FabricY />
    }
]);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
    <RouterProvider router={router} />
);