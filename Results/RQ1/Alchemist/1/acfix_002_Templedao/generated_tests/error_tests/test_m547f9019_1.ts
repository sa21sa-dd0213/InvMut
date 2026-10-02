import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m547f9019", function () {
  it("should kill the mutant by verifying rewardPerToken calculation with totalSupply", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer some staking tokens to addr1 for staking
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Approve staking tokens for the contract
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake 100 tokens for addr1
    await instance.connect(addr1).stake(ethers.parseEther("100"));
    
    // Transfer reward tokens to the reward distributor (owner)
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward: distribute 700 tokens over 1 week (DURATION = 604800 seconds)
    const rewardAmount = ethers.parseEther("700");
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time by 1 day (86400 seconds) to accumulate some rewards
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Calculate expected rewardPerToken manually:
    // totalSupply = 100e18
    // rewardRate = 700e18 / 604800 = ~1.157e15 per second
    // timeDelta = 86400 seconds
    // expected = rewardPerTokenStored (0) + (86400 * 1.157e15 * 1e18) / 100e18
    //          = 86400 * 1.157e15 * 1e18 / 100e18 = 86400 * 1.157e15 / 100 = ~1e18
    
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // The original contract would return a value close to 1e18 (approximately)
    // The mutant would return a value ~100x larger (without dividing by totalSupply)
    // So we verify the rewardPerToken is within a reasonable range (not astronomically large)
    expect(rewardPerToken).to.be.lt(ethers.parseEther("2")); // Should be around 1e18, not 100e18
    
    // Also verify that earned rewards are reasonable
    const earnedRewards = await instance.earned(addr1.address, await rewardToken.getAddress());
    expect(earnedRewards).to.be.lt(ethers.parseEther("200")); // Should be around 100e18, not 10000e18
  });
});

// Helper: Mock ERC20 contract for testing
// This should be deployed as a separate contract file, but for completeness:
// pragma solidity ^0.8.0;
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
//         _mint(msg.sender, initialSupply);
//     }
// }