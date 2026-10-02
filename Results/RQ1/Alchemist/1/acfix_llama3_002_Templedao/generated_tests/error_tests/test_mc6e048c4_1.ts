import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mc6e048c4", function () {
  it("should detect exponentiation mutation in _earned by checking that rewards are proportional (not exponential)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await TokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await TokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // User stakes 10 tokens
    await instance.connect(user).stake(ethers.parseEther("10"));
    
    // Owner funds reward and notifies reward amount (100 tokens over 1 week)
    await rewardToken.transfer(owner.address, ethers.parseEther("100"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));
    
    // Advance time by 3 days (rewardPerToken will increase, making the exponent > 1)
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Get earned rewards
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    
    // The earned amount should be reasonable (< balance * 2 because rewardRate is limited)
    // In mutant with ** operator, earned would be astronomically large (10 ** ~30)
    expect(earned).to.be.lt(ethers.parseEther("100")); // Should be a few dozen tokens max
    
    // Additionally, the reward should be proportional to time passed
    // After 3 days of 7 day reward period with 100 tokens total, user with 10/10000 of supply
    // Expected: roughly 100 * 3/7 * 10/10000 = ~0.0428 tokens
    expect(earned).to.be.gt(0); // Should be non-zero
    expect(earned).to.be.lt(ethers.parseEther("1")); // Should be less than 1 token
  });
});

// Helper mock ERC20 for testing (must be deployed separately)
// pragma solidity ^0.8.0;
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
//         _mint(msg.sender, initialSupply);
//     }
// }