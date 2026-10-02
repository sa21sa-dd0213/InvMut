import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m4dce04ef test", function () {
  it("should emit MigratorSet event when setMigrator is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for the staking token
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Set a new migrator address
    const newMigrator = addr1.address;
    
    // Call setMigrator and check for the event emission
    await expect(instance.setMigrator(newMigrator))
      .to.emit(instance, "MigratorSet")
      .withArgs(newMigrator);
  });
});