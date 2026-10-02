import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m3a42b8fc (onlyMigrator modifier)", function () {
  it("should revert when called by the authorized migrator due to inverted access control", async function () {
    const [owner, migrator, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set migrator address
    await instance.connect(owner).setMigrator(migrator.address);
    
    // User stakes some tokens first to have a balance
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("10"));
    
    // Attempt to call migrateStake from the authorized migrator
    // The mutant modifier requires msg.sender != migrator, so the authorized migrator should be reverted
    await expect(
      instance.connect(migrator).migrateStake(await instance.getAddress(), ethers.parseEther("5"))
    ).to.be.revertedWith("not migrator");
    
    // Verify that an unauthorized user can call migrateStake (which should fail differently or succeed in mutant)
    // But the original would revert for unauthorized users
    await expect(
      instance.connect(user).migrateStake(await instance.getAddress(), ethers.parseEther("5"))
    ).to.be.reverted; // Original would revert with "not migrator", mutant might not revert
  });
});