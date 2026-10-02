import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m1ea0a4b0 (setMigrator sets address(this) instead of _migrator)", function () {
  let instance: any;
  let owner: any;
  let migratorAddress: any;
  let stakingToken: any;

  beforeEach(async function () {
    [owner, migratorAddress] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and reward distributor (owner)
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
  });

  it("should allow only the owner to set migrator and should set the provided address, not address(this)", async function () {
    // Attempt to set migrator to a specific external address
    await instance.connect(owner).setMigrator(migratorAddress.address);
    
    // Check that the migrator was set to the provided address, not the contract itself
    const actualMigrator = await instance.migrator();
    expect(actualMigrator).to.equal(migratorAddress.address);
    expect(actualMigrator).to.not.equal(await instance.getAddress());
    
    // Verify that the migrator address can now call migrator-only functions
    // First, stake some tokens for migratorAddress
    await stakingToken.transfer(migratorAddress.address, ethers.parseEther("100"));
    await stakingToken.connect(migratorAddress).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(migratorAddress).stake(ethers.parseEther("50"));
    
    // Verify migrator can call migrateWithdraw (migrator-only function)
    await expect(
      instance.connect(migratorAddress).migrateWithdraw(migratorAddress.address, ethers.parseEther("10"))
    ).to.not.be.reverted;
    
    // Verify a non-migrator cannot call migrator-only functions
    await expect(
      instance.connect(addr1).migrateWithdraw(migratorAddress.address, ethers.parseEther("10"))
    ).to.be.revertedWith("not migrator");
  });
});