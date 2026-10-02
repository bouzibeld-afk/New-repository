const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

const server = http.createServer(function (req, res) {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("GPS Server is running");
});

const wss = new WebSocket.Server({
    server: server
});

const rooms = {};

wss.on("connection", function (ws) {

    let roomId = null;

    ws.on("message", function (message) {

        let data;

        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // دخول غرفة
        if (data.type === "join") {

            roomId = data.room;

            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }

            rooms[roomId].push(ws);

            // إخبار الهاتف بعدد الأجهزة
            broadcastRoom(roomId, {
                type: "room",
                count: rooms[roomId].length
            });

            return;
        }

        // إرسال الموقع
        if (data.type === "location") {

            if (!roomId) {
                return;
            }

            broadcastRoomExcept(roomId, ws, {
                type: "location",
                lat: data.lat,
                lon: data.lon
            });
        }
    });

    ws.on("close", function () {

        if (!roomId || !rooms[roomId]) {
            return;
        }

        rooms[roomId] = rooms[roomId].filter(function (client) {
            return client !== ws;
        });

        broadcastRoom(roomId, {
            type: "room",
            count: rooms[roomId].length
        });

        if (rooms[roomId].length === 0) {
            delete rooms[roomId];
        }
    });
});


function broadcastRoom(room, data) {

    if (!rooms[room]) {
        return;
    }

    const text = JSON.stringify(data);

    rooms[room].forEach(function (client) {

        if (client.readyState === WebSocket.OPEN) {
            client.send(text);
        }

    });
}


function broadcastRoomExcept(room, except, data) {

    if (!rooms[room]) {
        return;
    }

    const text = JSON.stringify(data);

    rooms[room].forEach(function (client) {

        if (client !== except &&
            client.readyState === WebSocket.OPEN) {

            client.send(text);
        }

    });
}


server.listen(PORT, function () {
    console.log("GPS Server running on port " + PORT);
});
