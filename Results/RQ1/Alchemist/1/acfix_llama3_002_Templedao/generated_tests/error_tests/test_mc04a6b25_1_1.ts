import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mc04a6b25", function () {
  it("should set the reward distributor correctly when calling setRewardDistributor", async function () {
    const [owner, distributor, other] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Set the reward distributor to a specific address (not address(0))
    await instance.connect(owner).setRewardDistributor(distributor.address);

    // Verify that the reward distributor is set correctly (not address(0))
    const actualDistributor = await instance.rewardDistributor();
    expect(actualDistributor).to.equal(distributor.address);
    expect(actualDistributor).to.not.equal(ethers.ZeroAddress);
  });
});