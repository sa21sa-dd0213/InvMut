import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m3a42b8fc - onlyMigrator modifier inverted", function () {
  it("should revert when migrator calls migrateStake because mutant inverts access control", async function () {
    const [owner, migrator, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set the migrator
    await instance.setMigrator(migrator.address);
    
    // Setup: staker stakes some tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(staker).stake(ethers.parseEther("50"));
    
    // The migrator calls migrateStake - this should revert with the mutant
    // because the mutant requires msg.sender != migrator, so migrator is blocked
    await expect(
      instance.connect(migrator).migrateStake(await instance.getAddress(), ethers.parseEther("10"))
    ).to.be.revertedWith("not migrator");
  });
});