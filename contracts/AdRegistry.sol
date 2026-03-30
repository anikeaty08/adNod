// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, InEuint32, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AdRegistry is Ownable {
    struct Campaign {
        address hoster;
        string creativeURI;
        string category;
        euint64 budget;
        euint32 cpc;
        bool active;
    }

    struct Slot {
        address developer;
        string siteName;
        string category;
        bool active;
        uint256 assignedCampaignId;
    }

    uint256 public nextCampaignId = 1;
    uint256 public nextSlotId = 1;

    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => Slot) public slots;

    event CampaignCreated(uint256 indexed id, address indexed hoster, string creativeURI, string category);
    event SlotRegistered(uint256 indexed id, address indexed developer, string siteName, string category);
    event CampaignAssignedToSlot(uint256 indexed slotId, uint256 indexed campaignId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createCampaign(
        string calldata creativeURI,
        string calldata category,
        InEuint64 calldata budget,
        InEuint32 calldata cpc
    ) external returns (uint256 id) {
        id = nextCampaignId++;

        euint64 encryptedBudget = FHE.asEuint64(budget);
        euint32 encryptedCpc = FHE.asEuint32(cpc);
        FHE.allowThis(encryptedBudget);
        FHE.allow(encryptedBudget, msg.sender);
        FHE.allowThis(encryptedCpc);
        FHE.allow(encryptedCpc, msg.sender);

        campaigns[id] = Campaign({
            hoster: msg.sender,
            creativeURI: creativeURI,
            category: category,
            budget: encryptedBudget,
            cpc: encryptedCpc,
            active: true
        });

        emit CampaignCreated(id, msg.sender, creativeURI, category);
    }

    function getPublicInfo(uint256 id) external view returns (string memory creativeURI, string memory category, bool active) {
        Campaign storage campaign = campaigns[id];
        return (campaign.creativeURI, campaign.category, campaign.active);
    }

    function getMyBudget(uint256 id) external view returns (euint64 encryptedBudget) {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        return campaign.budget;
    }

    function getMyCpc(uint256 id) external view returns (euint32 encryptedCpc) {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        return campaign.cpc;
    }

    function registerSlot(string calldata siteName, string calldata category) external returns (uint256 id) {
        id = nextSlotId++;

        slots[id] = Slot({
            developer: msg.sender,
            siteName: siteName,
            category: category,
            active: true,
            assignedCampaignId: 0
        });

        emit SlotRegistered(id, msg.sender, siteName, category);
    }

    function assignCampaignToSlot(uint256 slotId, uint256 campaignId) external {
        Slot storage slot = slots[slotId];
        Campaign storage campaign = campaigns[campaignId];

        require(slot.developer == msg.sender || owner() == msg.sender, "Not allowed");
        require(slot.active, "Slot inactive");
        require(campaign.active, "Campaign inactive");

        slot.assignedCampaignId = campaignId;
        emit CampaignAssignedToSlot(slotId, campaignId);
    }

    function campaignHoster(uint256 id) external view returns (address) {
        return campaigns[id].hoster;
    }

    function isCampaignActive(uint256 id) external view returns (bool) {
        return campaigns[id].active;
    }

    function setCampaignActive(uint256 id, bool active) external {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        campaign.active = active;
    }
}
