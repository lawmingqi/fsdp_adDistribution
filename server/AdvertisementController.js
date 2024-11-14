const Advertisement = require('./Advertisement');
const {retrieveStreamInfo} = require('./manageStreams');
const retrieveAllAdvertisments = async(req,res) => {
    try{
        const advertisements = await Advertisement.retireveAllAds();
        if(advertisements.Items.length == 0){
            return res.status(404).send(advertisements.Items);
        }
        return res.status(200).send(advertisements.Items); 
    }
    
    catch(err){
        return res.status(500).send("Internal Server Error");
    }
}

const pushTvAdvertisement = async(req,res) => {
    try {
        const {tvID, adID} = req.body;
        const addTvToAds = await Advertisement.addTv(tvID,adID);
        if(addTvToAds.Attributes == null){
            return res.status(404).send("AdID and tvID specified does not exists");
        }
        retrieveStreamInfo('Advertisement');
        return res.status(200).json({"message" : "Sucessfully added tvIDs to the advertisment table", updatedAttributes:addTvToAds.Attributes});
        

    }
    
    catch(err){
        console.error(err)
        return res.status(500).send("Internal Server Error");
    }
}

const deleteAd = async(req,res) => {
    try{
        const adID = req.params.adID;
        const deleteAd = await Advertisement.deleteAd(adID);
        console.log(deleteAd);
        if(deleteAd.$metadata.httpStatusCode != 200){
            return res.status(404).send("AdID specified does not exists");
        }
        return res.status(200).json({"message" : "Sucessfully deleted ad", updatedAttributes:deleteAd.Attributes});
    }

    catch(err){
        console.error(err)
        return res.status(500).send("Internal Server Error");
    }
}

const createAd = async(req, res) => {
    try{
        const {adID,adTitle,adContent,adType,uploadDate,assignedTvs} = req.body;
        const advertisement = new Advertisement(adID,adTitle,adContent,adType,uploadDate,assignedTvs)
        const createdAd = await Advertisement.createAd(advertisement);
        if(createdAd == null){
            return res.status(404).send("AdID specified already exists");
        }
        return res.status(200).json({"message" : "Sucessfully created ad", updatedAttributes:advertisement.Attributes});
    }

    catch(err){
        console.error(err)
        return res.status(500).send("Internal Server Error");
    }
}

const addTv = async(req,res) => {
    try {
        const {tvID, adID} = req.body;
        const addTvToAds = await Advertisement.addTv(tvID, adID);
        if (addTvToAds.$metadata.httpStatusCode != 200){
            return res.status(404).send("AdID and tvID specified does not exists");
        }
        return res.status(200).json({"message" : "Sucessfully added tvIDs to the advertisment table", updatedAttributes:addTvToAds.Attributes});

    }
    
    catch (error){
        console.error(err)
        return res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    retrieveAllAdvertisments,
    pushTvAdvertisement,
    deleteAd,
    createAd,
    addTv
}