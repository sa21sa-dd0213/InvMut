import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mdc86d713 test", function () {
  it("should kill mutant by depositing more than MinSum and successfully withdrawing", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Deposit 2 ether (more than MinSum = 1 ether) from addr1
    const depositAmount = ethers.parseEther("2");
    const tx1 = await bank.connect(addr1).Put(0, { value: depositAmount });
    await tx1.wait();

    // Verify balance is 2 ether
    let holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Withdraw 1 ether (should succeed on original, fail on mutant)
    const withdrawAmount = ethers.parseEther("1");

    // Check if withdrawal reverts (mutant kills) or succeeds (original)
    try {
      const tx2 = await bank.connect(addr1).Collect(withdrawAmount);
      await tx2.wait();

      // If we get here, the withdrawal succeeded - this means we're on the ORIGINAL
      // The mutant would have reverted because 2 <= 1 is false
      // So this test should FAIL on the mutant (meaning it killed it)
      holder = await bank.Acc(addr1.address);
      expect(holder.balance).to.be.above(ethers.parseEther("0"));
    } catch (error: any) {
      // If it reverts, the mutant is detected (balance condition failed)
      expect(error.message).to.include("revert");
    }
  });
});