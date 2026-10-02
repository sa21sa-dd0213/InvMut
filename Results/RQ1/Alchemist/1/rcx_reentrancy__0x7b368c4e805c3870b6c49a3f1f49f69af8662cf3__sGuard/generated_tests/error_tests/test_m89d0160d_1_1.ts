import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection test", function () {
  it("should detect mutant where Collect never deducts balance after successful call", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const WWalletFactory = await ethers.getContractFactory("W_WALLET");
    const wWalletInstance = await WWalletFactory.deploy(await logInstance.getAddress());
    await wWalletInstance.waitForDeployment();

    const walletAddress = await wWalletInstance.getAddress();

    // Send 2 ether to the contract via Put with a future unlock time
    const depositAmount = ethers.parseEther("2");
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const putTx = await wWalletInstance.connect(addr1).Put(futureTime, { value: depositAmount });
    await putTx.wait();

    // Verify initial balance
    let holder = await wWalletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Wait for unlock time (or use evm_increaseTime in hardhat)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 1 ether (should succeed in original, but mutant will not deduct)
    const collectAmount = ethers.parseEther("1");

    // Get balance before collect
    const balanceBefore = await ethers.provider.getBalance(walletAddress);

    const collectTx = await wWalletInstance.connect(addr1).Collect(collectAmount);
    const receipt = await collectTx.wait();

    // Check that the transaction succeeded (the call should return true)
    expect(receipt.status).to.equal(1);

    // Get balance after collect
    const balanceAfter = await ethers.provider.getBalance(walletAddress);

    // In the original, the balance should have decreased by exactly collectAmount
    // In the mutant (if (false)), the balance will NOT be deducted, so this assertion will fail
    expect(balanceAfter).to.equal(balanceBefore - collectAmount);

    // Also verify the user's stored balance was updated
    holder = await wWalletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount - collectAmount);
  });
});