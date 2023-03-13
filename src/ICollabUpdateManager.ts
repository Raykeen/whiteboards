export interface ICollabUpdateManager<Update> {
    applyUpdate: (update: Update) => void;

    createFullStateUpdate: () => Update;

    subscribeReceivedUpdates: (handler: (data: Update) => void) => void;

    subscribeCreatedUpdates: (handler: (data: Update) => void) => void;
}