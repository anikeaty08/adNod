// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IAdRegistry {
    function campaignHoster(uint256 id) external view returns (address);
    function isCampaignActive(uint256 id) external view returns (bool);
    function reserveDeveloperPayout(uint256 campaignId, uint256 slotId, uint256 amount, bytes32 settlementId) external returns (address developer);
}

contract AdAnalytics is AccessControl {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant EARNINGS_ROLE = keccak256("EARNINGS_ROLE");

    IAdRegistry public immutable registry;

    mapping(uint256 => euint32) private impressions;
    mapping(uint256 => euint32) private clicks;
    mapping(address => euint64) private earnings;
    mapping(bytes32 => bool) public countedEvents;

    event ImpressionRecorded(uint256 indexed campaignId, bytes32 indexed eventId, address indexed reporter);
    event ClickRecorded(uint256 indexed campaignId, bytes32 indexed eventId, address indexed reporter);
    event DeveloperEarningsCredited(uint256 indexed campaignId, uint256 indexed slotId, bytes32 indexed settlementId, address developer, uint256 payoutAmountWei);

    constructor(address registryAddress, address initialAdmin) {
        registry = IAdRegistry(registryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    function recordImpression(uint256 campaignId, bytes32 eventId) external onlyRole(REPORTER_ROLE) {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        require(eventId != bytes32(0), "Invalid event id");
        require(!countedEvents[eventId], "Event already counted");
        countedEvents[eventId] = true;

        euint32 nextValue = FHE.add(impressions[campaignId], FHE.asEuint32(1));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, registry.campaignHoster(campaignId));
        impressions[campaignId] = nextValue;

        emit ImpressionRecorded(campaignId, eventId, msg.sender);
    }

    function recordClick(uint256 campaignId, bytes32 eventId) external onlyRole(REPORTER_ROLE) {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        require(eventId != bytes32(0), "Invalid event id");
        require(!countedEvents[eventId], "Event already counted");
        countedEvents[eventId] = true;

        euint32 nextValue = FHE.add(clicks[campaignId], FHE.asEuint32(1));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, registry.campaignHoster(campaignId));
        clicks[campaignId] = nextValue;

        emit ClickRecorded(campaignId, eventId, msg.sender);
    }

    function getMyStats(uint256 campaignId) external view returns (euint32 encryptedImpressions, euint32 encryptedClicks) {
        require(registry.campaignHoster(campaignId) == msg.sender, "Not campaign owner");
        return (impressions[campaignId], clicks[campaignId]);
    }

    function creditDeveloperEarnings(
        uint256 campaignId,
        uint256 slotId,
        uint256 payoutAmountWei,
        bytes32 settlementId,
        InEuint64 calldata amount
    ) external onlyRole(EARNINGS_ROLE) {
        require(registry.isCampaignActive(campaignId), "Campaign inactive");
        require(payoutAmountWei > 0, "Amount must be positive");
        require(settlementId != bytes32(0), "Invalid settlement id");

        address developer = registry.reserveDeveloperPayout(campaignId, slotId, payoutAmountWei, settlementId);
        euint64 nextValue = FHE.add(earnings[developer], FHE.asEuint64(amount));
        FHE.allowThis(nextValue);
        FHE.allow(nextValue, developer);
        earnings[developer] = nextValue;

        emit DeveloperEarningsCredited(campaignId, slotId, settlementId, developer, payoutAmountWei);
    }

    function getMyEarnings() external view returns (euint64 encryptedEarnings) {
        return earnings[msg.sender];
    }
}
