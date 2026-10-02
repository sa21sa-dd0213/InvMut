import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant ma097b614 detection", function () {
  it("should detect the mutant that logs msg.value-1 instead of msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy Log contract (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Set up the MONEY_BOX: initialize and set the log file
    await moneyBox.connect(owner).SetLogFile(await logContract.getAddress());
    await moneyBox.connect(owner).Initialized();

    // Send exactly 5 wei to the Put function via user
    const sentAmount = ethers.parseEther("0.000000000000000005"); // 5 wei
    const tx = await moneyBox.connect(user).Put(0, { value: sentAmount });
    await tx.wait();

    // Check the last logged message in the Log contract
    const lastMsg = await logContract.LastMsg();

    // The logged Val should equal the exact msg.value sent (5 wei)
    // Mutant would log msg.value-1 = 4 wei, causing this assertion to fail
    expect(lastMsg.Val).to.equal(sentAmount);
  });
});