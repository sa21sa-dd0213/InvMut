import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m93f809f1 test", function () {
  it("should kill the mutant by verifying Collect does not execute when condition is replaced with false", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logContract.getAddress());
    await instance.waitForDeployment();

    const instanceAddress = await instance.getAddress();

    // Fund the contract with 2 ether from owner
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("2"),
      data: "0x" // will trigger fallback -> Put(0)
    });

    // Wait for the unlock time to pass (Put(0) sets unlockTime to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [2]); // add 2 seconds
    await ethers.provider.send("evm_mine", []);

    // Record balances before Collect call
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);

    // Call Collect with valid amount (1 ether)
    // In original: should succeed since balance=2, amount=1, MinSum=1, time > unlockTime
    const tx = await instance.connect(owner).Collect(ethers.parseEther("1"));
    await tx.wait();

    // Check balances after Collect call
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);

    // In original: owner receives 1 ether, contract loses 1 ether
    // In mutant: condition is false, so no transfer happens - balances remain unchanged
    // Therefore, if balances are unchanged, the mutant is detected (killed)
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});