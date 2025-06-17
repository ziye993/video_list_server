const os = require('os');
const { exec } = require('child_process');

function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const interfaceInfo = {};

    for (const interfaceName in interfaces) {
        const addresses = interfaces[interfaceName];
        interfaceInfo[interfaceName] = [];

        addresses.forEach((address) => {
            interfaceInfo[interfaceName].push({
                family: address.family,
                address: address.address,
                netmask: address.netmask,
                mac: address.mac,
                internal: address.internal,
                cidr: address.cidr
            });
        });
    }
    return interfaceInfo;
}

function getWindowsGateway() {
    return new Promise((resolve, reject) => {
        exec('netsh interface ip show addresses', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const lines = stdout.split('\n');
            const gatewayInfo = {};
            let currentInterface = null;
            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('Interface')) {
                    currentInterface = trimmedLine.split(' ')[1].replace(/"/g, '');
                    gatewayInfo[currentInterface] = {};
                } else if (currentInterface && trimmedLine.startsWith('Default Gateway')) {
                    const gateway = trimmedLine.split(':')[1].trim();
                    gatewayInfo[currentInterface].gateway = gateway;
                }
            });
            resolve(gatewayInfo);
        });
    });
}

function getLinuxGateway() {
    return new Promise((resolve, reject) => {
        exec('ip route | grep default', (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const lines = stdout.split('\n');
            const gatewayInfo = {};
            lines.forEach(line => {
                const parts = line.split(' ');
                if (parts.length > 2 && parts[0] === 'default') {
                    const interfaceName = parts[4];
                    const gateway = parts[2];
                    gatewayInfo[interfaceName] = { gateway };
                }
            });
            resolve(gatewayInfo);
        });
    });
}

async function getFullNetworkInfo() {
    const basicInfo = getNetworkInterfaces();
    let gatewayInfo;
    try {
        if (process.platform === 'win32') {
            gatewayInfo = await getWindowsGateway();
        } else if (process.platform === 'linux') {
            gatewayInfo = await getLinuxGateway();
        }
    } catch (error) {
        console.error('获取网关信息时出错:', error);
    }

    const fullInfo = {};
    for (const [interfaceName, details] of Object.entries(basicInfo)) {
        fullInfo[interfaceName] = {
            ...(gatewayInfo && gatewayInfo[interfaceName] || {}),
            addresses: details
        };
        console.log(gatewayInfo)
    }
    return fullInfo;
}

module.exports = getFullNetworkInfo;
