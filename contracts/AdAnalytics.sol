// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, inEuint64} from "@fhenixprotocol/contracts/FHE.sol";
import {Permission, Permissioned} from "@fhenixprotocol/contracts/access/Permissioned.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAdRegistry {
    function campaignHoster(uint256 id) external view returns (address);
    function isCampaignActive(uint256 id) external view returns (bool);
}

contract AdAnalytics is Permissioned, Ownable {
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
        impressions[campaignId] = impressions[campaignId].add(FHE.asEuint32(1));
        emit ImpressionRecorded(campaignId);
    }

    function recordClick(uint256 campaignId) external onlyOwner {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        clicks[campaignId] = clicks[campaignId].add(FHE.asEuint32(1));
        emit ClickRecorded(campaignId);
    }

    function getMyStats(uint256 campaignId, Permission memory permission)
        external
        view
        onlyPermitted(permission, registry.campaignHoster(campaignId))
        returns (string memory encryptedImpressions, string memory encryptedClicks)
    {
        return (
            impressions[campaignId].seal(permission.publicKey),
            clicks[campaignId].seal(permission.publicKey)
        );
    }

    function addEarnings(address developer, inEuint64 calldata amount) external onlyOwner {
        earnings[developer] = earnings[developer].add(FHE.asEuint64(amount));
        emit EarningsAdded(developer);
    }

    function getMyEarnings(Permission memory permission)
        external
        view
        onlySender(permission)
        returns (string memory encryptedEarnings)
    {
        return earnings[msg.sender].seal(permission.publicKey);
    }
}
