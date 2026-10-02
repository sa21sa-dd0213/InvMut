import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DAO mutant test for hasMinority always returning false", function () {
  it("should revert on cancelProposal when hasMinority returns false due to mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock vault contract that returns a fixed totalWeight
    const MockVaultFactory = await ethers.getContractFactory("MockVAULT");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy DAO with mock addresses
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(
      ethers.ZeroAddress, // VADER
      ethers.ZeroAddress, // USDV
      await mockVault.getAddress() // VAULT
    );
    
    // Set totalWeight in mock vault to a known value (e.g., 1000)
    await mockVault.setTotalWeight(1000);
    
    // Create a new proposal that will have minority support (> 1/6 of totalWeight = > 166.67)
    // We'll use newAddressProposal to create a proposal
    const proposalType = "UTILS";
    await dao.connect(addr1).newAddressProposal(addr2.address, proposalType);
    const newProposalId = 2; // Since proposalCount starts at 1 after init
    
    // Create an old proposal and make it finalising
    await dao.connect(addr1).newAddressProposal(addr2.address, proposalType);
    const oldProposalId = 3;
    
    // Vote on old proposal to trigger finalising (hasQuorum = > 333.33, we need > 333.33)
    // Set addr1's member weight in mock vault to 500 (> 1/3 of 1000 = 333.33)
    await mockVault.setMemberWeight(addr1.address, 500);
    
    // Vote on old proposal - this should trigger finalising since hasQuorum is true (> 333.33)
    await dao.connect(addr1).voteProposal(oldProposalId);
    
    // Now set addr1's weight for the new proposal to have minority (> 1/6 of 1000 = 166.67)
    await mockVault.setMemberWeight(addr1.address, 200); // 200 > 166.67, so minority should be true
    
    // Vote on new proposal to give it minority votes
    await dao.connect(addr1).voteProposal(newProposalId);
    
    // Attempt to cancel old proposal using new proposal
    // In original: should succeed because hasMinority(newProposalId) returns true (200 > 166.67)
    // In mutant: should revert because hasMinority always returns false
    await expect(
      dao.connect(addr1).cancelProposal(oldProposalId, newProposalId)
    ).to.be.revertedWith("Must have minority");
  });
});

// Helper contract to mock VAULT interface
// This would be deployed as a separate contract in the test setup
// For completeness, here's the mock contract code that would be compiled alongside:
/*
contract MockVAULT {
    uint public totalWeight;
    mapping(address => uint) public memberWeights;
    
    function setTotalWeight(uint _weight) external {
        totalWeight = _weight;
    }
    
    function setMemberWeight(address member, uint weight) external {
        memberWeights[member] = weight;
    }
    
    function getMemberWeight(address member) external view returns (uint) {
        return memberWeights[member];
    }
    
    function totalWeight() external view returns (uint) {
        return totalWeight;
    }
    
    function reserveUSDV() external pure returns (uint) { return 0; }
    function reserveVADER() external pure returns (uint) { return 0; }
    function getMemberDeposit(address, address) external pure returns (uint) { return 0; }
    function getMemberLastTime(address, address) external pure returns (uint) { return 0; }
}
*/