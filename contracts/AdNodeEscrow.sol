// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AdNodeEscrow {
    enum PricingModel {
        CPC,
        CPM,
        HYBRID
    }

    enum CampaignStatus {
        Active,
        Paused,
        Completed
    }

    struct Campaign {
        uint256 id;
        address advertiser;
        string title;
        string description;
        string creativeUrl;
        PricingModel pricingModel;
        uint256 budget;
        uint256 remainingBudget;
        uint256 rate;
        uint256 impressions;
        uint256 clicks;
        CampaignStatus status;
    }

    uint256 public nextCampaignId = 1;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public developerBalances;

    event CampaignCreated(uint256 indexed campaignId, address indexed advertiser, uint256 budget);
    event CampaignFunded(uint256 indexed campaignId, uint256 amount);
    event ImpressionTracked(uint256 indexed campaignId, address indexed developer, uint256 payout);
    event ClickTracked(uint256 indexed campaignId, address indexed developer, uint256 payout);
    event CampaignStatusChanged(uint256 indexed campaignId, CampaignStatus status);
    event PayoutWithdrawn(uint256 indexed campaignId, address indexed developer, uint256 amount);

    modifier onlyAdvertiser(uint256 campaignId) {
        require(campaigns[campaignId].advertiser == msg.sender, "Not campaign advertiser");
        _;
    }

    modifier onlyActive(uint256 campaignId) {
        require(campaigns[campaignId].status == CampaignStatus.Active, "Campaign not active");
        _;
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        string calldata creativeUrl,
        PricingModel pricingModel,
        uint256 rate
    ) external payable returns (uint256 campaignId) {
        require(bytes(title).length > 0, "Title required");
        require(msg.value > 0, "Initial budget required");

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            advertiser: msg.sender,
            title: title,
            description: description,
            creativeUrl: creativeUrl,
            pricingModel: pricingModel,
            budget: msg.value,
            remainingBudget: msg.value,
            rate: rate,
            impressions: 0,
            clicks: 0,
            status: CampaignStatus.Active
        });

        emit CampaignCreated(campaignId, msg.sender, msg.value);
    }

    function fundCampaign(uint256 campaignId) external payable onlyAdvertiser(campaignId) {
        require(msg.value > 0, "Funding required");
        Campaign storage campaign = campaigns[campaignId];
        campaign.budget += msg.value;
        campaign.remainingBudget += msg.value;
        emit CampaignFunded(campaignId, msg.value);
    }

    function trackImpression(uint256 campaignId, address developer) external onlyActive(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        uint256 payout = _calculateImpressionPayout(campaign);
        _reservePayout(campaign, campaignId, developer, payout);
        campaign.impressions += 1;
        emit ImpressionTracked(campaignId, developer, payout);
    }

    function trackClick(uint256 campaignId, address developer) external onlyActive(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        uint256 payout = _calculateClickPayout(campaign);
        _reservePayout(campaign, campaignId, developer, payout);
        campaign.clicks += 1;
        emit ClickTracked(campaignId, developer, payout);
    }

    function setCampaignStatus(uint256 campaignId, CampaignStatus status) external onlyAdvertiser(campaignId) {
        campaigns[campaignId].status = status;
        emit CampaignStatusChanged(campaignId, status);
    }

    function withdrawPayout(uint256 campaignId) external {
        uint256 amount = developerBalances[campaignId][msg.sender];
        require(amount > 0, "No payout available");
        developerBalances[campaignId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit PayoutWithdrawn(campaignId, msg.sender, amount);
    }

    function _reservePayout(Campaign storage campaign, uint256 campaignId, address developer, uint256 payout) internal {
        require(developer != address(0), "Developer required");
        require(campaign.remainingBudget >= payout, "Insufficient campaign escrow");
        campaign.remainingBudget -= payout;
        developerBalances[campaignId][developer] += payout;
    }

    function _calculateImpressionPayout(Campaign storage campaign) internal view returns (uint256) {
        if (campaign.pricingModel == PricingModel.CPM) return campaign.rate / 1000;
        if (campaign.pricingModel == PricingModel.HYBRID) return campaign.rate / 2000;
        return 0;
    }

    function _calculateClickPayout(Campaign storage campaign) internal view returns (uint256) {
        if (campaign.pricingModel == PricingModel.CPM) return 0;
        if (campaign.pricingModel == PricingModel.HYBRID) return campaign.rate / 2;
        return campaign.rate;
    }
}
