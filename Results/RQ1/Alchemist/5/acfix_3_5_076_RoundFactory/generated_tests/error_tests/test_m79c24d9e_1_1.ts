import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m79c24d9e - updateRoundImplementation sets address(0)", function () {
  it("should revert when calling create after updateRoundImplementation with valid address because mutant sets implementation to zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - it's OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Add owner as program operator
    await instance.connect(owner).updateProgramOperators(owner.address, true);
    
    // Deploy a mock implementation to use as roundImplementation
    const MockRound = await ethers.getContractFactory("RoundImplementation");
    const mockRound = await MockRound.deploy();
    await mockRound.waitForDeployment();
    
    // Call updateRoundImplementation with valid address
    await instance.connect(owner).updateRoundImplementation(mockRound.target);
    
    // Now try to call create - in the mutant, roundImplementation is address(0)
    // so this should revert with "roundImplementation is 0x"
    // In the original, it should succeed
    await expect(
      instance.connect(owner).create(
        ethers.toUtf8Bytes("0x"),
        owner.address
      )
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});