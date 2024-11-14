const Advertisement = require('./Advertisement');
const retrieveStream = require('./getStreamArn');
const {sendUsersConnected} = require('./WebsocketClient')
let dbStreams = require('./DyanmoStreamsHandler');
const DyanmoStreamsHandler = require('./DyanmoStreamsHandler');
const retrieveAllAdvertisements = async (req, res) => {
    try {
        const advertisements = await Advertisement.retireveAllAds();
        if (advertisements.Items.length === 0) {
            return res.status(404).send(advertisements.Items);
        }
        return res.status(200).send(advertisements.Items);
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
};

const pushTvAdvertisement = async (req, res) => {
    try {
        const adID = req.params.adID;
        const adRecord = await Advertisement.retireveAd(adID);

        console.log(adRecord.assignedTvs);
        // Now i send to connected clients in websocket;
        sendUsersConnected(adRecord.assignedTvs,adRecord);
        

        if(!adRecord == null){
            return res.status(404).send("Ad not found");
        }
        else {
            return res.status(200).send(adRecord);
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
};

const deleteAd = async (req, res) => {
    try {
        const adID = req.params.adID;
        const deleteAd = await Advertisement.deleteAd(adID);
        if (deleteAd.$metadata.httpStatusCode !== 200) {
            return res.status(404).send("AdID specified does not exist");
        }
        return res.status(200).json({ "message": "Successfully deleted ad", updatedAttributes: deleteAd.Attributes });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
};

const createAd = async (req, res) => {
    try {
        const { adID, adTitle, adContent, adType, uploadDate, assignedTvs } = req.body;
        const advertisement = new Advertisement(adID, adTitle, adContent, adType, uploadDate, assignedTvs);
        const createdAd = await Advertisement.createAd(advertisement);
        if (createdAd == null) {
            return res.status(404).send("AdID specified already exists");
        }
        return res.status(200).json({ "message": "Successfully created ad", updatedAttributes: advertisement.Attributes });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
};

const addTv = async (req, res) => {
    try {
        const { tvIDList, adID } = req.body;

        // Check if tviDList and adID are provided
        if (!tvIDList || !adID) {
            return res.status(400).send("tvIDList and adID are required");
        }

        // Promise.all basically creates an array of promises and then you will process them in paralle (synchronus)
        const results = await Promise.all(tvIDList.map(async (tv) => {
            const tvID = tv;
            const addTvToAds = await Advertisement.addTv(tvID, adID);
            if (addTvToAds.$metadata.httpStatusCode !== 200) {
                throw new Error("AdID and tvID specified do not exist");
            }
            return addTvToAds.Attributes;
        }));

        return res.status(200).json({
            message: "Successfully added tvIDs to the advertisement table",
            updatedAttributes: results
        });

    } catch (err) {
        console.error(err);
        if (err.message === "AdID and tvID specified do not exist") {
            return res.status(404).send(err.message);
        }
        return res.status(500).send("Internal Server Error");
    }
};


module.exports = {
    retrieveAllAdvertisements,
    pushTvAdvertisement,
    deleteAd,
    createAd,
    addTv
};
