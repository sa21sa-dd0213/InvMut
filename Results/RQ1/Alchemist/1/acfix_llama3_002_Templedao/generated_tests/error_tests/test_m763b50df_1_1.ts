import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m763b50df (onlyMigrator modifier removed)", function () {
  let stakingToken: any;
  let instance: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Set migrator to addr1 for testing
    await instance.setMigrator(addr1.address);
  });

  it("should revert when a non-migrator calls migrateStake (original behavior)", async function () {
    // addr2 is not the migrator (addr1 is)
    await expect(
      instance.connect(addr2).migrateStake(await instance.getAddress(), ethers.parseEther("100"))
    ).to.be.revertedWith("not migrator");
  });

  it("should revert when a non-migrator calls migrateWithdraw (original behavior)", async function () {
    // addr2 is not the migrator (addr1 is)
    await expect(
      instance.connect(addr2).migrateWithdraw(owner.address, ethers.parseEther("100"))
    ).to.be.revertedWith("not migrator");
  });
});