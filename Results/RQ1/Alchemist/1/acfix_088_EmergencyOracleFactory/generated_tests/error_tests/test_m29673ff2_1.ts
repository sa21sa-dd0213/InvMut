import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m29673ff2", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory with owner as jojoTeam
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set jojoTeam address to owner
    // Note: The contract has a jojoTeam address variable but no setter in the provided code
    // We need to check the constructor - looking at the contract, there is no constructor
    // The jojoTeam variable defaults to address(0)
    // So we need to set it via storage or deploy with a different approach
    // Since we can't modify storage easily, let's deploy with a custom setup
    // Actually, looking at the contract again, there's no constructor, so jojoTeam = address(0)
    // We need to set jojoTeam to owner first using the contract's logic
    // But there's no setter function... Let's re-examine
    
    // Actually, the contract doesn't have a way to set jojoTeam externally
    // So we'll test that anyone can call it since jojoTeam is address(0)
    // The modifier requires msg.sender == jojoTeam which is address(0)
    // So only address(0) can call it in the original
    
    // For the mutant, the modifier is removed, so any address can call it
    
    // Test with addr1 (non-jojoTeam address)
    await expect(
      factory.connect(addr1).newEmergencyOracle("test oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
    
    // If the mutant doesn't revert, this test will fail
    // If the original reverts, this test passes
  });
});