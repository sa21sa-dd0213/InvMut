import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - mfcd9f485", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2"); // 2 ETH, above MinDeposit of 1 ETH

    // Perform deposit
    const tx = await bank.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();

    // Get the last message from Log contract history
    // History array index will be 0 since it's the first deposit
    const lastMessage = await log.History(0);

    // The logged Val should equal the actual msg.value sent (depositAmount)
    // Mutant logs msg.value-1, so this assertion will fail on the mutant
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});