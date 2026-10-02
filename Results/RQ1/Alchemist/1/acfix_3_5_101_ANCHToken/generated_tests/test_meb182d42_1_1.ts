import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test for meb182d42", function () {
  it("should kill the mutant by verifying reward is NOT given for amounts <= minTxnAmount in sell transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with mock router and USDC address (using zero addresses for testing)
    const Factory = await ethers.getContractFactory("ANCHToken");
    const routerAddress = "0x0000000000000000000000000000000000000001";
    const usdcAddress = "0x0000000000000000000000000000000000000002";
    const instance = await Factory.deploy(routerAddress, usdcAddress);
    await instance.waitForDeployment();

    // Get the minTxnAmount from the contract
    const minTxnAmount = await instance.minTxnAmount();

    // First, let's check the balance of the contract itself for reward distribution
    const contractBalance = await instance.balanceOf(await instance.getAddress());

    // Perform a sell transfer with amount EXACTLY equal to minTxnAmount
    // In the original: reward is given when tAmount >= minTxnAmount
    // In the mutant: reward is given when tAmount <= minTxnAmount
    // Both original and mutant would give reward for tAmount == minTxnAmount

    // To distinguish them, we need a transfer with amount LESS than minTxnAmount
    const smallAmount = minTxnAmount - ethers.parseEther("1");

    // Get initial txReward for addr1 (recipient in sell transfer)
    const initialReward = await instance.txReward(addr1.address);

    // Transfer tokens from owner to addr1 first to give addr1 some balance
    // Owner has all tokens initially
    await instance.transfer(addr1.address, ethers.parseEther("1000"));

    // Now perform a sell transfer from addr1 back to contract (simulating sell)
    // with amount less than minTxnAmount
    await instance.connect(addr1).transfer(await instance.getAddress(), smallAmount);

    // Check if txReward was updated for the sender (addr1 in sell transfer)
    const rewardAfterTransfer = await instance.txReward(addr1.address);

    // In the original: reward should NOT be given because tAmount < minTxnAmount
    // In the mutant: reward SHOULD be given because tAmount <= minTxnAmount
    // This test will fail on the mutant (reward is given when it shouldn't be)
    expect(rewardAfterTransfer).to.equal(initialReward);
  });
});