import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m796ed952 test", function () {
  it("should detect the mutant that adds 1 to msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MONEY_BOX
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBoxInstance = await MoneyBoxFactory.deploy();
    await moneyBoxInstance.waitForDeployment();

    // Set MinSum to 0 so Collect can work with any amount
    await moneyBoxInstance.SetMinSum(0);
    await moneyBoxInstance.Initialized();

    // Set the LogFile address
    await moneyBoxInstance.SetLogFile(await logInstance.getAddress());

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await moneyBoxInstance.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();

    // Check the recorded balance - should be 1 wei in original, but 2 wei in mutant
    const holderInfo = await moneyBoxInstance.Acc(await addr1.getAddress());
    expect(holderInfo.balance).to.equal(depositAmount);

    // Additional check: try to Collect exactly 1 wei
    // In original it should succeed, in mutant the recorded balance is 2 wei so it should also succeed
    // But then the remaining balance should be 0 in original, but 1 in mutant
    const collectTx = await moneyBoxInstance.connect(addr1).Collect(depositAmount);
    await collectTx.wait();

    const holderInfoAfter = await moneyBoxInstance.Acc(await addr1.getAddress());
    expect(holderInfoAfter.balance).to.equal(0n);
  });
});