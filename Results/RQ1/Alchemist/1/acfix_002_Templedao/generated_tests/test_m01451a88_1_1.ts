import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m01451a88 test", function () {
  it("should revert when non-owner calls addReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a mock staking token (any ERC20 address)
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Create a reward token to add
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Non-owner should not be able to call addReward
    await expect(
      instance.connect(addr1).addReward(await rewardToken.getAddress())
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});