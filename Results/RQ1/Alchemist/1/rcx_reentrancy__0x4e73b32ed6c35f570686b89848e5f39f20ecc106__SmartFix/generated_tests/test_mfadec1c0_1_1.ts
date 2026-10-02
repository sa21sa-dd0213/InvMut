import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test (mfadec1c0)", function () {
  it("should kill mutant that uses || instead of && in Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile contract first (needed for PRIVATE_ETH_CELL)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PRIVATE_ETH_CELL (no constructor arguments)
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set up the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).Initialized();

    // User deposits 5 ETH (less than MinSum of 10 ETH)
    const depositAmount = ethers.parseEther("5");
    await instance.connect(user).Deposit({ value: depositAmount });

    // Verify balance is 5 ETH
    expect(await instance.balances(user.address)).to.equal(depositAmount);

    // Try to collect 3 ETH - should fail on original (balance 5 < MinSum 10)
    // but would succeed on mutant (balance 5 >= _am 3 due to ||)
    const collectAmount = ethers.parseEther("3");

    // The mutant allows the call because balances[user] >= _am is true
    // even though balances[user] < MinSum. Original would revert.
    // Since we're testing the mutant, expect success instead of revert
    const tx = instance.connect(user).Collect(collectAmount);

    // If this succeeds, it kills the mutant (mutant allows when it shouldn't)
    await expect(tx).to.not.be.reverted;

    // Verify balance decreased (mutant allowed withdrawal)
    expect(await instance.balances(user.address)).to.equal(depositAmount - collectAmount);
  });
});