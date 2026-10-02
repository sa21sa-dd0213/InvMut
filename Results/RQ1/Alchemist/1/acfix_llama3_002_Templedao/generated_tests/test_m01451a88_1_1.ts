import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m01451a88 - remove onlyOwner from addReward", function () {
  it("should revert when non-owner calls addReward", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract with staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // addr1 (non-owner) tries to add a reward token - should revert
    await expect(
      instance.connect(addr1).addReward(await rewardToken.getAddress())
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});