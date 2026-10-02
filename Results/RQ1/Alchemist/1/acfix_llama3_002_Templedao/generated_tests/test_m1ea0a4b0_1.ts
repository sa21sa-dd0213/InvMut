import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m1ea0a4b0", function () {
  it("should revert when non-migrator tries to call migrateStake after setMigrator is called with valid address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock staking token (simple ERC20)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set migrator to addr1 (valid external address)
    await instance.connect(owner).setMigrator(addr1.address);
    
    // Now try to call migrateStake from addr1 - this should succeed in original
    // but fail in mutant because migrator is set to contract itself
    await expect(
      instance.connect(addr1).migrateStake(await instance.getAddress(), 0)
    ).to.be.revertedWith("not migrator");
  });
});