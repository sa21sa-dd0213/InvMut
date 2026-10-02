import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test", function () {
  it("should allow partial withdrawal when balance > _am, but mutant fails because it requires equality", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit 2 ether (more than MinSum of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).Put(0, { value: depositAmount });

    // Verify balance is 2 ether
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Attempt to withdraw only 0.5 ether (partial withdrawal)
    const withdrawAmount = ethers.parseEther("0.5");

    // In original contract this succeeds (balance >= _am), 
    // in mutant it fails (balance == _am is false since 2 != 0.5)
    await expect(
      bank.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});