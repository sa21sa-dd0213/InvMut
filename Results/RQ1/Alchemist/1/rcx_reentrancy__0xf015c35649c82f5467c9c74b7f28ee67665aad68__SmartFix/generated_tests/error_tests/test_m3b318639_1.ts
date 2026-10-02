import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant m3b318639 (msg.value+1 in Put log)", function () {
  let bank: any;
  let log: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
  });

  it("should detect mutant by verifying logged value equals actual sent amount", async function () {
    const depositAmount = ethers.parseEther("1");
    
    // Call Put function with 1 ETH
    const tx = await bank.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();

    // Get the last entry from Log's History
    const historyLength = await log.History.length;
    const lastEntry = await log.History(historyLength - 1n);
    
    // In the original: logged value equals msg.value (depositAmount)
    // In the mutant: logged value equals msg.value + 1 (depositAmount + 1 wei)
    // Assert that logged value matches the actual sent amount
    expect(lastEntry.Val).to.equal(depositAmount);
  });
});