import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test - mb061f0e6", function () {
  it("should detect that Log.AddMessage logs msg.value+1 instead of msg.value", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args needed)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PRIVATE_ETH_CELL (no constructor args needed)
    const CellFactory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const cell = await CellFactory.deploy();
    await cell.waitForDeployment();

    // Initialize the contract: set MinSum, LogFile, and finalize initialization
    await cell.SetMinSum(0);
    await cell.SetLogFile(await logFile.getAddress());
    await cell.Initialized();

    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx = await cell.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();

    // Get the last message from LogFile history
    const historyLength = await logFile.History.length;
    const lastMessage = await logFile.History(historyLength - 1n);

    // The logged Val should equal the deposited amount (1 ether)
    // Mutant would log msg.value+1 = 1 ether + 1 wei
    // Original would log msg.value = 1 ether
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});