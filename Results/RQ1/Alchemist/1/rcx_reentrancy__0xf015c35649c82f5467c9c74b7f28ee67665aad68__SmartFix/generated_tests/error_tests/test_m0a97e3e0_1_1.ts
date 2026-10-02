import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test", function () {
  it("should detect mutant m0a97e3e0 by sending 0 wei to Put and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Test: Send 0 wei via Put function - should succeed on original, revert on mutant
    const tx = bankInstance.connect(addr1).Put(0, { value: ethers.parseEther("0") });

    // If mutant is present, this transaction will revert
    // If original, it will succeed
    // We expect success (no revert) for the original, so we check it doesn't revert
    await expect(tx).to.not.be.reverted;

    // Additional verification: balance should remain unchanged
    const holder = await bankInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(0);
  });
});