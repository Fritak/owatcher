import React from 'react';
import {Image,  ScrollView, StyleSheet, Text, View, } from 'react-native';
import {Button} from 'react-native-elements';

import { Notifications } from 'expo';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';


export default class HomeScreen extends React.Component
{
    state = {
        hasCameraPermission: null,
        scanned: true,
        apiConnected: false,
        isComp: false,
        isQp: false,
        url: '',
        image: require('../assets/images/ow.png')
    };

    /**
     *
     * @returns {Promise<void>}
     */
    registerNotificationsAsync = async () =>
    {
        // We need to ask for Notification permissions for ios devices
        let result = await Permissions.askAsync(Permissions.NOTIFICATIONS);

        if (result.status === 'granted')
        {
            console.log('Notification permissions granted.')
        }

        Notifications.addListener(this.handleNotification);
    };


    handleNotification()
    {
        console.warn('Notification sent (but you are in the app, haha).');
    }

    sendOverwatchNotification(title, body)
    {
        const localNotification = {
            title: title,
            body: body
        };

        // 0,5s after change
        const schedulingOptions = { time: (new Date()).getTime() + 500 };

        Notifications.scheduleLocalNotificationAsync(localNotification, schedulingOptions);
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async componentDidMount()
    {
        this.getPermissionsAsync();
        this.registerNotificationsAsync();
    }

    /**
     *
     * @param prevProps
     * @param prevState
     * @param snapshot
     */
    componentDidUpdate(prevProps, prevState, snapshot)
    {
        // the comp has been found/canceled/whatever
        if (prevState.isComp && !this.state.isComp)
        {
            this.sendOverwatchNotification('Comp game has been found!', 'Probably, or not. Who knows.');
        }

        // the qp has been found/canceled/whatever
        if (prevState.isQp && !this.state.isQp)
        {
            this.sendOverwatchNotification('Qp game has been found!', 'Maybe, anyway something happened!');
        }

        if (prevState.apiConnected && !this.state.apiConnected)
        {
            this.sendOverwatchNotification('Connection lost.', 'Yup. No more connected to the pc. #sorry');
        }
    }

    checkApi()
    {
        // @todo run the background (eject): https://github.com/ocetnik/react-native-background-timer

        // check if api is connected
        this.interval = setInterval(async () =>
        {
            if(this.state.url !== undefined)
            {
                await fetch(this.state.url + '/alive')
                    .then((response) => response.json())
                    .then((responseJson) =>
                    {
                        if(responseJson.connected !== undefined )
                        {
                            this.setState({ apiConnected: responseJson.connected });
                        }
                        else
                        {
                            this.setState({ apiConnected: false });
                        }
                    }).catch((error) =>
                    {
                        this.setState({ apiConnected: false });
                    });
            }
        }, 500);

        // check if it is the game
        this.interval = setInterval(async () =>
        {
            if(this.state.apiConnected && this.state.url !== undefined)
            {
                await fetch(this.state.url + '/check')
                    .then((response) => response.json())
                    .then((responseJson) =>
                    {
                        if(responseJson.isComp !== this.state.isComp)
                        {
                            this.setState({ isComp: responseJson.isComp });
                        }

                        if(responseJson.isQp !== this.state.isQp)
                        {
                            this.setState({ isQp: responseJson.isQp });
                        }
                        this.setPlayImage();
                    }).catch((error) =>
                    {
                        this.setState({ isComp: false, isQp: false });
                        this.setPlayImage();
                    });

            }
        }, 1000);
    }

    getPermissionsAsync = async () =>
    {
        const { status } = await Permissions.askAsync(Permissions.CAMERA);
        this.setState({ hasCameraPermission: status === 'granted' });
    };

    setPlayImage()
    {
        let image = '';
        if (this.state.isComp)
        {
            this.setState({ image: require('../assets/images/comp.png') });
        }
        else if (this.state.isQp)
        {
            this.setState({ image: require('../assets/images/qp_genji.png') });
        }
        else
        {
            this.setState({ image: require('../assets/images/ow.png') });
        }


        return image
    };

    render()
    {
        const { hasCameraPermission, scanned, apiConnected, isComp, isQp, url, image } = this.state;

        if (hasCameraPermission === null)
        {
            return <Text>Requesting for camera permission</Text>;
        }
        if (hasCameraPermission === false)
        {
            return <Text>No access to camera</Text>;
        }

        return (
            <View style={styles.container}>
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}>
                    <View style={styles.topContainer}>
                        <Image
                            source={require('../assets/images/bastion.png')}
                            style={styles.bastionImage}
                        />
                    </View>

                    <View style={styles.qrTextContainer}>
                        <Text style={styles.note}>
                            We need to scan QR code from your computer to pair the app. If it's something wrong you can always re-scan again.
                        </Text>

                        <View style={{display: scanned? 'flex' : 'none'}}>
                            <Button
                                title="Scan QR code"
                                buttonStyle={[styles.qrButton]}
                                onPress={ () => this.setState({ scanned: false, url: undefined }) }
                            />

                            <View style={{display: apiConnected? 'flex' : 'none', marginTop: 10}}>
                                <Text style={styles.note}>
                                    Pc connection: {apiConnected? "Connected with PC" : "Not connected with PC."}
                                </Text>
                            </View>

                            <View style={{display: apiConnected? 'flex' : 'none', marginTop: 10, alignItems: 'center'}}>
                                <Image source={ image } style={styles.gameImage} />
                                <Text>
                                    { isComp? 'Searching for the comp! (good luck).' : (isQp? 'Searching for ... quick game! (have fun?).' : "Come on, let's play")}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View
                    style={{
                        flex: 1,
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        display: scanned? 'none' : 'flex'
                    }}>

                    <BarCodeScanner
                        onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
                        style={StyleSheet.absoluteFillObject}
                    />
                </View>
            </View>
        );
    }

    handleBarCodeScanned = ({ type, data }) =>
    {
        this.setState({ scanned: true, url: data });
        this.checkApi();
    };
}


HomeScreen.navigationOptions =
{
    header: null,
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingTop: 30,
    },
    topContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 5,
    },
    bastionImage: {
        width: 150,
        height: 140,
        resizeMode: 'contain',
        marginTop: 3,
        marginLeft: -10,
    },
    gameImage: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
        marginTop: 3,
    },
    qrTextContainer: {
        alignItems: 'center',
        marginHorizontal: 20,
    },
    qrButton: {
        marginTop: 10
    },
    note: {
        marginTop: 5,
        fontSize: 17,
        color: 'rgba(96,100,109, 1)',
        lineHeight: 24,
        textAlign: 'left',
    }
});
