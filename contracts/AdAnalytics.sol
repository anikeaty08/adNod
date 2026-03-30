// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAdRegistry {
    function campaignHoster(uint256 id) external view returns (address);
    function isCampaignActive(uint256 id) external view returns (bool);
}

contract AdAnalytics is Ownable {
    IAdRegistry public immutable registry;

    mapping(uint256 => euint32) private impressions;
    mapping(uint256 => euint32) private clicks;
    mapping(address => euint64) private earnings;

    event ImpressionRecorded(uint256 indexed campaignId);
    event ClickRecorded(uint256 indexed campaignId);
    event EarningsAdded(address indexed developer);

    constructor(address registryAddress, address initialOwner) Ownable(initialOwner) {
        registry = IAdRegistry(registryAddress);
    }

    function recordImpression(uint256 campaignId) external onlyOwner {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        euint32 nextValue = FHE.add(impressions[campaignId], FHE.asEuint32(1));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, registry.campaignHoster(campaignId));
        impressions[campaignId] = nextValue;
        emit ImpressionRecorded(campaignId);
    }

    function recordClick(uint256 campaignId) external onlyOwner {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        euint32 nextValue = FHE.add(clicks[campaignId], FHE.asEuint32(1));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, registry.campaignHoster(campaignId));
        clicks[campaignId] = nextValue;
        emit ClickRecorded(campaignId);
    }

    function getMyStats(uint256 campaignId) external view returns (euint32 encryptedImpressions, euint32 encryptedClicks) {
        require(registry.campaignHoster(campaignId) == msg.sender, "Not campaign owner");
        return (impressions[campaignId], clicks[campaignId]);
    }

    function addEarnings(address developer, InEuint64 calldata amount) external onlyOwner {
        euint64 nextValue = FHE.add(earnings[developer], FHE.asEuint64(amount));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, developer);
        earnings[developer] = nextValue;
        emit EarningsAdded(developer);
    }

    function getMyEarnings() external view returns (euint64 encryptedEarnings) {
        return earnings[msg.sender];
    }
}
