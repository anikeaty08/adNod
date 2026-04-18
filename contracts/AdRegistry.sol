// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AdRegistry
/// @notice Fhenix CoFHE-aligned registry: confidential campaign economics on-chain (`euint64` budget, `euint32` CPC via `FHE.sol`),
///         plus **public settlement terms** (`settlementPricingModel`, `settlementRateWei`) so payouts are bound to hoster-declared
///         CPC/CPM rules. Creative media stays off-chain (typically IPFS); the chain stores a URI and enforces funding + settlement.
/// @dev CoFHE (per Fhenix docs) couples on-chain contracts with off-chain FHE execution, permits, and threshold decryption — this contract
///      uses encrypted handles for budget/CPC while keeping measurement/settlement amounts in plaintext wei for `reserveDeveloperPayout`.

import {FHE, euint32, euint64, InEuint32, InEuint64} from "@fhenixprotocol/cofhe-contracts/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAdNodePayoutWrapper {
    function shieldNative(address to) external payable returns (euint64);
}

contract AdRegistry is Ownable, ReentrancyGuard {
    /// @notice On-chain settlement pricing. Encrypted budget/cpc are for confidentiality; these terms bind payout amounts.
    /// @dev 0 = legacy / not enforced (pre-upgrade campaigns only). 1 = CPC (wei per click). 2 = CPM (wei per 1000-impression billing unit).
    uint8 public constant SETTLEMENT_NONE = 0;
    uint8 public constant SETTLEMENT_CPC = 1;
    uint8 public constant SETTLEMENT_CPM = 2;
    /// @dev Max CPM thousand-blocks per single settlement tx (prevents oversized reserve in one call).
    uint256 public constant MAX_CPM_UNITS_PER_SETTLEMENT = 10_000;

    struct Campaign {
        address hoster;
        string creativeURI;
        string category;
        euint64 budget;
        euint32 cpc;
        bool active;
        uint256 availableFunds;
        uint256 totalFunded;
        uint256 totalSettled;
        uint8 settlementPricingModel;
        uint256 settlementRateWei;
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
    mapping(address => uint256) public claimableEarnings;
    mapping(address => mapping(address => bool)) private payoutOperators;
    mapping(address => address) private payoutRecipients;
    mapping(address => bool) public settlementManagers;
    IAdNodePayoutWrapper public immutable payoutWrapper;

    event CampaignCreated(uint256 indexed id, address indexed hoster, string creativeURI, string category, uint256 initialFunding);
    event CampaignFunded(uint256 indexed id, address indexed funder, uint256 amount, uint256 availableFunds);
    event CampaignFundsWithdrawn(uint256 indexed id, address indexed hoster, uint256 amount, uint256 availableFunds);
    event CampaignStatusUpdated(uint256 indexed id, bool active);
    event SlotRegistered(uint256 indexed id, address indexed developer, string siteName, string category);
    event SlotStatusUpdated(uint256 indexed id, bool active);
    event CampaignAssignedToSlot(uint256 indexed slotId, uint256 indexed campaignId);
    event SettlementManagerUpdated(address indexed account, bool allowed);
    event DeveloperPayoutReserved(uint256 indexed campaignId, uint256 indexed slotId, address indexed developer, uint256 amount);
    event PayoutOperatorUpdated(address indexed developer, address indexed operator, bool approved);
    event PayoutRecipientUpdated(address indexed developer, address indexed recipient);
    event DeveloperEarningsClaimed(address indexed developer, address indexed recipient, address indexed caller, uint256 amount);
    event PayoutWrapperConfigured(address indexed payoutWrapper);

    constructor(address initialOwner, address payoutWrapperAddress) Ownable(initialOwner) {
        require(payoutWrapperAddress != address(0), "Invalid payout wrapper");
        payoutWrapper = IAdNodePayoutWrapper(payoutWrapperAddress);
        emit PayoutWrapperConfigured(payoutWrapperAddress);
    }

    modifier onlySettlementManager() {
        require(settlementManagers[msg.sender] || msg.sender == owner(), "Not settlement manager");
        _;
    }

    function createCampaign(
        string calldata creativeURI,
        string calldata category,
        InEuint64 calldata budget,
        InEuint32 calldata cpc,
        uint8 settlementPricingModel,
        uint256 settlementRateWei
    ) external payable returns (uint256 id) {
        require(
            settlementPricingModel == SETTLEMENT_CPC || settlementPricingModel == SETTLEMENT_CPM,
            "Invalid settlement pricing"
        );
        require(settlementRateWei > 0, "Settlement rate required");

        id = nextCampaignId++;

        euint64 encryptedBudget = FHE.asEuint64(budget);
        euint32 encryptedCpc = FHE.asEuint32(cpc);
        // NOTE: On some CoFHE TaskManager deployments, ACL updates for freshly-verified inputs
        // can revert (empty revert data), even when verifyInput succeeds. Since AdRegistry does
        // not currently operate on these ciphertexts on-chain (they are stored + returned to
        // the hoster via gated getters), we avoid explicit ACL mutations here.
        //
        // If you later add on-chain FHE ops that require the registry to be allowed, you may
        // need to reintroduce allow calls with updated CoFHE semantics.

        campaigns[id] = Campaign({
            hoster: msg.sender,
            creativeURI: creativeURI,
            category: category,
            budget: encryptedBudget,
            cpc: encryptedCpc,
            active: true,
            availableFunds: msg.value,
            totalFunded: msg.value,
            totalSettled: 0,
            settlementPricingModel: settlementPricingModel,
            settlementRateWei: settlementRateWei
        });

        emit CampaignCreated(id, msg.sender, creativeURI, category, msg.value);

        if (msg.value > 0) {
            emit CampaignFunded(id, msg.sender, msg.value, msg.value);
        }
    }

    function fundCampaign(uint256 id) external payable {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        require(msg.value > 0, "Funding must be positive");

        campaign.availableFunds += msg.value;
        campaign.totalFunded += msg.value;

        emit CampaignFunded(id, msg.sender, msg.value, campaign.availableFunds);
    }

    function withdrawUnspentCampaignFunds(uint256 id, uint256 amount) external nonReentrant {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        require(!campaign.active, "Pause campaign first");
        require(amount > 0, "Amount must be positive");
        require(campaign.availableFunds >= amount, "Insufficient available funds");

        campaign.availableFunds -= amount;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit CampaignFundsWithdrawn(id, msg.sender, amount, campaign.availableFunds);
    }

    function getCampaignFunding(uint256 id) external view returns (uint256 availableFunds, uint256 totalFunded, uint256 totalSettled) {
        Campaign storage campaign = campaigns[id];
        return (campaign.availableFunds, campaign.totalFunded, campaign.totalSettled);
    }

    function getPublicInfo(uint256 id) external view returns (string memory creativeURI, string memory category, bool active) {
        Campaign storage campaign = campaigns[id];
        return (campaign.creativeURI, campaign.category, campaign.active);
    }

    /// @notice Public settlement terms used to enforce payout amounts in reserveDeveloperPayout.
    function getSettlementTerms(uint256 id) external view returns (uint8 settlementPricingModel, uint256 settlementRateWei) {
        Campaign storage campaign = campaigns[id];
        return (campaign.settlementPricingModel, campaign.settlementRateWei);
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

    function setSlotActive(uint256 slotId, bool active) external {
        Slot storage slot = slots[slotId];
        require(slot.developer == msg.sender, "Not slot owner");
        slot.active = active;
        emit SlotStatusUpdated(slotId, active);
    }

    function assignCampaignToSlot(uint256 slotId, uint256 campaignId) external {
        Slot storage slot = slots[slotId];
        Campaign storage campaign = campaigns[campaignId];

        require(slot.developer == msg.sender || owner() == msg.sender, "Not allowed");
        require(slot.active, "Slot inactive");
        require(campaign.active, "Campaign inactive");
        require(campaign.hoster != address(0), "Campaign missing");
        require(
            keccak256(bytes(slot.category)) == keccak256(bytes(campaign.category)),
            "Category mismatch"
        );

        slot.assignedCampaignId = campaignId;
        emit CampaignAssignedToSlot(slotId, campaignId);
    }

    function setSettlementManager(address account, bool allowed) external onlyOwner {
        settlementManagers[account] = allowed;
        emit SettlementManagerUpdated(account, allowed);
    }

    function reserveDeveloperPayout(uint256 campaignId, uint256 slotId, uint256 amount) external onlySettlementManager returns (address developer) {
        Campaign storage campaign = campaigns[campaignId];
        Slot storage slot = slots[slotId];

        require(campaign.hoster != address(0), "Campaign missing");
        require(slot.developer != address(0), "Slot missing");
        require(campaign.active, "Campaign inactive");
        require(slot.active, "Slot inactive");
        require(slot.assignedCampaignId == campaignId, "Slot assignment mismatch");
        require(amount > 0, "Amount must be positive");
        require(campaign.availableFunds >= amount, "Insufficient campaign funds");

        if (campaign.settlementRateWei > 0 && campaign.settlementPricingModel != SETTLEMENT_NONE) {
            if (campaign.settlementPricingModel == SETTLEMENT_CPC) {
                require(amount == campaign.settlementRateWei, "CPC payout mismatch");
            } else if (campaign.settlementPricingModel == SETTLEMENT_CPM) {
                require(amount >= campaign.settlementRateWei, "CPM below unit");
                require(amount % campaign.settlementRateWei == 0, "CPM not unit multiple");
                uint256 units = amount / campaign.settlementRateWei;
                require(units >= 1 && units <= MAX_CPM_UNITS_PER_SETTLEMENT, "CPM units OOB");
            }
        }

        developer = slot.developer;
        campaign.availableFunds -= amount;
        campaign.totalSettled += amount;
        claimableEarnings[developer] += amount;

        emit DeveloperPayoutReserved(campaignId, slotId, developer, amount);
    }

    function setPayoutOperator(address operator, bool approved) external {
        require(operator != address(0), "Invalid operator");
        payoutOperators[msg.sender][operator] = approved;
        emit PayoutOperatorUpdated(msg.sender, operator, approved);
    }

    function isPayoutOperator(address developer, address operator) external view returns (bool) {
        return payoutOperators[developer][operator];
    }

    function setPayoutRecipient(address recipient) external {
        require(recipient != address(0), "Invalid recipient");
        payoutRecipients[msg.sender] = recipient;
        emit PayoutRecipientUpdated(msg.sender, recipient);
    }

    function getPayoutRecipient(address developer) external view returns (address) {
        return _resolveRecipient(developer);
    }

    function getPayoutWrapper() external view returns (address) {
        return address(payoutWrapper);
    }

    function claimMyEarnings() external nonReentrant returns (uint256 amount) {
        amount = _claimEarningsFor(msg.sender, msg.sender);
    }

    function claimEarningsFor(address developer) external nonReentrant returns (uint256 amount) {
        require(payoutOperators[developer][msg.sender] || msg.sender == owner(), "Not approved operator");
        amount = _claimEarningsFor(developer, msg.sender);
    }

    function campaignHoster(uint256 id) external view returns (address) {
        return campaigns[id].hoster;
    }

    function slotDeveloper(uint256 slotId) external view returns (address) {
        return slots[slotId].developer;
    }

    function isCampaignActive(uint256 id) external view returns (bool) {
        return campaigns[id].active;
    }

    function setCampaignActive(uint256 id, bool active) external {
        Campaign storage campaign = campaigns[id];
        require(campaign.hoster == msg.sender, "Not campaign owner");
        campaign.active = active;
        emit CampaignStatusUpdated(id, active);
    }

    function _claimEarningsFor(address developer, address caller) internal returns (uint256 amount) {
        amount = claimableEarnings[developer];
        require(amount > 0, "No earnings available");

        claimableEarnings[developer] = 0;

        address recipient = _resolveRecipient(developer);
        payoutWrapper.shieldNative{value: amount}(recipient);

        emit DeveloperEarningsClaimed(developer, recipient, caller, amount);
    }

    function _resolveRecipient(address developer) internal view returns (address recipient) {
        recipient = payoutRecipients[developer];
        if (recipient == address(0)) {
            recipient = developer;
        }
    }
}
