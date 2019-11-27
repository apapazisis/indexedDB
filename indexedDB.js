var DB = {};
DB.NAME = "lawyer";
DB.TABLE = null;
DB.VERSION = 1;
DB.INSTANCE = null;
DB.EMPTY = true;

requiredFeaturesSupported();

function requiredFeaturesSupported() {
    console.log('requiredFeaturesSupported()');
    if (!window.indexedDB) {
        if (window.mozIndexedDB) {
            window.indexedDB = window.mozIndexedDB;
        } else if (window.webkitIndexedDB) {
            window.indexedDB = webkitIndexedDB;
            IDBCursor = webkitIDBCursor;
            IDBDatabaseException = webkitIDBDatabaseException;
            IDBRequest = webkitIDBRequest;
            IDBKeyRange = webkitIDBKeyRange;
            IDBTransaction = webkitIDBTransaction;
        } else {
            console.log("IndexedDB is not supported - upgrade your browser to the latest version.");
            return false;
        }
    }

    if (!window.indexedDB.deleteDatabase) {
        console.log("The required version of IndexedDB is not supported.");
        return false;
    }

    return true;
}


export function openTable(DBTABLE) {
    return new Promise((resolve, reject) => {
        console.log("openDB()");

        DB.TABLE = DBTABLE;

        if (!window.indexedDB.open) {
            console.log("window.indexedDB.open is null in openDB()");
            return;
        }

        try {
            var openRequest = window.indexedDB.open(DB.NAME, DB.VERSION);

            openRequest.onerror = function(evt) {
                console.log("openRequest.onerror fired in openDB() - error: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
            };

            openRequest.onblocked = function(evt) {
                console.log("openDB_onupgradeneeded()");
                console.log("The database is blocked - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
                console.log("If this page is open in other browser windows, close these windows.");
            };

            openRequest.onupgradeneeded = function (evt) {
                console.log("openDB_onupgradeneeded()");

                var db = DB.INSTANCE = evt.target.result;

                if (!db) {
                    reject('error')
                    console.log("db (i.e., evt.target.result) is null in openDB_onupgradeneeded()");
                    return;
                }

                try {
                    db.createObjectStore(DB.TABLE, {
                        keyPath: "name"
                    });
                } catch (ex) {
                    console.log("Exception in openDB_onupgradeneeded() - " + ex.message);
                    return;
                }
                console.log("The database has been created.");
                resolve();
            };

            openRequest.onsuccess = function(evt) {
                console.log("openDB_onsuccess()");

                var db = DB.INSTANCE = evt.target.result;

                if (!db) {
                    console.log("db (i.e., evt.target.result) is null in openDB_onsuccess()");
                    reject('error - on success');
                }
                console.log("The database has been opened.");
                resolve();
            };
        } catch (ex) {
            console.log("window.indexedDB.open exception in openDB() - " + ex.message);
            reject(ex.message);
        }
    });
}


export function handleFiles(files) {
    console.log("handleFileSelection()");

    if (!files) {
        console.log("At least one selected file is invalid - do not select any folders. Please reselect and try again.");
        return;
    }

    var db = DB.INSTANCE;

    if (!db) {
        console.log("db (i.e., DB.INSTANCE) is null in handleFiles()");
        return;
    }

    try {
        var transaction = db.transaction(DB.TABLE, (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
    }
    catch (ex) {
        console.log("db.transaction exception in handleFileSelection() - " + ex.message);
        return;
    }

    transaction.onerror = function() {
        console.log("transaction.onerror fired in handleFileSelection() - error code");
    };

    transaction.onabort = function() {
        console.log("transaction.onabort fired in handleFileSelection()");
    };

    transaction.oncomplete = function() {
        console.log("transaction.oncomplete fired in handleFileSelection()");
    };

    try {
        var objectStore = transaction.objectStore(DB.TABLE); // Note that multiple put()'s can occur per transaction.

        for (var i = 0, file; file = files[i]; i++) {
            var putRequest = objectStore.put(file); // The put() method will update an existing record, whereas the add() method won't.
            putRequest.onsuccess = function() {
                DB.EMPTY = false;
            }; // There's at least one object in the database's object store. This info (i.e., DB.EMPTY) is used in displayDB().
            putRequest.onerror = function(evt) {
                console.log("putRequest.onerror fired in handleFileSelection() - error code");
            }
        }
    }
    catch (ex) {
        console.log("Transaction and/or put() exception in handleFileSelection() - " + ex.message);
        return;
    }
}


export function getRecords() {
    return new Promise((resolve, reject) => {
        console.log("displayDB()");

        var db = DB.INSTANCE;

        if (!db) {
            console.log("There's no database to display.");
            console.log("db (i.e., DB.INSTANCE) is null in displayDB()");
            return;
        }

        try {
            var transaction = db.transaction(DB.TABLE, (IDBTransaction.READ_ONLY ? IDBTransaction.READ_ONLY : 'readonly')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_ONLY value.
        }
        catch (ex) {
            console.log("db.transaction() exception in displayDB() - " + ex.message);
            return;
        }

        try {
            var objectStore = transaction.objectStore(DB.TABLE);

            try {
                var cursorRequest = objectStore.openCursor();
                var files = [];

                cursorRequest.onerror = function(evt) {
                    console.log("cursorRequest.onerror fired in displayDB() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
                };

                cursorRequest.onsuccess = function(evt) {
                    console.log("cursorRequest.onsuccess fired in displayDB()");

                    var cursor = evt.target.result;

                    if (cursor) {
                        DB.EMPTY = false;
                        files.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(files);
                    }

                    if (DB.EMPTY) {
                        console.log("The database is empty &amp;ndash; there's nothing to display.");
                    }
                }
            }
            catch (innerException) {
                console.log("Inner try exception in displayDB() - " + innerException.message);
            }
        }
        catch (outerException) {
            console.log("Outer try exception in displayDB() - " + outerException.message);
        }
    });
}


export function deleteRecord(key) {
    return new Promise((resolve, reject) => {

        var db = DB.INSTANCE;

        if (!db) {
            console.log("There's no database to display.");
            console.log("db (i.e., DB.INSTANCE) is null in displayDB()");
            return;
        }

        try {
            var transaction = db.transaction(DB.TABLE, "readwrite");
        } catch (ex) {
            console.log("db.transaction() exception in displayDB() - " + ex.message);
            reject();
        }

        try {
            var objectStore = transaction.objectStore(DB.TABLE);

            try {
                var objectStoreRequest = objectStore.delete(key);

                objectStoreRequest.onsuccess = function(event) {
                    resolve();
                    console.log('db record is deleted');
                };

            } catch (ex) {
                console.log("Inner try exception in deleteRecord() - " + ex.message);
            }
        } catch (ex) {
            console.log("Outer try exception in deleteRecord() - " + ex.message);
        }
    });
}


function deleteDB() {
    console.log("deletedDB()");
    console.log("Your request has been queued.");

    try {
        if (DB.INSTANCE) {
            DB.INSTANCE.close();
        }

        var deleteRequest = window.indexedDB.deleteDatabase(DB.NAME);

        deleteRequest.onerror = function(evt) {
            console.log("deleteRequest.onerror fired in deleteDB() - " + (evt.target.error ? evt.target.error : evt.target.errorCode));
        };

        deleteRequest.onsuccess = function() {
            DB.INSTANCE = null;
            DB.EMPTY = true;
            console.log("The database has been deleted.");
        }
    }
    catch (ex) {
        console.log("Exception in deleteDB() - " + ex.message);
    }
}
