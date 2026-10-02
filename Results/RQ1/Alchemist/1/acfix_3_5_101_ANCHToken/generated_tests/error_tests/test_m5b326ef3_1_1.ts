import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - m5b326ef3", function () {
  it("should detect mutant that disables reward distribution in _tokenSellTransferReward by checking txReward mapping after a sell transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with a mock Uniswap router address and a mock USD token address
    // Using addr1 as placeholder addresses since we need valid addresses for constructor
    const mockRouter = addr1.address;
    const mockUSDToken = addr2.address;

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouter, mockUSDToken);
    await instance.waitForDeployment();

    // Setup: Set minTxnAmount to a small value for testing
    const minTxnAmount = ethers.parseEther("1");
    await instance.setMinTxnAmount(minTxnAmount);

    // Setup: Transfer tokens to addr1 so they can perform sell transfer
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);

    // Setup: Transfer tokens to the contract to have balance for rewards
    const contractBalance = ethers.parseEther("50");
    await instance.transfer(instance.target, contractBalance);

    // Set reward rate to a reasonable value
    await instance.setRewardRate(5);

    // Get initial txReward for sender (owner) - we'll use a sell transfer where owner sells to addr1
    const initialReward = await instance.txReward(owner.address);

    // Perform a transfer from addr1 to owner (sell transfer) with amount >= minTxnAmount
    const rewardTriggerAmount = ethers.parseEther("10");
    const tx = await instance.connect(addr1).transfer(owner.address, rewardTriggerAmount);
    await tx.wait();

    // Check if txReward was updated - in original it should be > 0, in mutant it should be 0
    const finalReward = await instance.txReward(owner.address);

    // If mutant is present (condition replaced with false), reward should be 0
    // If original, reward should be > 0
    // We expect this to fail on mutant because reward won't be distributed
    expect(finalReward).to.be.gt(initialReward);
  });
});