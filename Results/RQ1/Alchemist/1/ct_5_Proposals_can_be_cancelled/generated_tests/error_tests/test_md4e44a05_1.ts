import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - hasMajority operator replacement", function () {
  it("should kill mutant md4e44a05 by verifying majority-based proposal finalisation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER contract
    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();
    
    // Deploy mock VAULT contract
    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();
    
    // Deploy mock USDV contract
    const MockUSDV = await ethers.getContractFactory("MockUSDV");
    const mockUSDV = await MockUSDV.deploy();
    await mockUSDV.waitForDeployment();
    
    // Deploy DAO contract
    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());
    
    // Setup: Give addr1 significant voting weight (> 50% of total)
    const totalWeight = ethers.parseEther("1000");
    const addr1Weight = ethers.parseEther("600"); // 60% > 50% majority
    
    await mockVAULT.setTotalWeight(totalWeight);
    await mockVAULT.setMemberWeight(addr1.address, addr1Weight);
    
    // Create a DAO-type proposal (requires majority)
    await dao.connect(addr1).newAddressProposal(addr2.address, "DAO");
    
    // Vote on proposal ID 1
    await dao.connect(addr1).voteProposal(1);
    
    // Check that the proposal is NOT finalising (mutant makes majority impossible)
    // In original: votes(600) > consensus(500) => finalising = true
    // In mutant: votes(600) > consensus(1002) => finalising = false
    const isFinalising = await dao.mapPID_finalising(1);
    expect(isFinalising).to.equal(false, "Mutant should fail: proposal should NOT be finalising because mutant makes majority condition impossible");
    
    // Additional verification: check that votes are still recorded correctly
    const proposalVotes = await dao.mapPID_votes(1);
    expect(proposalVotes).to.equal(addr1Weight, "Votes should be recorded correctly");
  });
});

// Helper mock contracts
contract MockVADER {
    function changeUTILS(address) external {}
    function setRewardAddress(address) external {}
}

contract MockVAULT {
    uint256 public totalWeight;
    mapping(address => uint256) public memberWeight;
    
    function setTotalWeight(uint256 _weight) external {
        totalWeight = _weight;
    }
    
    function setMemberWeight(address member, uint256 weight) external {
        memberWeight[member] = weight;
    }
    
    function getMemberWeight(address member) external view returns (uint256) {
        return memberWeight[member];
    }
    
    function totalWeight() external view returns (uint256) {
        return totalWeight;
    }
}

contract MockUSDV {
    function balanceOf(address) external pure returns (uint256) {
        return ethers.parseEther("100000");
    }
}