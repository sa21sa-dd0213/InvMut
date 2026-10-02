import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test", function () {
  it("should kill mutant me9fd751c by sending exact wei and failing to collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy PENNY_BY_PENNY (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (required for SetLogFile)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.SetMinSum(0)).wait();
    await (await instance.Initialized()).wait();

    // User sends exactly 100 wei via Put
    const sendAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await (await instance.connect(user).Put(0, { value: sendAmount })).wait();

    // Check balance stored (should be sendAmount on original, but sendAmount-1 on mutant)
    const userAcc = await instance.Acc(user.address);

    // On original: balance = 100, on mutant: balance = 99
    // Try to collect exactly 100 wei
    // On original this should succeed, on mutant it should fail because balance < _am
    await expect(
      instance.connect(user).Collect(sendAmount)
    ).to.be.reverted; // On mutant, balance is 99 < 100, so Collect reverts due to balance check
  });
});