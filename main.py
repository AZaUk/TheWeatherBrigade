# Library for working with datetime manipulation
from datetime import datetime
# Paho MQTT library for MQTT communication
import paho.mqtt.client as mqtt
# JSON library for working with JSON data
import json
# PyODBC library for connection to database
import pyodbc

# Function to subscribe to topics in MQTT broker
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    client.subscribe("v3/the-weather-brigade-1-2023@ttn/devices/grp1-twb-2023-v2/up")

# Function to handle MQTT payload data
def on_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.payload))

    message_payload = msg.payload.decode('utf-8')
    process_and_insert_data(message_payload)

# Function to process and insert into the database
def process_and_insert_data(message_payload):
    try:
        # Parse JSON payload data
        payload_data = json.loads(message_payload)

        # Extract data from json format for database insertion
        uplink_message = payload_data.get('uplink_message', {})
        decoded_payload = uplink_message.get('decoded_payload', {})
        settings = uplink_message.get('settings', {})
        rx_metadata = uplink_message.get('rx_metadata', [{}])[0].get('location', {})
        rx_metadata1 = uplink_message.get('rx_metadata', [{}])[0].get('gateway_ids', {})

        gateway_id = rx_metadata1.get('gateway_id')
        device_name = payload_data["end_device_ids"]["device_id"]
        timestamp = settings.get('time', None)
        timestamp_str = timestamp[:-1]
        time = datetime.fromisoformat(timestamp_str)
        ottemp = decoded_payload.get('TempC_SHT', None)
        pressure = decoded_payload.get('Pressure', None)
        longitude = rx_metadata.get('longitude', None)
        latitude = rx_metadata.get('latitude', None)
        battery_voltage = decoded_payload.get('BatV', None)
        payload_values = decoded_payload.get("payload").split()
        tempds, humidity, pressure, illuminance = map(float, payload_values)

        consumed_airtime_with_s = uplink_message.get('consumed_airtime', None)
        consumed_airtime = float(consumed_airtime_with_s[:-1])
        device_id = None

        # Connect to the Azure cloud database
        conn_str = 'DRIVER={ODBC Driver 17 for SQL Server};SERVER=the-weather-brigade.database.windows.net;DATABASE=weatherbrg;UID=brigadier;PWD=[redacted]'
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()

        # Check if the combination of longitude and latitude exists in the Gateway table
        cursor.execute('SELECT ID FROM Gateway WHERE ABS(Longitude - ?) < 0.0001 AND ABS(Latitude - ?) < 0.0001',
                       (longitude, latitude))
        result = cursor.fetchone()

        # If the combination of gateway exist, get gateway id
        if result:
            gateway_id = str(result[0])
        else:
            # Insert into Gateway table if the combination doesn't exist
            cursor.execute('INSERT INTO Gateway (ID ,Longitude, Latitude) VALUES (?, ?, ?)',
                           (gateway_id, longitude, latitude))
            conn.commit()

        # Check if the combination of Gateway_id and Device_name exists in the Device table
        cursor.execute('SELECT ID FROM Device WHERE Gateway_id = ? AND Device_name = ?', (gateway_id, device_name))
        result_device = cursor.fetchone()

        if not result_device:
            # Insert into Device table if the combination doesn't exist
            cursor.execute('INSERT INTO Device (Gateway_id, Device_name, AvgAirtime) VALUES (?, ?, ?)',
                           (gateway_id, device_name, consumed_airtime))
            conn.commit()

        # Retrieve the Device_id, whether it's newly inserted or existing
        cursor.execute('SELECT ID FROM Device WHERE Gateway_id = ? AND Device_name = ?', (gateway_id, device_name))
        device_result = cursor.fetchone()

        # If combination of device exist, get device id
        if device_result:
            device_id = device_result[0]

        # Define SQL query for inserting to the Data Table
        sql_query = '''
                   INSERT INTO Data (Device_id, Humidity, OutTemp, Intemp, BatVoltage, Time, Pressure, Illuminance)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               '''

        # Set values based on data
        values = (device_id, humidity, ottemp, tempds, battery_voltage, time, pressure, illuminance)

        # Execute the data insertion
        cursor.execute(sql_query, values)

        conn.commit()
        conn.close()

        print("Data inserted successfully.")
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
    except pyodbc.Error as e:
        print(f"Azure SQL error: {e}")

# MQTT client setup and connection
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Set username, password, and connect to MQTT broker


# Start the infinite loop
client.loop_forever()
