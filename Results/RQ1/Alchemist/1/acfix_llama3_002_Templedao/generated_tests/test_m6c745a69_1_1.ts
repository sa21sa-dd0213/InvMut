import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m6c745a69 - migrateStake modifier removal", function () {
  it("should revert when calling migrateStake from a non-migrator address", async function () {
    const [owner, addr1, addr2, migrator] = await ethers.getSigners();
    
    // Deploy a mock staking token
    const TokenFactory = await ethers.getContractFactory("StaxLPStaking");
    
    // Deploy two instances: one as old staking, one as new staking
    const oldStaking = await TokenFactory.deploy(await addr1.getAddress(), owner.address);
    await oldStaking.waitForDeployment();
    
    const newStaking = await TokenFactory.deploy(await addr1.getAddress(), owner.address);
    await newStaking.waitForDeployment();
    
    // Set migrator on the new staking contract
    await newStaking.setMigrator(migrator.address);
    
    // Try to call migrateStake from a non-migrator address (addr2)
    // This should revert in the original contract but might succeed in the mutant
    await expect(
      newStaking.connect(addr2).migrateStake(await oldStaking.getAddress(), ethers.parseEther("100"))
    ).to.be.revertedWith("not migrator");
  });
});