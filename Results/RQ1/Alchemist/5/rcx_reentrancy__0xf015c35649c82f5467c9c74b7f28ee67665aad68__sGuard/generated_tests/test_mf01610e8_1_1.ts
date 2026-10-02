import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mf01610e8 detection test", function () {
  it("should detect mutant by comparing logged value with actual msg.value sent to Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Send 2 ether to Put function via user
    const depositAmount = ethers.parseEther("2");
    const tx = await bank.connect(user).Put(0, { value: depositAmount });
    await tx.wait();

    // Get the last message from Log history
    const historyLength = await log.History.length;
    const lastMessage = await log.History(historyLength - 1n);

    // In the original, logged Val should equal msg.value (2 ether)
    // In the mutant, logged Val will be msg.value - 1 (2 ether - 1 wei)
    // So we expect the logged Val to NOT equal the actual deposit amount
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});