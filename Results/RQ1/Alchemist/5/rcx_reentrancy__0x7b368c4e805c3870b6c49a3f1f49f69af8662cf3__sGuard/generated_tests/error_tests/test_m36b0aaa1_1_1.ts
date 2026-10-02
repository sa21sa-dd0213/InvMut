import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m36b0aaa1 test", function () {
  it("should kill the mutant by allowing withdrawal when balance < MinSum but time condition is met", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set up: user sends 0.5 ether (less than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });
    await tx.wait();

    // Verify balance is less than MinSum
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.balance).to.be.lessThan(ethers.parseEther("1")); // MinSum = 1 ether

    // Fast forward time past unlockTime (unlockTime was set to block.timestamp on deposit via Put(0))
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect 0.1 ether - should revert on original but succeed on mutant
    const collectAmount = ethers.parseEther("0.1");

    // On the original contract this would revert because balance < MinSum
    // On the mutant it succeeds because block.timestamp > unlockTime is true
    // We expect it to NOT revert (kill the mutant)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify the balance decreased (mutant allowed the withdrawal)
    const holderAfter = await instance.Acc(user.address);
    expect(holderAfter.balance).to.equal(depositAmount - collectAmount);
  });
});