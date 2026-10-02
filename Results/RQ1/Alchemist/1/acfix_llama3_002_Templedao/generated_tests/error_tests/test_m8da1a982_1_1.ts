import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m8da1a982 - setMigrator", function () {
  it("should kill mutant by verifying migrator is set correctly after calling setMigrator with a valid address", async function () {
    const [owner, migrator] = await ethers.getSigners();
    
    // Deploy with constructor arguments (stakingToken and distributor)
    const MockToken = await ethers.getContractFactory("IERC20");
    const stakingToken = await MockToken.deploy();
    await stakingToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set migrator to a non-zero address
    await instance.connect(owner).setMigrator(migrator.address);
    
    // Verify that migrator was set to the intended address (not address(0))
    // In the mutant, migrator will always be address(0), so this assertion will fail
    expect(await instance.migrator()).to.equal(migrator.address);
  });
});