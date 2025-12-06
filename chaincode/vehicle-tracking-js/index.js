/*
 * Vehicle Tracking Chaincode
 * Manages vehicle lifecycle and GPS tracking
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class VehicleContract extends Contract {

    /**
     * Initialize the ledger with sample vehicles
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        
        const vehicles = [
            {
                vehicleId: 'VEH001',
                make: 'Toyota',
                model: 'Camry',
                year: 2020,
                vin: '1HGBH41JXMN109186',
                owner: 'John Doe',
                color: 'Blue',
                latitude: 37.7749,
                longitude: -122.4194,
                status: 'active',
                mileage: 15000,
                lastUpdated: new Date().toISOString()
            },
            {
                vehicleId: 'VEH002',
                make: 'Honda',
                model: 'Accord',
                year: 2021,
                vin: '1HGCP2F89BA123456',
                owner: 'Jane Smith',
                color: 'Red',
                latitude: 34.0522,
                longitude: -118.2437,
                status: 'active',
                mileage: 8500,
                lastUpdated: new Date().toISOString()
            },
            {
                vehicleId: 'VEH003',
                make: 'Ford',
                model: 'F-150',
                year: 2022,
                vin: '1FTFW1E84MFA12345',
                owner: 'Bob Johnson',
                color: 'White',
                latitude: 40.7128,
                longitude: -74.0060,
                status: 'active',
                mileage: 5200,
                lastUpdated: new Date().toISOString()
            }
        ];

        for (const vehicle of vehicles) {
            await ctx.stub.putState(vehicle.vehicleId, Buffer.from(JSON.stringify(vehicle)));
            console.info(`Vehicle ${vehicle.vehicleId} added to ledger`);
        }

        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Create a new vehicle
     */
    async createVehicle(ctx, vehicleId, make, model, year, vin, owner, color) {
        console.info('============= START : Create Vehicle ===========');

        // Check if vehicle already exists
        const exists = await this.vehicleExists(ctx, vehicleId);
        if (exists) {
            throw new Error(`Vehicle ${vehicleId} already exists`);
        }

        const vehicle = {
            vehicleId,
            make,
            model,
            year: parseInt(year),
            vin,
            owner,
            color,
            latitude: 0,
            longitude: 0,
            status: 'active',
            mileage: 0,
            lastUpdated: new Date().toISOString()
        };

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        // Emit event
        ctx.stub.setEvent('VehicleCreated', Buffer.from(JSON.stringify(vehicle)));
        
        console.info('============= END : Create Vehicle ===========');
        return JSON.stringify(vehicle);
    }

    /**
     * Read vehicle details
     */
    async readVehicle(ctx, vehicleId) {
        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        
        if (!vehicleAsBytes || vehicleAsBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }
        
        return vehicleAsBytes.toString();
    }

    /**
     * Update vehicle location (GPS tracking)
     */
    async updateLocation(ctx, vehicleId, latitude, longitude) {
        console.info('============= START : Update Location ===========');

        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        if (!vehicleAsBytes || vehicleAsBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        const vehicle = JSON.parse(vehicleAsBytes.toString());
        vehicle.latitude = parseFloat(latitude);
        vehicle.longitude = parseFloat(longitude);
        vehicle.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        // Emit location update event
        const locationUpdate = {
            vehicleId,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
            timestamp: vehicle.lastUpdated
        };
        ctx.stub.setEvent('LocationUpdated', Buffer.from(JSON.stringify(locationUpdate)));

        console.info('============= END : Update Location ===========');
        return JSON.stringify(vehicle);
    }

    /**
     * Update vehicle mileage
     */
    async updateMileage(ctx, vehicleId, mileage) {
        console.info('============= START : Update Mileage ===========');

        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        if (!vehicleAsBytes || vehicleAsBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        const vehicle = JSON.parse(vehicleAsBytes.toString());
        const newMileage = parseInt(mileage);
        
        // Validate mileage (can't decrease)
        if (newMileage < vehicle.mileage) {
            throw new Error(`New mileage ${newMileage} cannot be less than current mileage ${vehicle.mileage}`);
        }

        vehicle.mileage = newMileage;
        vehicle.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.info('============= END : Update Mileage ===========');
        return JSON.stringify(vehicle);
    }

    /**
     * Transfer vehicle ownership
     */
    async transferOwnership(ctx, vehicleId, newOwner) {
        console.info('============= START : Transfer Ownership ===========');

        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        if (!vehicleAsBytes || vehicleAsBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        const vehicle = JSON.parse(vehicleAsBytes.toString());
        const oldOwner = vehicle.owner;
        
        vehicle.owner = newOwner;
        vehicle.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        // Emit ownership transfer event
        const transferEvent = {
            vehicleId,
            oldOwner,
            newOwner,
            timestamp: vehicle.lastUpdated
        };
        ctx.stub.setEvent('OwnershipTransferred', Buffer.from(JSON.stringify(transferEvent)));

        console.info('============= END : Transfer Ownership ===========');
        return JSON.stringify(vehicle);
    }

    /**
     * Update vehicle status
     */
    async updateStatus(ctx, vehicleId, status) {
        console.info('============= START : Update Status ===========');

        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        if (!vehicleAsBytes || vehicleAsBytes.length === 0) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        // Validate status
        const validStatuses = ['active', 'maintenance', 'inactive', 'sold'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const vehicle = JSON.parse(vehicleAsBytes.toString());
        vehicle.status = status;
        vehicle.lastUpdated = new Date().toISOString();

        await ctx.stub.putState(vehicleId, Buffer.from(JSON.stringify(vehicle)));
        
        console.info('============= END : Update Status ===========');
        return JSON.stringify(vehicle);
    }

    /**
     * Delete a vehicle
     */
    async deleteVehicle(ctx, vehicleId) {
        console.info('============= START : Delete Vehicle ===========');

        const exists = await this.vehicleExists(ctx, vehicleId);
        if (!exists) {
            throw new Error(`Vehicle ${vehicleId} does not exist`);
        }

        await ctx.stub.deleteState(vehicleId);
        
        console.info('============= END : Delete Vehicle ===========');
    }

    /**
     * Get all vehicles
     */
    async getAllVehicles(ctx) {
        const allResults = [];
        
        // Range query with empty string for startKey and endKey does an open-ended query of all vehicles
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                allResults.push(record);
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Get vehicles by owner
     */
    async getVehiclesByOwner(ctx, owner) {
        const allResults = [];
        
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                if (record.owner === owner) {
                    allResults.push(record);
                }
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Get vehicle history
     */
    async getVehicleHistory(ctx, vehicleId) {
        const iterator = await ctx.stub.getHistoryForKey(vehicleId);
        const allResults = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete
            };
            
            if (result.value.value && result.value.value.length > 0) {
                record.value = JSON.parse(result.value.value.toString('utf8'));
            }
            
            allResults.push(record);
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Check if vehicle exists
     */
    async vehicleExists(ctx, vehicleId) {
        const vehicleAsBytes = await ctx.stub.getState(vehicleId);
        return vehicleAsBytes && vehicleAsBytes.length > 0;
    }

    /**
     * Query vehicles by status
     */
    async queryVehiclesByStatus(ctx, status) {
        const query = {
            selector: {
                status: status
            }
        };

        const queryString = JSON.stringify(query);
        const iterator = await ctx.stub.getQueryResult(queryString);
        const allResults = [];
        
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                allResults.push(record);
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }
}

module.exports = VehicleContract;