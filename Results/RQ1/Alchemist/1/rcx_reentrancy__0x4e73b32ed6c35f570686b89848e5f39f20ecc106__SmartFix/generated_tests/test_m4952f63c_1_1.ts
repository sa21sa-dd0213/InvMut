import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test for m4952f63c", function () {
  it("should detect that AddMessage logs msg.value-1 instead of msg.value", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const CellFactory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const cell = await CellFactory.deploy();
    await cell.waitForDeployment();

    // Deploy LogFile (no constructor arguments)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the cell with the log address
    await cell.connect(owner).SetLogFile(await log.getAddress());
    await cell.connect(owner).SetMinSum(0);
    await cell.connect(owner).Initialized();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const tx = await cell.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();

    // Get the last message from LogFile history
    const historyLength = await log.History.length;
    const lastMessage = await log.History(historyLength - 1n);

    // The logged value should be exactly 1 wei (msg.value), not 0 wei (msg.value-1)
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});