const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const xmlparser = require('express-xml-bodyparser');
const bodyParser = require('body-parser');
const path = require('path');
const xml2js = require('xml2js');
const app = express();
const PORT = 3000;

app.use(bodyParser.text({ type: 'application/xml' }));
app.use(express.json())

const sendIndexPage = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
};
app.get('/index', sendIndexPage);
app.get('/', sendIndexPage);
app.get('/home', sendIndexPage);

app.get('/cars', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cars.html'));
});

app.get('/cars', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cars.html'));
});
app.get('/contact-us', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact-us.html'));
});
app.get('/cruises', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cruises.html'));
});
app.get('/flights', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flights.html'));
});
app.get('/stays', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stays.html'));
});
app.get('/flights-cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'flightCart.html'));
});
app.get('/stays-cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staysCart.html'));
});

app.post('/contact-us/submitContactForm', (req, res) => {
    // we get raw xml from req body
    const xmlData = req.body; 

    // checking if xmlData is defined and not empty
    if (!xmlData) {
        return res.status(400).send('No XML data received');
    }

    // generating a unique filename
    const uniqueId = uuidv4();
    const filePath = `./contact/contactForm_${uniqueId}.xml`;

    // saving the XML data to a file
    fs.writeFile(filePath, xmlData, (err) => {
        if (err) {
            console.error('Error saving XML file:', err);
            return res.status(500).send('Failed to save XML file');
        }
        console.log(`XML file saved successfully as ${filePath}`);
        res.send(`XML data received and saved successfully as ${filePath}`);
    });
});

// get flights data
app.get('/flights/data', (req, res) => {
    const xmlFilePath = path.join(__dirname, 'flightData/available_flights.xml');

    // reading XML file
    fs.readFile(xmlFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading XML file:', err);
            return res.status(500).send('Error reading XML file');
        }

        // sending XML data as the response
        res.set('Content-Type', 'application/xml');
        res.send(data);
    });
});


// save booking data
app.post('/flights/saveBooking', (req, res) => {
    const bookingData = req.body;

    // read existing bookings
    let bookings = [];
    if (fs.existsSync('flightData/bookings.json')) {
        bookings = JSON.parse(fs.readFileSync('flightData/bookings.json', 'utf8'));
    }

    // Add new booking
    bookings.push(bookingData);

    // Save to file
    fs.writeFileSync('flightData/bookings.json', JSON.stringify(bookings, null, 2));
    res.send({ message: 'Booking saved successfully' });
});

