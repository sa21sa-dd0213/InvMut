import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m6c745a69 - migrateStake modifier removal", function () {
  let stakingToken: any;
  let stakingInstance: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let migrator: any;

  beforeEach(async function () {
    [owner, addr1, addr2, migrator] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    stakingInstance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await stakingInstance.waitForDeployment();
    
    // Set migrator
    await stakingInstance.connect(owner).setMigrator(migrator.address);
    
    // Fund addr1 with staking tokens
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    await stakingToken.connect(addr1).approve(await stakingInstance.getAddress(), ethers.parseEther("1000"));
    
    // Stake some tokens from addr1 first
    await stakingInstance.connect(addr1).stake(ethers.parseEther("100"));
  });

  it("should revert when non-migrator calls migrateStake (detects removed onlyMigrator modifier)", async function () {
    // addr2 is not the migrator, so this should revert in the original contract
    // but the mutant allows it since the modifier is removed
    await expect(
      stakingInstance.connect(addr2).migrateStake(
        await stakingInstance.getAddress(),
        ethers.parseEther("50")
      )
    ).to.be.revertedWith("not migrator");
  });
});