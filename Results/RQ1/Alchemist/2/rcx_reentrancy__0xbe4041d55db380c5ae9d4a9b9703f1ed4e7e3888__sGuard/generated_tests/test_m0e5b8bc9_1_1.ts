import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m0e5b8bc9 detection", function () {
  it("should detect mutant by checking LogFile Val against msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy Log contract (no constructor arguments)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Set the LogFile address
    await moneyBox.connect(owner).SetLogFile(await log.getAddress());

    // Initialize the contract
    await moneyBox.connect(owner).Initialized();

    // Set MinSum to 0 so Collect works
    await moneyBox.connect(owner).SetMinSum(0);

    // Send exactly 100 wei to Put
    const putAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await moneyBox.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();

    // Read the last entry from LogFile's History
    const historyLength = await log.History.length;
    const lastEntry = await log.History(historyLength - 1n);

    // The Val field should equal the exact amount sent (100 wei)
    // Mutant would log 101 wei instead
    expect(lastEntry.Val).to.equal(putAmount);
  });
});