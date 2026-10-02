import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m4e91ce9f (remove onlyMigrator from migrateWithdraw)", function () {
  it("should revert when non-migrator calls migrateWithdraw", async function () {
    const [owner, migrator, staker, attacker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Setup migrator
    await instance.setMigrator(migrator.address);
    
    // Setup: staker stakes some tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(staker).stake(ethers.parseEther("10"));
    
    // Attacker tries to call migrateWithdraw on behalf of staker (should revert with onlyMigrator)
    await expect(
      instance.connect(attacker).migrateWithdraw(staker.address, ethers.parseEther("5"))
    ).to.be.revertedWith("not migrator");
    
    // Verify migrator can still call successfully
    await instance.connect(migrator).migrateWithdraw(staker.address, ethers.parseEther("5"));
    expect(await instance.balanceOf(staker.address)).to.equal(ethers.parseEther("5"));
  });
});