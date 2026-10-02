import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant mc535433c (Collect: >= changed to >)", function () {
  it("should allow Collect when balance equals _am (detect strict > mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();
    const minSum = await bank.MinSum(); // 1 ether

    // addr1 deposits exactly MinSum (1 ether) with unlock time in the past
    const pastUnlockTime = 0; // will be set to block.timestamp by contract
    await bank.connect(addr1).Put(pastUnlockTime, { value: minSum });

    // Verify balance equals MinSum
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(minSum);

    // Now try to Collect exactly the balance amount
    // On original: acc.balance >= _am allows this (1 >= 1)
    // On mutant: acc.balance > _am rejects this (1 > 1 is false)
    const tx = bank.connect(addr1).Collect(minSum);

    // Should succeed on original, but revert on mutant
    await expect(tx).to.not.be.reverted;

    // Verify balance decreased to zero
    const holderAfter = await bank.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(0);
  });
});