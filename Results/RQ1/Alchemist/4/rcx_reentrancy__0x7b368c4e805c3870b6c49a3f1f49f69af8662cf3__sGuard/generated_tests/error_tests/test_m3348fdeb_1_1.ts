import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - Collect balance >= vs ==", function () {
  it("should allow partial withdrawal when balance > amount (original), but fail on mutant requiring exact equality", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");

    // User deposits 2 ether via Put
    await instance.connect(user).Put(0, { value: depositAmount });

    // Verify balance is 2 ether
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // User attempts to withdraw 1 ether (less than balance)
    // Original contract should succeed, mutant with == should revert
    const tx = instance.connect(user).Collect(withdrawAmount);

    // The mutant changes >= to ==, so this should revert on mutant
    // On original it would succeed - we expect revert to detect the mutant
    await expect(tx).to.be.reverted;
  });
});