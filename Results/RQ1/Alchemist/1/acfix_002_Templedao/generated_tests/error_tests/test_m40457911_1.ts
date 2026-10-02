import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - m40457911", function () {
  it("should detect block.timestamp replaced by block.prevrandao in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer some reward tokens to distributor
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("10000"));
    
    // Approve staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockNumBefore!.timestamp;
    
    // Notify reward amount
    const rewardAmount = ethers.parseEther("1000");
    const tx = await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    await tx.wait();
    
    // Get the reward data after notification
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const lastUpdateTime = Number(rewardData.lastUpdateTime);
    
    // Get the block after the transaction
    const blockNumAfter = await ethers.provider.getBlock("latest");
    const timestampAfter = blockNumAfter!.timestamp;
    
    // The lastUpdateTime should be within the valid timestamp range of the block
    // block.prevrandao would be a random value (not a timestamp), so it would fail this check
    expect(lastUpdateTime).to.be.at.least(timestampBefore);
    expect(lastUpdateTime).to.be.at.most(timestampAfter);
  });
});

// Mock ERC20 contract for testing
// This should be deployed as a separate contract file, but for completeness:
// pragma solidity ^0.8.0;
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// contract MockERC20 is ERC20 {
//     constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
//         _mint(msg.sender, initialSupply);
//     }
// }