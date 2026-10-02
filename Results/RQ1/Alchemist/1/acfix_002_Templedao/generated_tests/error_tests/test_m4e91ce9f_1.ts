import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m4e91ce9f - migrateWithdraw modifier removal", function () {
  it("should revert when non-migrator calls migrateWithdraw", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock staking token (simple ERC20)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Set a migrator (different from owner and addr1)
    await staking.connect(owner).setMigrator(addr2.address);
    
    // Try to call migrateWithdraw from addr1 (not the migrator) - should revert
    await expect(
      staking.connect(addr1).migrateWithdraw(addr1.address, ethers.parseEther("100"))
    ).to.be.revertedWith("not migrator");
  });
});