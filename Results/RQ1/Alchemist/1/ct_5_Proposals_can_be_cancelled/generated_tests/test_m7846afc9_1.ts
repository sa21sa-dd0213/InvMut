import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - cancelProposal minority check", function () {
  it("should revert when cancelProposal is called with a new proposal that has no minority support", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER and VAULT contracts for testing
    const VADERFactory = await ethers.getContractFactory("MockVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();
    
    const VAULTFactory = await ethers.getContractFactory("MockVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with mock addresses
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await vault.getAddress());
    
    // Create old proposal (finalising)
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");
    const oldProposalId = 1;
    
    // Vote on old proposal to meet quorum and make it finalising
    // Mock VAULT returns totalWeight = 100, so we need >33 for quorum
    // Set member weight for addr1 to 50
    await vault.setMemberWeight(addr1.address, 50);
    await vault.setTotalWeight(100);
    
    await dao.connect(addr1).voteProposal(oldProposalId);
    
    // Create new proposal (with very low support - no minority)
    await dao.connect(addr2).newAddressProposal(addr2.address, "DAO");
    const newProposalId = 2;
    
    // Set very low weight for addr2 (e.g., 1, which is less than 100/6 ≈ 16.67)
    await vault.setMemberWeight(addr2.address, 1);
    
    // Vote on new proposal but with insufficient weight for minority
    await dao.connect(addr2).voteProposal(newProposalId);
    
    // Attempt to cancel - should revert on original but pass on mutant
    await expect(
      dao.connect(addr1).cancelProposal(oldProposalId, newProposalId)
    ).to.be.revertedWith("Must have minority");
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
    mapping(address => uint) public memberWeights;
    uint public totalWeightValue;
    
    function setMemberWeight(address member, uint weight) external {
        memberWeights[member] = weight;
    }
    
    function setTotalWeight(uint weight) external {
        totalWeightValue = weight;
    }
    
    function totalWeight() external view returns (uint) {
        return totalWeightValue;
    }
    
    function getMemberWeight(address member) external view returns (uint) {
        return memberWeights[member];
    }
    
    function reserveUSDV() external view returns (uint) { return 0; }
    function reserveVADER() external view returns (uint) { return 0; }
    function setParams(uint, uint, uint) external {}
    function grant(address, uint) external {}
    function deposit(address, uint) external {}
    function depositForMember(address, address, uint) external {}
    function harvest(address) external returns (uint) { return 0; }
    function calcCurrentReward(address, address) external view returns (uint) { return 0; }
    function calcReward(address, address) external view returns (uint) { return 0; }
    function withdraw(address, uint) external returns (uint) { return 0; }
    function getMemberDeposit(address, address) external view returns (uint) { return 0; }
    function getMemberLastTime(address, address) external view returns (uint) { return 0; }
}