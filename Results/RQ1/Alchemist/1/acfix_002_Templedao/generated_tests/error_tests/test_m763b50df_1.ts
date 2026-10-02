import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - mutant m763b50df test", function () {
  it("should revert when unauthorized address calls migrateStake due to onlyMigrator modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set a migrator (different from addr1)
    await instance.connect(owner).setMigrator(addr2.address);
    
    // addr1 (unauthorized) tries to call migrateStake - should revert
    await expect(
      instance.connect(addr1).migrateStake(await instance.getAddress(), ethers.parseEther("100"))
    ).to.be.revertedWith("not migrator");
  });
});