import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m79c24d9e test", function () {
  it("should kill mutant by verifying updateRoundImplementation correctly stores the new implementation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by Initializable pattern)
    await (await instance.initialize()).wait();
    
    // Deploy a mock implementation contract to use as newRoundImplementation
    const MockImplementation = await ethers.getContractFactory("IRoundImplementation");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();
    
    // Grant program operator role to owner for the create function test
    // Note: In the original contract, programOperators mapping needs to be set
    // Since there's no explicit function to add program operators in the provided code,
    // we need to directly set the mapping (this is a test assumption)
    // Actually, looking at the contract, programOperators is public, so we can set it
    await instance.setProgramOperator(owner.address, true);
    
    // Call updateRoundImplementation with a valid address
    const newImplAddress = await mockImpl.getAddress();
    await (await instance.updateRoundImplementation(newImplAddress)).wait();
    
    // Verify that roundImplementation was set correctly (not to address(0))
    const storedImpl = await instance.roundImplementation();
    expect(storedImpl).to.equal(newImplAddress);
    
    // Now try to create a round - this should fail on mutant because
    // mutant sets roundImplementation to address(0)
    // On original, this should succeed
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [owner.address, addr1.address]
    );
    
    // This call will revert on mutant because roundImplementation is address(0)
    // On original it should succeed
    await expect(
      instance.create(encodedParams, owner.address)
    ).to.not.be.reverted;
  });
});