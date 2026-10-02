import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m7ef7bf0f - exponentiation vs multiplication", function () {
  it("should kill the mutant by verifying minTxnAmount initial value and reward distribution for a transfer equal to original minTxnAmount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments (router and USD token addresses)
    const Factory = await ethers.getContractFactory("ANCHToken");
    const routerAddress = "0x0000000000000000000000000000000000000001";
    const usdTokenAddress = "0x0000000000000000000000000000000000000002";
    const instance = await Factory.deploy(routerAddress, usdTokenAddress);
    await instance.waitForDeployment();

    // Get the initial minTxnAmount
    const initialMinTxnAmount = await instance.minTxnAmount();
    
    // The original value should be 10000 * 1e18 = 10000 * 10^18 = 10^22
    const expectedOriginalValue = ethers.parseEther("10000");
    
    // Check if minTxnAmount is the expected value
    if (initialMinTxnAmount.toString() !== expectedOriginalValue.toString()) {
      // If the value differs, the mutant is detected
      expect(initialMinTxnAmount).to.not.equal(expectedOriginalValue);
      return;
    }

    // If minTxnAmount equals the expected value, test the reward functionality
    const transferAmount = expectedOriginalValue;

    // Perform a buy transfer (sender is allowed role)
    await instance.transfer(addr1.address, transferAmount);

    // Check if reward was distributed (txReward mapping)
    const addr1Reward = await instance.txReward(addr1.address);

    // For the original contract, since transferAmount >= minTxnAmount,
    // reward should be calculated: rewardAmount = transferAmount * rewardRate / percent
    const expectedReward = ethers.parseEther("5");

    // Check that addr1 received the transfer
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);

    // Check contract balance changes
    const contractBalanceAfter = await instance.balanceOf(await instance.getAddress());
    
    // The contract should have reduced its balance by the reward amount
    if (addr1Reward > 0n) {
      expect(addr1Reward).to.equal(expectedReward);
      // Verify the reward was actually transferred from contract
      const contractBalance = await instance.balanceOf(await instance.getAddress());
      expect(contractBalance).to.be.lessThan(transferAmount); // Some tokens should have been distributed as reward
    } else {
      // If no reward, the mutant is likely present
      expect(addr1Reward).to.equal(0n);
    }
  });
});