// updating available seats in XML file
app.post('/flights/updateSeats', (req, res) => {
    const { flightId, seatsToReduce } = req.body;

    // reading XML file
    fs.readFile('flightData/available_flights.xml', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading XML file');
        }

        // parsing XML
        const parser = new xml2js.Parser();
        parser.parseString(data, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error parsing XML file');
            }

            // finding the flight and update available seats
            const flights = result.flights.flight;
            flights.forEach(flight => {
                if (flight['flight-id'][0] === flightId) {
                    flight['available-seats'][0] = (parseInt(flight['available-seats'][0]) - seatsToReduce).toString();
                }
            });

            // Build XML
            const builder = new xml2js.Builder();
            const updatedXML = builder.buildObject(result);

            // writing back to file
            fs.writeFile('flightData/available_flights.xml', updatedXML, (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Error writing XML file');
                }
                res.send({ message: 'Available seats updated successfully' });
            });
        });
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// get available hotels
app.post('/stays/getAvailableHotels', (req, res) => {
    const searchCriteria = req.body;
    const city = searchCriteria.city;
    const checkinDate = new Date(searchCriteria.checkin);
    const checkoutDate = new Date(searchCriteria.checkout);
    const numRoomsNeeded = searchCriteria.numRooms;

    // reading the hotels JSON file
    fs.readFile('hotelData/available_hotels.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading hotels data:', err);
            return res.status(500).send('Error reading hotels data');
        }

        const hotelsData = JSON.parse(data);
        const hotels = hotelsData.hotels;

        // filtering hotels
        const availableHotels = hotels.filter(hotel => {
            return hotel.city.toLowerCase() === city.toLowerCase();
        });

        // grouping hotels by hotel-id
        const hotelsGrouped = {};
        availableHotels.forEach(hotel => {
            if (!hotelsGrouped[hotel['hotel-id']]) {
                hotelsGrouped[hotel['hotel-id']] = {
                    'hotel-id': hotel['hotel-id'],
                    'hotel-name': hotel['hotel-name'],
                    city: hotel.city,
                    dates: {}
                };
            }
            hotelsGrouped[hotel['hotel-id']].dates[hotel.date] = {
                'available-rooms': hotel['available-rooms'],
                'price-per-night': parseFloat(hotel['price-per-night'])
            };
        });

        const filteredHotels = [];

        for (let hotelId in hotelsGrouped) {
            const hotel = hotelsGrouped[hotelId];
            const hotelDates = hotel.dates;

            let isAvailable = true;
            let totalAvailableRooms = Infinity;
            let nightlyRates = [];

            let currentDate = new Date(checkinDate);
            while (currentDate < checkoutDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dateInfo = hotelDates[dateStr];

                if (!dateInfo || dateInfo['available-rooms'] < numRoomsNeeded) {
                    isAvailable = false;
                    break;
                } else {
                    totalAvailableRooms = Math.min(totalAvailableRooms, dateInfo['available-rooms']);
                    nightlyRates.push({
                        date: dateStr,
                        'price-per-night': dateInfo['price-per-night']
                    });
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (isAvailable) {
                filteredHotels.push({
                    'hotel-id': hotel['hotel-id'],
                    'hotel-name': hotel['hotel-name'],
                    city: hotel.city,
                    'available-rooms': totalAvailableRooms,
                    nightlyRates: nightlyRates
                });
            }
        }

        res.json(filteredHotels);
    });
});

app.post('/stays/bookHotel', (req, res) => {
    const hotelBooking = req.body;

    // storing all booking information in an XML file
    const builder = new xml2js.Builder({ rootName: 'Booking', xmldec: { version: '1.0', encoding: 'UTF-8' } });
    const bookingXml = builder.buildObject(hotelBooking);

    fs.appendFile('hotelData/hotel_bookings.xml', bookingXml + '\n', (err) => {
        if (err) {
            console.error('Error saving booking to XML:', err);
            return res.status(500).json({ message: 'Error saving booking.' });
        }

        // updating available rooms in the available hotels JSON file
        fs.readFile('hotelData/available_hotels.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading hotels data:', err);
                return res.status(500).json({ message: 'Error updating available rooms.' });
            }

            const hotelsData = JSON.parse(data);
            const hotels = hotelsData.hotels;

            // updating available rooms for each date in the booking
            const nightlyRates = hotelBooking.hotel.nightlyRates;
            const numRoomsBooked = hotelBooking.searchDetails.numRooms;
            const hotelId = hotelBooking.hotel['hotel-id'];

            nightlyRates.forEach(rate => {
                const dateStr = rate.date;

                // finding the hotel entry for the date
                const hotelEntry = hotels.find(hotel =>
                    hotel['hotel-id'] === hotelId &&
                    hotel.date === dateStr
                );

                if (hotelEntry) {
                    hotelEntry['available-rooms'] -= numRoomsBooked;
                    if (hotelEntry['available-rooms'] < 0) {
                        hotelEntry['available-rooms'] = 0;
                    }
                }
            });

            // saving the updated hotels data back to the JSON file
            fs.writeFile('hotelData/available_hotels.json', JSON.stringify({ hotels: hotels }, null, 2), (err) => {
                if (err) {
                    console.error('Error writing hotels data:', err);
                    return res.status(500).json({ message: 'Error updating available rooms.' });
                }

                res.json({ message: 'Hotel booked successfully!' });
            });
        });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

app.use(express.static('public'));
