import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m7d31e677 (amount > 0 changed to amount < 0)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy two ERC20 tokens (staking token and reward token)
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Transfer tokens to user for staking
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));

    // Add reward token to staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Approve staking contract to spend user's staking tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    // Approve staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
  });

  it("should transfer reward tokens to user after notifying reward and claiming", async function () {
    // Distributor notifies reward
    const rewardAmount = ethers.parseEther("100");
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward time to ensure rewards accumulate (past the duration to make them fully claimable)
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]); // DURATION + 1 second
    await ethers.provider.send("evm_mine", []);

    // Get user's reward token balance before claim
    const balanceBefore = await rewardToken.balanceOf(user.address);

    // User claims rewards
    await staking.connect(user).getRewards(user.address);

    // Get balance after claim
    const balanceAfter = await rewardToken.balanceOf(user.address);

    // The mutant changes if (amount > 0) to if (amount < 0)
    // Since amount is uint256, amount < 0 is always false, so rewards are never transferred
    // Therefore, the mutant will fail this assertion because balanceAfter will equal balanceBefore
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});

// Helper mock ERC20 contract for testing (deploy as a separate contract)
// This should be in a separate file or inline; for completeness we include the contract definition
// In practice this would be deployed as a separate contract
// pragma solidity ^0.8.0;
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
//         _mint(msg.sender, initialSupply);
//     }
// }