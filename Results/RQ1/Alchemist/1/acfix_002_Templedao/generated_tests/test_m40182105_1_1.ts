import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m40182105 - withdraw with zero amount", function () {
  it("should revert when withdrawing 0 amount (original behavior) and pass on mutant that allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and owner as reward distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await staking.waitForDeployment();

    // First, stake some tokens to have a balance to withdraw from
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(addr1).stake(stakeAmount);

    // Attempt to withdraw 0 amount - should revert in original, pass in mutant
    await expect(
      staking.connect(addr1).withdraw(0, false)
    ).to.be.revertedWith("Cannot withdraw 0");
  });
});