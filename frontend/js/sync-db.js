const DB_NAME = 'gastos-sync-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

let db;

function openSyncDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Sync DB error:', event.target.error);
            reject('Error opening Sync DB');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { autoIncrement: true });
            }
        };
    });
}

async function addToSyncQueue(request) {
    const db = await openSyncDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.add(request);
    return transaction.complete;
}

async function getAllFromSyncQueue() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const keyRequest = store.getAllKeys();
        const valueRequest = store.getAll();

        Promise.all([
            new Promise(res => keyRequest.onsuccess = () => res(keyRequest.result)),
            new Promise(res => valueRequest.onsuccess = () => res(valueRequest.result))
        ]).then(([keys, values]) => {
            resolve(values.map((value, i) => ({ id: keys[i], ...value })));
        }).catch(err => reject(err));
    });
}

async function deleteFromSyncQueue(id) {
    const db = await openSyncDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    return transaction.complete;
}

