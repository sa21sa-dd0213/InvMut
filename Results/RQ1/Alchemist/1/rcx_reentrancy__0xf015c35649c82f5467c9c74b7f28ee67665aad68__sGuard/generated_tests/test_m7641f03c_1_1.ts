import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - m7641f03c", function () {
  it("should detect that LogFile.AddMessage logs msg.value+1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();
    const logAddress = await log.getAddress();

    // Send exactly 2 ether to Put function
    const sendAmount = ethers.parseEther("2");
    const tx = await bank.connect(user).Put(0, { value: sendAmount });
    await tx.wait();

    // Access the History array from Log contract to verify logged value
    // The first message should have Val = sendAmount (original) or sendAmount+1 (mutant)
    const historyEntry = await log.History(0);
    const loggedValue = historyEntry.Val;

    // If mutant is active, logged value will be sendAmount + 1 wei (since msg.value+1)
    // If original, logged value will be exactly sendAmount
    // Test expects the original behavior (logged value == sendAmount)
    expect(loggedValue).to.equal(sendAmount);
  });
});