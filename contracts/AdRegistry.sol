// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, inEuint32, inEuint64} from "@fhenixprotocol/contracts/FHE.sol";
import {Permission, Permissioned} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AdRegistry is Permissioned, Ownable {
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
        inEuint64 calldata budget,
        inEuint32 calldata cpc
    ) external returns (uint256 id) {
        id = nextCampaignId++;

        campaigns[id] = Campaign({
            hoster: msg.sender,
            creativeURI: creativeURI,
            category: category,
            budget: FHE.asEuint64(budget),
            cpc: FHE.asEuint32(cpc),
            active: true
        });

        emit CampaignCreated(id, msg.sender, creativeURI, category);
    }

    function getPublicInfo(uint256 id) external view returns (string memory creativeURI, string memory category, bool active) {
        Campaign storage campaign = campaigns[id];
        return (campaign.creativeURI, campaign.category, campaign.active);
    }

    function getMyBudget(uint256 id, Permission memory permission)
        external
        view
        onlyPermitted(permission, campaigns[id].hoster)
        returns (string memory encryptedBudget)
    {
        return campaigns[id].budget.seal(permission.publicKey);
    }

    function getMyCpc(uint256 id, Permission memory permission)
        external
        view
        onlyPermitted(permission, campaigns[id].hoster)
        returns (string memory encryptedCpc)
    {
        return campaigns[id].cpc.seal(permission.publicKey);
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
}
