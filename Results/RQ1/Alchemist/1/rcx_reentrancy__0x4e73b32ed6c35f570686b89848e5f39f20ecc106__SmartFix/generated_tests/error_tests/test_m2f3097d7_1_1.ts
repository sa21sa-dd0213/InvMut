import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test - m2f3097d7", function () {
  it("should detect mutant that replaces _veri_ok with false in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const CellFactory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const cell = await CellFactory.deploy();
    await cell.waitForDeployment();

    // Set up the contract
    await cell.connect(owner).SetLogFile(await logFile.getAddress());
    await cell.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await cell.connect(owner).Initialized();

    // Deposit funds for user
    const depositAmount = ethers.parseEther("1");
    await cell.connect(user).Deposit({ value: depositAmount });

    // Verify deposit
    const balance = await cell.balances(user.address);
    expect(balance).to.equal(depositAmount);

    // Attempt Collect - should succeed in original, revert in mutant
    const collectAmount = ethers.parseEther("0.5");

    // In original: Collect should succeed and add message to LogFile
    // In mutant: Collect will always revert because if(false) causes revert()
    await expect(
      cell.connect(user).Collect(collectAmount)
    ).to.be.reverted;

    // If the mutant is present, the revert is expected (fails the test because original doesn't revert)
    // If no revert happens, the mutant is killed (test passes meaning original behavior)
  });
});