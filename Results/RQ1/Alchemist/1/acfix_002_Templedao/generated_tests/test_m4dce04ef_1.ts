import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m4dce04ef (remove MigratorSet event)", function () {
  it("should emit MigratorSet event when setMigrator is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy StaxLPStaking with required constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Test that setMigrator emits MigratorSet event
    await expect(instance.setMigrator(addr1.address))
      .to.emit(instance, "MigratorSet")
      .withArgs(addr1.address);
    
    // Verify the migrator was actually set
    expect(await instance.migrator()).to.equal(addr1.address);
    
    // Test with a different address
    await expect(instance.setMigrator(addr2.address))
      .to.emit(instance, "MigratorSet")
      .withArgs(addr2.address);
    
    expect(await instance.migrator()).to.equal(addr2.address);
  });
});