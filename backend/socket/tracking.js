const setupTrackingSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Employee joins a specific service room to emit coordinates
        socket.on('employee_join_room', (data) => {
            const { serviceId } = data;
            if (serviceId) {
                socket.join(`tracking_${serviceId}`);
                console.log(`Employee joined tracking room: tracking_${serviceId}`);
            }
        });

        // Client joins the same room to receive coordinates
        socket.on('client_subscribe_location', (data) => {
            const { serviceId } = data;
            if (serviceId) {
                socket.join(`tracking_${serviceId}`);
                console.log(`Client subscribed to tracking room: tracking_${serviceId}`);
            }
        });

        // Employee emits location, forward to the room
        socket.on('employee_update_location', (data) => {
            const { serviceId, lat, lng, heading, speed } = data;
            if (serviceId && lat !== undefined && lng !== undefined) {
                const payload = {
                    serviceId,
                    lat: Number(lat),
                    lng: Number(lng),
                    timestamp: new Date().toISOString()
                };
                if (heading !== undefined && heading !== null && !Number.isNaN(Number(heading))) {
                    payload.heading = Number(heading);
                }
                if (speed !== undefined && speed !== null && !Number.isNaN(Number(speed))) {
                    payload.speed = Number(speed);
                }
                io.to(`tracking_${serviceId}`).emit('location_updated', payload);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};

export default setupTrackingSocket;
