import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m48b51aec - hasQuorum operator replacement", function () {
  it("should detect mutant where / is replaced with + in hasQuorum", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock VADER and VAULT contracts since DAO depends on them
    const MockVADER = await ethers.getContractFactory("iVADER");
    const MockVAULT = await ethers.getContractFactory("iVAULT");
    
    const vader = await MockVADER.deploy();
    const vault = await MockVAULT.deploy();
    
    await vader.waitForDeployment();
    await vault.waitForDeployment();
    
    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Initialize DAO with VADER, USDV (use zero address as placeholder), and VAULT
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await vault.getAddress());
    
    // Setup: create a proposal to test hasQuorum
    await dao.newAddressProposal(addr1.address, "DAO");
    
    // Get totalWeight from vault - we need to simulate it
    // Since we're using a mock, we can set totalWeight to a known value
    // For the test, we need totalWeight such that:
    // Original: votes > totalWeight / 3
    // Mutant: votes > totalWeight + 3
    
    // Let's use totalWeight = 100, votes = 34
    // Original: 34 > 100/3 = 33.33 -> true (quorum achieved)
    // Mutant: 34 > 100 + 3 = 103 -> false (quorum NOT achieved)
    
    // We need to manipulate vault's totalWeight to return 100
    // and set member weight for addr1 to 34
    
    // Since we can't directly modify vault state, we'll need to use a different approach
    // Let's deploy a custom vault that returns controlled values
    
    const ControlledVAULT = await ethers.getContractFactory("ControlledVAULT");
    const controlledVault = await ControlledVAULT.deploy();
    await controlledVault.waitForDeployment();
    
    // Re-deploy DAO with controlled vault
    const dao2 = await DAOFactory.deploy();
    await dao2.waitForDeployment();
    await dao2.init(await vader.getAddress(), ethers.ZeroAddress, await controlledVault.getAddress());
    
    // Set controlled values
    await controlledVault.setTotalWeight(100);
    await controlledVault.setMemberWeight(addr1.address, 34);
    
    // Create a proposal
    await dao2.newAddressProposal(addr1.address, "DAO");
    
    // Now vote on proposal 1 as addr1 (weight = 34)
    await dao2.connect(addr1).voteProposal(1);
    
    // Check hasQuorum - original would return true, mutant would return false
    const hasQuorumResult = await dao2.hasQuorum(1);
    
    // The mutant would return false here because 34 > 103 is false
    // Original returns true because 34 > 33.33 is true
    // This test will fail on the mutant, killing it
    expect(hasQuorumResult).to.equal(true);
  });
});

// Helper contract to control vault behavior
// Note: In real testing, you'd deploy this separately
// This is just for illustration - in practice you'd need to deploy it
contract ControlledVAULT {
    uint private _totalWeight;
    mapping(address => uint) private _memberWeights;
    
    function setTotalWeight(uint weight) external {
        _totalWeight = weight;
    }
    
    function setMemberWeight(address member, uint weight) external {
        _memberWeights[member] = weight;
    }
    
    function totalWeight() external view returns (uint) {
        return _totalWeight;
    }
    
    function getMemberWeight(address member) external view returns (uint) {
        return _memberWeights[member];
    }
    
    function grant(address, uint) external {}
    function reserveUSDV() external view returns (uint) { return 0; }
    function reserveVADER() external view returns (uint) { return 0; }
}