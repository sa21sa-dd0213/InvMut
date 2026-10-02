import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mcb4fd229 test", function () {
  it("should kill mutant by withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Fund addr1 with ETH for deposits
    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");

    // Set unlock time to current block timestamp (immediate unlock)
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock!.timestamp;

    // addr1 deposits 2 ETH with immediate unlock
    await bank.connect(addr1).Put(unlockTime, { value: depositAmount });

    // Verify deposit was recorded
    let holder = await bank.connect(addr1).Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Wait for next block to ensure timestamp > unlockTime
    await ethers.provider.send("evm_mine", []);

    // addr1 tries to withdraw 1 ETH (partial withdrawal)
    // On original contract this succeeds, on mutant it should revert
    await expect(
      bank.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;

    // Verify balance remains unchanged (mutant prevented withdrawal)
    holder = await bank.connect(addr1).Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});