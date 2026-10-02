import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - Put msg.value-1", function () {
  it("should detect mutant where Put uses msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits 1 ether
    await instance.connect(user).Put(0, { value: depositAmount });

    // Check balance stored - should be 1 ether in original, but 1 ether - 1 wei in mutant
    const holderInfo = await instance.Acc(user.address);
    const storedBalance = holderInfo.balance;

    // Try to collect the full deposit amount
    // In original this succeeds, in mutant it reverts because balance is 1 wei less
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;

    // Additional verification: try collecting 1 wei less than deposit
    const mutantCorrectAmount = depositAmount - BigInt(1);
    await instance.connect(user).Collect(mutantCorrectAmount);

    // Verify the final balance is 0 (mutant case)
    const finalBalance = (await instance.Acc(user.address)).balance;
    expect(finalBalance).to.equal(0);
  });
});