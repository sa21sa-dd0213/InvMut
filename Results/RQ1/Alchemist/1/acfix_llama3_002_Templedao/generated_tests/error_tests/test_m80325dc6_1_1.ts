import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m80325dc6", function () {
  it("should revert when rewardPerToken is called with zero totalSupply and active reward period", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking and rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);

    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Fund the distributor with reward tokens and approve
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount (this sets rewardRate even with 0 totalSupply)
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );

    // Now call rewardPerToken - original returns stored value, mutant reverts with division by zero
    // The call should revert because totalSupply() == 0 and the mutant removes the guard
    await expect(
      instance.connect(owner).rewardPerToken(await rewardToken.getAddress())
    ).to.be.reverted;
  });
});