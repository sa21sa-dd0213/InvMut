import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - constructor sets rewardDistributor to address(0)", function () {
  it("should detect mutant by verifying notifyRewardAmount reverts when called from intended distributor", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock staking token (simple ERC20)
    const TokenFactory = await ethers.getContractFactory("StaxLPStaking");
    
    // Deploy the staking contract with a valid distributor address
    const stakingTokenAddress = distributor.address; // Using a signer address as placeholder for token
    // Actually deploy a simple ERC20 token first
    const ERC20Factory = await ethers.getContractFactory("IERC20");
    // For testing, we'll use the actual contract factory but with proper token
    // Let's deploy with a valid token address (using addr1 as placeholder)
    const instance = await TokenFactory.deploy(distributor.address, distributor.address);
    await instance.waitForDeployment();
    
    // Try to call notifyRewardAmount from the intended distributor address
    // In the original contract this should work, in the mutant it should revert
    // because rewardDistributor is set to address(0) instead of distributor
    
    // First add a reward token
    await instance.connect(owner).addReward(distributor.address);
    
    // Attempt to notify reward from the distributor - should revert in mutant
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        distributor.address,
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
    
    // Also verify that calling from address(0) is impossible (no signer for zero address)
    // The mutant makes rewardDistributor = address(0), so no one can call notifyRewardAmount
  });
});