import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m066138a4 test", function () {
  it("should kill the mutant by testing withdrawal when balance > withdrawal amount", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    const bankAddress = await bankInstance.getAddress();

    // First, deposit 2 ether from addr1
    const depositAmount = ethers.parseEther("2");
    const depositTx = await bankInstance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 3600, // unlock time 1 hour in future
      { value: depositAmount }
    );
    await depositTx.wait();

    // Wait for the unlock time to pass (we need block.timestamp > unlockTime)
    // Since we set unlockTime to future, we need to advance time
    await ethers.provider.send("evm_increaseTime", [3601]); // advance 1 hour + 1 second
    await ethers.provider.send("evm_mine", []); // mine a new block

    // Now try to withdraw 1 ether (balance is 2, withdrawal is 1)
    // Original: acc.balance >= _am (2 >= 1) => true => success
    // Mutant:   acc.balance <= _am (2 <= 1) => false => revert
    const withdrawAmount = ethers.parseEther("1");

    await expect(
      bankInstance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});