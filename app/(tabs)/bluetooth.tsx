import React, {useEffect, useRef, useState} from 'react';
import {SafeAreaView, View, Text, Button, FlatList, TouchableOpacity, ScrollView, Alert, Switch, AppState} from 'react-native';
import {BleManager, Device, Characteristic} from 'react-native-ble-plx';


export default function App() {
  const appState = useRef(AppState.currentState);
  const managerRef = useRef<BleManager | null>(null);
  if (!managerRef.current) {
    // Enable state restoration on iOS. On Android this is a no-op but harmless.
    managerRef.current = new BleManager({
      restoreStateIdentifier: 'com.aarshshah.client.ble.restore',
      restoreStateFunction: (restoredState) => {
        // If the OS wakes us up, reattach monitors to continue receiving updates
        if (restoredState?.connectedPeripherals?.length) {
          // Best-effort: try to resume notifications for HR service
          restoredState.connectedPeripherals.forEach(async (peripheral) => {
            try {
              const services = await peripheral.services();
              for (const service of services) {
                if (service.uuid.toLowerCase().includes('180d')) {
                  const chars = await service.characteristics();
                  for (const char of chars) {
                    if (char.uuid.toLowerCase().includes('2a37') && (char.isNotifiable || char.isIndicatable)) {
                      await char.monitor(() => {});
                    }
                  }
                }
              }
            } catch {}
          });
        }
      },
    });
  }
  const manager = managerRef.current;
  const [devicesMap, setDevicesMap] = useState<Record<string, any>>({});
  const [scanning, setScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [characteristics, setCharacteristics] = useState<any[]>([]);
  const [readData, setReadData] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [maxDistance, setMaxDistance] = useState<number>(-70); // RSSI threshold (closer = higher number)
  const [showDistanceFilter, setShowDistanceFilter] = useState<boolean>(false);
  const [enableDistanceFilter, setEnableDistanceFilter] = useState<boolean>(true);
  const [heartRateData, setHeartRateData] = useState<number | null>(null);
  const [heartRateHistory, setHeartRateHistory] = useState<Array<{timestamp: string, value: number}>>([]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const prev = appState.current;
      appState.current = nextState;
      // If we move to background, keep notifications alive; if we come back, ensure HR monitoring is active
      if (prev.match(/active/) && nextState.match(/background|inactive/)) {
        // No-op: monitoring continues if already started
      } else if (prev.match(/background|inactive/) && nextState === 'active') {
        // Re-ensure monitoring when app returns to foreground
        await startHeartRateMonitoring();
      }
    });
    return () => {
      try { sub.remove(); } catch {}
      try { manager?.destroy(); } catch (e) {}
    };
  }, []);

  const startScan = () => {
    setDevicesMap({});
    setScanning(true);

    manager?.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.warn('scan error', error);
        setScanning(false);
        return;
      }
      if (device && device.id) {
        setDevicesMap(prev => ({...prev, [device.id]: device}));
      }
    });

    // stop scan after 10s
    setTimeout(() => {
      manager?.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const connectToDevice = async (id: string) => {
    try {
      setConnectionStatus('Connecting...');
      const device = await manager!.connectToDevice(id, { autoConnect: true });
      await device.discoverAllServicesAndCharacteristics();
      
      setConnectedDevice(device);
      setConnectionStatus('Connected');
      
      // Get services and characteristics
      console.log('🔍 Discovering services...');
      const deviceServices = await device.services();
      console.log('🔍 Found services:', deviceServices.length);
      deviceServices.forEach((service, index) => {
        console.log(`🔍 Service ${index + 1}:`, service.uuid);
      });
      setServices(deviceServices);
      
      // Get characteristics for each service
      console.log('🔍 Discovering characteristics...');
      const allCharacteristics = [];
      for (const service of deviceServices) {
        console.log('🔍 Getting characteristics for service:', service.uuid);
        const serviceCharacteristics = await service.characteristics();
        console.log('🔍 Found characteristics:', serviceCharacteristics.length);
        serviceCharacteristics.forEach((char, index) => {
          console.log(`🔍 Characteristic ${index + 1}:`, char.uuid);
          console.log(`🔍 Properties:`, (char as any).properties);
          console.log(`🔍 Is Readable:`, char.isReadable);
          console.log(`🔍 Is Writable:`, char.isWritableWithResponse || char.isWritableWithoutResponse);
          console.log(`🔍 Is Notifiable:`, char.isNotifiable);
          console.log(`🔍 Is Indicatable:`, char.isIndicatable);
        });
        allCharacteristics.push(...serviceCharacteristics);
      }
      
      // Debug: Log characteristic structure
      console.log('🔍 Total characteristics found:', allCharacteristics.length);
      if (allCharacteristics.length > 0) {
        console.log('🔍 Sample characteristic:', allCharacteristics[0]);
        console.log('🔍 Characteristic properties type:', typeof (allCharacteristics[0] as any)?.properties);
        console.log('🔍 Characteristic properties value:', (allCharacteristics[0] as any)?.properties);
      }
      
      setCharacteristics(allCharacteristics);
      
      console.log('Connected to', device.id);
      console.log('Services:', deviceServices.length);
      console.log('Characteristics:', allCharacteristics.length);
      
      // Auto-start heart rate monitoring if available
      setTimeout(() => {
        startHeartRateMonitoring();
      }, 1000);
      
      Alert.alert('Success', `Connected to ${device.name || 'Unknown Device'}`);
    } catch (e) {
      console.warn('Connect error', e);
      setConnectionStatus('Connection Failed');
      Alert.alert('Connection Error', (e as Error).message || 'Failed to connect to device');
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
        setConnectedDevice(null);
        setServices([]);
        setCharacteristics([]);
        setReadData('');
        setConnectionStatus('Disconnected');
        Alert.alert('Disconnected', 'Device disconnected successfully');
      } catch (e) {
        console.warn('Disconnect error', e);
      }
    }
  };

  const readCharacteristic = async (characteristic: Characteristic) => {
    try {
      console.log('📖 Reading characteristic:', characteristic.uuid);
      console.log('📖 Service UUID:', characteristic.serviceUUID);
      
      const data = await characteristic.read();
      console.log('📖 Raw response:', data);
      console.log('📖 Response value (base64):', data.value);
      
      if (data.value) {
        // Convert base64 to Uint8Array for React Native
        const binaryString = atob(data.value);
        const buffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          buffer[i] = binaryString.charCodeAt(i);
        }
        
        console.log('📖 Buffer length:', buffer.length);
        console.log('📖 Buffer data (hex):', Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' '));
        console.log('📖 Buffer data (bytes):', Array.from(buffer));
        
        const decodedData = String.fromCharCode.apply(null, Array.from(buffer));
        console.log('📖 Decoded UTF-8 data:', decodedData);
        
        setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] ${characteristic.uuid}: ${decodedData}`);
      } else {
        console.log('📖 No data in response');
        setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] ${characteristic.uuid}: No data`);
      }
    } catch (e) {
      console.warn('❌ Read error', e);
      Alert.alert('Read Error', (e as Error).message || 'Failed to read characteristic');
    }
  };

  const writeCharacteristic = async (characteristic: Characteristic, value: string) => {
    try {
      console.log('✍️ Writing to characteristic:', characteristic.uuid);
      console.log('✍️ Service UUID:', characteristic.serviceUUID);
      console.log('✍️ Value to write:', value);
      
      // Convert string to base64 for React Native
      const base64Value = btoa(value);
      console.log('✍️ Base64 encoded value:', base64Value);
      console.log('✍️ String length:', value.length);
      
      await characteristic.writeWithResponse(base64Value);
      setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] Wrote: ${value}`);
      console.log('✅ Successfully wrote data:', value);
    } catch (e) {
      console.warn('❌ Write error', e);
      Alert.alert('Write Error', (e as Error).message || 'Failed to write to characteristic');
    }
  };

  const startNotifications = async (characteristic: Characteristic) => {
    try {
      console.log('🔔 Starting notifications for characteristic:', characteristic.uuid);
      console.log('🔔 Service UUID:', characteristic.serviceUUID);
      console.log('🔔 Characteristic properties:', (characteristic as any).properties);
      
      await characteristic.monitor((error, characteristic) => {
        if (error) {
          console.warn('❌ Notification error', error);
          return;
        }
        
        console.log('📡 Received notification from characteristic:', characteristic?.uuid);
        console.log('📡 Service UUID:', characteristic?.serviceUUID);
        
        if (characteristic?.value) {
          // Convert base64 to Uint8Array for React Native
          const binaryString = atob(characteristic.value);
          const data = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            data[i] = binaryString.charCodeAt(i);
          }
          
          console.log('📊 Raw base64 data:', characteristic.value);
          console.log('📊 Data length:', data.length);
          console.log('📊 Data (hex):', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
          console.log('📊 Data (bytes):', Array.from(data));
          
          // Check if this is a heart rate characteristic
          const isHeartRateChar = characteristic.uuid.toLowerCase().includes('2a37');
          const isHeartRateService = characteristic.serviceUUID?.toLowerCase().includes('180d');
          
          console.log('❤️ Is heart rate characteristic (2a37):', isHeartRateChar);
          console.log('❤️ Is heart rate service (180d):', isHeartRateService);
          
          if (isHeartRateChar || isHeartRateService) {
            console.log('❤️ Processing heart rate data...');
            const heartRate = parseHeartRateData(data);
            console.log('❤️ Parsed heart rate:', heartRate);
            
            if (heartRate !== null) {
              setHeartRateData(heartRate);
              setHeartRateHistory(prev => [...prev, {
                timestamp: new Date().toLocaleTimeString(),
                value: heartRate
              }].slice(-20)); // Keep last 20 readings
              
              setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] Heart Rate: ${heartRate} BPM`);
              console.log('❤️ Heart rate updated to:', heartRate, 'BPM');
            } else {
              console.log('❌ Failed to parse heart rate data');
            }
          } else {
            // Regular data handling
            const decodedData = String.fromCharCode.apply(null, Array.from(data));
            console.log('📝 Decoded UTF-8 data:', decodedData);
            setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] Notification: ${decodedData}`);
          }
        } else {
          console.log('⚠️ No data in characteristic value');
        }
      });
      setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] Started notifications for ${characteristic.uuid}`);
    } catch (e) {
      console.warn('❌ Notification error', e);
      Alert.alert('Notification Error', (e as Error).message || 'Failed to start notifications');
    }
  };

  // Parse heart rate data according to BLE Heart Rate Service specification
  const parseHeartRateData = (data: Uint8Array): number | null => {
    try {
      console.log('🔍 Parsing heart rate data...');
      console.log('🔍 Data length:', data.length);
      console.log('🔍 Data bytes:', Array.from(data));
      console.log('🔍 Data hex:', Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      if (data.length < 2) {
        console.log('❌ Data too short for heart rate (need at least 2 bytes)');
        return null;
      }
      
      let offset = 0;
      const flags = data[offset++];
      console.log('🔍 Flags byte:', flags, '(binary:', flags.toString(2).padStart(8, '0') + ')');
      
      // Check if heart rate is 8-bit or 16-bit
      const is16Bit = (flags & 0x01) !== 0;
      console.log('🔍 Is 16-bit format:', is16Bit);
      
      let heartRate: number;
      if (is16Bit) {
        if (data.length < 3) {
          console.log('❌ Data too short for 16-bit heart rate (need at least 3 bytes)');
          return null;
        }
        // Read 16-bit little-endian
        heartRate = data[offset] | (data[offset + 1] << 8);
        console.log('🔍 16-bit heart rate value:', heartRate);
        offset += 2;
      } else {
        heartRate = data[offset++];
        console.log('🔍 8-bit heart rate value:', heartRate);
      }
      
      // Validate heart rate range (reasonable values)
      if (heartRate < 30 || heartRate > 250) {
        console.log('❌ Heart rate out of range:', heartRate, '(expected 30-250)');
        return null;
      }
      
      console.log('✅ Valid heart rate parsed:', heartRate, 'BPM');
      return heartRate;
    } catch (e) {
      console.warn('❌ Error parsing heart rate data:', e);
      return null;
    }
  };

  // Auto-start heart rate monitoring when heart rate service is found
  const startHeartRateMonitoring = async () => {
    if (!connectedDevice) return;
    
    try {
      console.log('❤️ Starting heart rate monitoring...');
      const services = await connectedDevice.services();
      for (const service of services) {
        // Heart Rate Service UUID: 0000180D-0000-1000-8000-00805F9B34FB
        if (service.uuid.toLowerCase().includes('180d')) {
          console.log('❤️ Found Heart Rate Service:', service.uuid);
          
          const characteristics = await service.characteristics();
          for (const char of characteristics) {
            // Heart Rate Measurement Characteristic UUID: 00002A37-0000-1000-8000-00805F9B34FB
            if (char.uuid.toLowerCase().includes('2a37')) {
              console.log('❤️ Found Heart Rate Characteristic:', char.uuid);
              console.log('❤️ Is Notifiable:', char.isNotifiable);
              console.log('❤️ Is Indicatable:', char.isIndicatable);
              
              if (char.isNotifiable || char.isIndicatable) {
                console.log('❤️ Starting notifications for heart rate characteristic...');
                await startNotifications(char);
                setReadData(prev => prev + `\n[${new Date().toLocaleTimeString()}] Auto-started heart rate monitoring`);
                return;
              } else {
                console.log('⚠️ Heart rate characteristic is not notifiable/indicatable');
              }
            }
          }
        }
      }
      console.log('⚠️ No heart rate service or characteristic found');
    } catch (e) {
      console.warn('❌ Error starting heart rate monitoring:', e);
    }
  };

  // Filter devices by distance (RSSI)
  const allDevices = Object.values(devicesMap);
  const devices = enableDistanceFilter 
    ? allDevices.filter(device => {
        const rssi = device.rssi || -100; // Default to very far if no RSSI
        return rssi >= maxDistance; // Higher RSSI = closer device
      })
    : allDevices;

  // Helper function to get distance description
  const getDistanceDescription = (rssi: number) => {
    if (rssi >= -30) return 'Very Close';
    if (rssi >= -50) return 'Close';
    if (rssi >= -70) return 'Nearby';
    if (rssi >= -90) return 'Far';
    return 'Very Far';
  };

  return (
    <SafeAreaView style={{flex:1, padding:16}}>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={true}>
        {/* Connection Status */}
        <View style={{marginBottom: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8}}>
          <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 4}}>Status: {connectionStatus}</Text>
          {connectedDevice && (
            <Text style={{fontSize: 14, color: '#666'}}>
              Device: {connectedDevice.name || 'Unknown'} ({connectedDevice.id})
            </Text>
          )}
        </View>

        {/* Control Buttons */}
        <View style={{flexDirection: 'row', marginBottom: 16, gap: 8, flexWrap: 'wrap'}}>
          <Button 
            title={scanning ? 'Scanning...' : 'Start Scan'} 
            onPress={startScan} 
            disabled={scanning}
          />
          {connectedDevice && (
            <Button title="Disconnect" onPress={disconnectDevice} color="red" />
          )}
          {connectedDevice && (
            <Button 
              title="Debug: Read All" 
              onPress={async () => {
                console.log('🔍 DEBUG: Reading all characteristics...');
                for (const char of characteristics) {
                  if (char.isReadable) {
                    console.log('🔍 Reading characteristic:', char.uuid);
                    await readCharacteristic(char);
                  }
                }
              }}
            />
          )}
        </View>

        {/* Distance Filter Controls */}
        <View style={{marginBottom: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef'}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <Text style={{fontSize: 16, fontWeight: 'bold'}}>Distance Filter</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Switch
                value={enableDistanceFilter}
                onValueChange={setEnableDistanceFilter}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={enableDistanceFilter ? '#f5dd4b' : '#f4f3f4'}
              />
              <Button 
                title={showDistanceFilter ? 'Hide' : 'Show'} 
                onPress={() => setShowDistanceFilter(!showDistanceFilter)}
              />
            </View>
          </View>
          
          {showDistanceFilter && enableDistanceFilter && (
            <View>
              <Text style={{fontSize: 14, marginBottom: 8}}>
                Max Distance: {getDistanceDescription(maxDistance)} (RSSI: {maxDistance})
              </Text>
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap'}}>
                <Button title="Very Close" onPress={() => setMaxDistance(-30)} />
                <Button title="Close" onPress={() => setMaxDistance(-50)} />
                <Button title="Nearby" onPress={() => setMaxDistance(-70)} />
                <Button title="Far" onPress={() => setMaxDistance(-90)} />
              </View>
              <Text style={{fontSize: 12, color: '#666'}}>
                Showing {devices.length} of {allDevices.length} devices
              </Text>
            </View>
          )}
          
          {!enableDistanceFilter && (
            <Text style={{fontSize: 12, color: '#666'}}>
              Showing all {allDevices.length} devices (filter disabled)
            </Text>
          )}
        </View>

        {/* Device List */}
        <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Available Devices:</Text>
        <View style={{maxHeight: 200, marginBottom: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 4}}>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({item}) => (
              <TouchableOpacity 
                onPress={() => connectToDevice(item.id)} 
                style={{
                  padding: 12, 
                  borderBottomWidth: 1, 
                  borderBottomColor: '#ddd',
                  backgroundColor: connectedDevice?.id === item.id ? '#e8f5e8' : 'white'
                }}
              >
                <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>
                  {item.name ?? 'Unknown Device'}
                </Text>
                <Text style={{fontSize:12, color:'#666'}}>{item.id}</Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={{fontSize:10, color:'#999'}}>RSSI: {item.rssi || 'N/A'}</Text>
                  <Text style={{fontSize:10, color: item.rssi >= -50 ? '#4CAF50' : item.rssi >= -70 ? '#FF9800' : '#F44336'}}>
                    {getDistanceDescription(item.rssi || -100)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          />
        </View>

        {/* Heart Rate Display */}
        {heartRateData !== null && (
          <View style={{marginBottom: 16, padding: 16, backgroundColor: '#ffebee', borderRadius: 8, borderWidth: 2, borderColor: '#f44336'}}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 8}}>
              ❤️ Heart Rate Monitor
            </Text>
            <Text style={{fontSize: 48, fontWeight: 'bold', color: '#d32f2f', textAlign: 'center', marginBottom: 4}}>
              {heartRateData} BPM
            </Text>
            <Text style={{fontSize: 12, color: '#666', textAlign: 'center'}}>
              Last updated: {new Date().toLocaleTimeString()}
            </Text>
            
            {heartRateHistory.length > 1 && (
              <View style={{marginTop: 12}}>
                <Text style={{fontSize: 14, fontWeight: 'bold', marginBottom: 4}}>Recent Readings:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 60}}>
                  {heartRateHistory.slice(-10).map((reading, index) => (
                    <View key={index} style={{marginRight: 8, padding: 4, backgroundColor: '#fff', borderRadius: 4, minWidth: 60}}>
                      <Text style={{fontSize: 12, fontWeight: 'bold', textAlign: 'center'}}>{reading.value}</Text>
                      <Text style={{fontSize: 8, color: '#666', textAlign: 'center'}}>{reading.timestamp}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Services and Characteristics */}
        {connectedDevice && (
          <View>
            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>
              Services ({services.length}):
            </Text>
            {services.map((service, index) => {
              const isHeartRateService = service.uuid.toLowerCase().includes('180d');
              return (
                <View key={index} style={{
                  marginBottom: 8, 
                  padding: 8, 
                  backgroundColor: isHeartRateService ? '#e8f5e8' : '#f9f9f9', 
                  borderRadius: 4,
                  borderWidth: isHeartRateService ? 2 : 0,
                  borderColor: isHeartRateService ? '#4caf50' : 'transparent'
                }}>
                  <Text style={{fontSize: 14, fontWeight: 'bold'}}>
                    Service {index + 1} {isHeartRateService ? '❤️ (Heart Rate)' : ''}
                  </Text>
                  <Text style={{fontSize: 12, color: '#666'}}>UUID: {service.uuid}</Text>
                </View>
              );
            })}

            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 16}}>
              Characteristics ({characteristics.length}):
            </Text>
            {characteristics.map((char, index) => {
              const isHeartRateChar = char.uuid.toLowerCase().includes('2a37');
              return (
                <View key={index} style={{
                  marginBottom: 8, 
                  padding: 8, 
                  backgroundColor: isHeartRateChar ? '#e8f5e8' : '#f9f9f9', 
                  borderRadius: 4,
                  borderWidth: isHeartRateChar ? 2 : 0,
                  borderColor: isHeartRateChar ? '#4caf50' : 'transparent'
                }}>
                  <Text style={{fontSize: 14, fontWeight: 'bold'}}>
                    Characteristic {index + 1} {isHeartRateChar ? '❤️ (Heart Rate)' : ''}
                  </Text>
                  <Text style={{fontSize: 12, color: '#666'}}>UUID: {char.uuid}</Text>
                  <Text style={{fontSize: 12, color: '#666'}}>
                    Properties: {Array.isArray(char.properties) ? char.properties.join(', ') : 'Unknown'}
                  </Text>
                <View style={{flexDirection: 'row', marginTop: 4, gap: 4}}>
                  {char.isReadable && (
                    <View style={{flex: 1}}>
                      <Button 
                        title="Read" 
                        onPress={() => readCharacteristic(char)}
                      />
                    </View>
                  )}
                  {(char.isWritableWithResponse || char.isWritableWithoutResponse) && (
                    <View style={{flex: 1}}>
                      <Button 
                        title="Write Test" 
                        onPress={() => writeCharacteristic(char, 'Hello from app!')}
                      />
                    </View>
                  )}
                  {(char.isNotifiable || char.isIndicatable) && (
                    <View style={{flex: 1}}>
                      <Button 
                        title="Notify" 
                        onPress={() => startNotifications(char)}
                      />
                    </View>
                  )}
                </View>
              </View>
              );
            })}
          </View>
        )}

        {/* Data Display */}
        {readData && (
          <View style={{marginTop: 16}}>
            <Text style={{fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>Data Log:</Text>
            <ScrollView 
              style={{
                height: 200, 
                backgroundColor: '#f0f0f0', 
                padding: 8, 
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#ddd'
              }}
              nestedScrollEnabled={true}
            >
              <Text style={{fontSize: 12, fontFamily: 'monospace'}}>{readData}</Text>
            </ScrollView>
            <View style={{marginTop: 8}}>
              <Button 
                title="Clear Log" 
                onPress={() => setReadData('')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
