import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m5c923d32 - hasMajority replacement", function () {
  it("should detect mutant by testing hasMajority with votes equal to half total weight plus one", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the DAO contract
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Deploy mock VADER contract
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    // Deploy mock VAULT contract
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), ethers.ZeroAddress, await mockVAULT.getAddress());

    // Create a proposal (any type works for testing hasMajority)
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");

    // Set up mock VAULT to return totalWeight = 100
    await mockVAULT.setTotalWeight(100);

    // Set member weight for addr1 to 51 (more than half of 100)
    await mockVAULT.setMemberWeight(addr1.address, 51);

    // Vote on proposal 1
    await dao.connect(addr1).voteProposal(1);

    // In original: consensus = 100/2 = 50, votes = 51 > 50 => true
    // In mutant: consensus = 100 - 2 = 98, votes = 51 > 98 => false
    // Test should pass on original but fail on mutant
    expect(await dao.hasMajority(1)).to.equal(true);
  });
});

// Mock contracts needed for testing
contract MockVADER {
    function UTILS() external view returns (address) { return address(0); }
    function DAO() external view returns (address) { return address(0); }
    function emitting() external view returns (bool) { return false; }
    function minting() external view returns (bool) { return false; }
    function secondsPerEra() external view returns (uint) { return 0; }
    function flipEmissions() external {}
    function flipMinting() external {}
    function setParams(uint, uint) external {}
    function setRewardAddress(address) external {}
    function changeUTILS(address) external {}
    function changeDAO(address) external {}
    function purgeDAO() external {}
    function upgrade(uint) external {}
    function redeem() external returns (uint) { return 0; }
    function redeemToMember(address) external returns (uint) { return 0; }
}

contract MockVAULT {
    uint256 private _totalWeight;
    mapping(address => uint256) private _memberWeights;

    function setTotalWeight(uint256 weight) external { _totalWeight = weight; }
    function setMemberWeight(address member, uint256 weight) external { _memberWeights[member] = weight; }

    function totalWeight() external view returns (uint256) { return _totalWeight; }
    function getMemberWeight(address member) external view returns (uint256) { return _memberWeights[member]; }

    // Other required interface functions (minimal implementations)
    function setParams(uint, uint, uint) external {}
    function grant(address, uint) external {}
    function deposit(address, uint) external {}
    function depositForMember(address, address, uint) external {}
    function harvest(address) external returns (uint) { return 0; }
    function calcCurrentReward(address, address) external view returns (uint) { return 0; }
    function calcReward(address, address) external view returns (uint) { return 0; }
    function withdraw(address, uint) external returns (uint) { return 0; }
    function reserveUSDV() external view returns (uint) { return 0; }
    function reserveVADER() external view returns (uint) { return 0; }
    function getMemberDeposit(address, address) external view returns (uint) { return 0; }
    function getMemberLastTime(address, address) external view returns (uint) { return 0; }
}