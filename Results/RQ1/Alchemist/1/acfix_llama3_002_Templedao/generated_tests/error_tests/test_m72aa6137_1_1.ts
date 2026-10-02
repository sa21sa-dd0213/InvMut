import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m72aa6137 test", function () {
  it("should detect the mutant that inverts the totalSupply() == 0 check in _rewardPerToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking", "STK", 18);
    await stakingToken.waitForDeployment();
    const rewardToken = await ERC20Factory.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and owner as distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Get initial rewardPerTokenStored (should be 0)
    const initialRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    expect(initialRewardPerToken).to.equal(0);

    // Stake tokens to make totalSupply non-zero
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(addr1).stake(stakeAmount);

    // Now totalSupply is non-zero, rewardRate is still 0 (no rewards notified)
    // In the original: _rewardPerToken returns stored value (0) + formula result (0) = 0
    // In the mutant: totalSupply() != 0 is false, so it returns stored value (0) = 0
    // Both return 0 at this point, so we need to advance time to differentiate

    // Advance time past the initial periodFinish (which was set to block.timestamp when added)
    // to make _lastTimeRewardApplicable return the periodFinish (past timestamp)
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);

    // Now call rewardPerToken again
    // Original: totalSupply() != 0 is true, calculates: 
    //   (periodFinish - lastUpdateTime) * rewardRate * 1e18 / totalSupply
    //   = (oldTimestamp - oldTimestamp) * 0 * 1e18 / 100e18 = 0
    // Mutant: totalSupply() != 0 is false, returns stored rewardPerTokenStored = 0
    // Both still 0... Need different approach

    // Instead, notify rewards to set a non-zero rewardRate
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await instance.getAddress(), rewardAmount);
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Advance time by 1 second to make time difference non-zero
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Now get rewardPerToken
    const rewardPerTokenValue = await instance.rewardPerToken(await rewardToken.getAddress());

    // The mutant would return 0 (stored value) while original returns > 0 (calculated)
    // This difference kills the mutant
    expect(rewardPerTokenValue).to.be.gt(0);
  });
});