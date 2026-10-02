import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant maa861c12 - Collect with >= changed to >", function () {
  it("should detect mutant by calling Collect with balance exactly equal to MinSum", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const MinSum = await instance.MinSum(); // Should be 1 ether

    // User deposits exactly MinSum (1 ether) via Put
    const depositAmount = MinSum;
    const unlockTime = (await ethers.provider.getBlock("latest")).timestamp + 100; // Future unlock
    await instance.connect(user).Put(unlockTime, { value: depositAmount });

    // Advance time past unlock
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect exactly the deposited amount (balance == MinSum)
    // Original contract allows this; mutant rejects because it requires balance > MinSum
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted; // Mutant should revert due to strict > comparison

    // Verify balance unchanged (failed collect attempt)
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});