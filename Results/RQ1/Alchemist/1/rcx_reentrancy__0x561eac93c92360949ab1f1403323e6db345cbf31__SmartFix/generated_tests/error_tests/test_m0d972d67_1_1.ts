import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - m0d972d67", function () {
  it("should detect mutant by verifying successful Collect with LogFile event", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy BANK_SAFE (no constructor args)
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();

    // Initialize contract
    await bankSafe.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await bankSafe.connect(owner).SetLogFile(await logFile.getAddress());
    await bankSafe.connect(owner).Initialized();

    // User deposits 1 ETH
    const depositAmount = ethers.parseEther("1");
    await bankSafe.connect(user).Deposit({ value: depositAmount });

    // Verify balance before Collect
    expect(await bankSafe.balances(user.address)).to.equal(depositAmount);

    // Collect 0.5 ETH (meets MinSum of 0.1)
    const collectAmount = ethers.parseEther("0.5");
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // Execute Collect - in original this succeeds, in mutant it should revert
    const tx = await bankSafe.connect(user).Collect(collectAmount);
    const receipt = await tx.wait();

    // Verify user received ETH
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);

    // Verify contract balance decreased
    expect(await bankSafe.balances(user.address)).to.equal(depositAmount - collectAmount);

    // Verify LogFile has history entry
    const historyLength = await logFile.History.length();
    expect(historyLength).to.be.gt(0);

    // Verify last message is from user with correct amount
    const lastEntry = await logFile.History(historyLength - 1n);
    expect(lastEntry.Sender).to.equal(user.address);
    expect(lastEntry.Val).to.equal(collectAmount);
  });
});