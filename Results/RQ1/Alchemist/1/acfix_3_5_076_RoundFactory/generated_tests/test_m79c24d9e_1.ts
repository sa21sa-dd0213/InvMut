import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateRoundImplementation", function () {
  it("should kill mutant m79c24d9e by verifying roundImplementation is updated correctly", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed since it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set owner as program operator to allow create() calls
    await instance.connect(owner).updateProgramOperator(owner.address, true);
    
    // Deploy a mock round implementation contract to use as valid address
    const MockRoundImpl = await ethers.getContractFactory("RoundImplementation");
    const mockRoundImpl = await MockRoundImpl.deploy();
    await mockRoundImpl.waitForDeployment();
    
    // Update roundImplementation with valid address
    await instance.connect(owner).updateRoundImplementation(await mockRoundImpl.getAddress());
    
    // Verify roundImplementation was set correctly (not address(0))
    const roundImpl = await instance.roundImplementation();
    expect(roundImpl).to.equal(await mockRoundImpl.getAddress());
    
    // Now try to create a round - should succeed in original but fail in mutant
    // because mutant sets roundImplementation to address(0)
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "string"],
      [owner.address, 100, "test"]
    );
    
    // In the original, this should succeed
    // In the mutant, this should revert with "roundImplementation is 0x"
    await expect(
      instance.connect(owner).create(encodedParams, owner.address)
    ).to.not.be.reverted;
  });
});