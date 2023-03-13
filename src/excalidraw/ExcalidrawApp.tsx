import React, {useEffect, useRef, useState, useMemo} from 'react';
import throttle from "lodash.throttle";
import {Input, Button, Group} from "@skbkontur/react-ui";
import {v4 as uuidv4} from "uuid";
import styles from './ExcalidrawApp.module.css';
import {Excalidraw, FONT_FAMILY, MainMenu} from "@excalidraw/excalidraw";
import {CollabService} from "../CollabService";
import {ExcalidrawElement} from "@excalidraw/excalidraw/types/element/types";
import {ExcalidrawUpdateManager} from "./ExcalidrawUpdateManager";
import {ExcalidrawAPIRefValue} from "@excalidraw/excalidraw/types/types";
import {WhiteBoardUpdate} from "./types";

const userId = localStorage.getItem("userId") || uuidv4();
localStorage.setItem("userId", userId);


function ExcalidrawApp() {
    const collabRef = useRef<CollabService<WhiteBoardUpdate> | null>(null);
    const updaterRef = useRef<ExcalidrawUpdateManager | null>(null);

    useEffect(() => {
        updaterRef.current = new ExcalidrawUpdateManager([]);
        const collab = new CollabService(userId, updaterRef.current);
        collabRef.current = collab;

        return () => collab.disconnect();
    }, []);

    const [peerId, setPeerId] = useState("");
    const excalidrawScene = useRef<ExcalidrawAPIRefValue>(null);

    const handleChange = useMemo(() => throttle((elements: readonly ExcalidrawElement[]) => {
        updaterRef.current?.createUpdate(elements);
    }, 100), []);

    useEffect(() => {
        updaterRef.current!.subscribeReceivedUpdates(async (elements) => {
            const scene = await excalidrawScene.current!.readyPromise;

            scene!.updateScene({elements});
        })

        collabRef.current!.subscribe(async ({peersInARoom}) => {
            const scene = await excalidrawScene.current!.readyPromise;
            scene!.updateScene({
                collaborators: new Map(peersInARoom.map((id) => ([
                    id,
                    {
                        id,
                        username: id,
                        selectedElementIds: {}
                    }
                ])))
            });
        });
    }, []);

    const connect = () => {
        collabRef.current!.connectTo(peerId);
    }

    return (
        <div className={styles.App}>
            <Excalidraw
                initialData={{
                    appState: {
                        currentItemRoughness: 0,
                        currentItemFontFamily: FONT_FAMILY.Helvetica,
                        viewBackgroundColor: "#00000000"
                    }
                }}
                ref={excalidrawScene}
                isCollaborating
                onChange={handleChange}
                UIOptions={{
                    canvasActions: {
                        saveAsImage: false,
                        saveToActiveFile: false,
                        export: false,
                        toggleTheme: false,
                        changeViewBackgroundColor: true,
                        loadScene: false
                    }
                }}
            >
                <MainMenu>
                </MainMenu>
            </Excalidraw>

            <div className={styles.connect}>
            MyId: {userId}
            <br/><Group>
                <Input placeholder={"peer id"} onValueChange={setPeerId}/>
                <Button onClick={connect}>Connect</Button>
            </Group></div>
        </div>
    );
}

export default ExcalidrawApp;
