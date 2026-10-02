import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test - m599cb685", function () {
  it("should revert when user with insufficient balance tries to collect, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DEP_BANK (no constructor arguments needed)
    const DEP_BANK_Factory = await ethers.getContractFactory("DEP_BANK");
    const bank = await DEP_BANK_Factory.deploy();
    await bank.waitForDeployment();

    // Deploy LogFile (no constructor arguments needed)
    const LogFile_Factory = await ethers.getContractFactory("LogFile");
    const log = await LogFile_Factory.deploy();
    await log.waitForDeployment();

    // Initialize the bank
    await bank.connect(owner).SetLogFile(await log.getAddress());
    await bank.connect(owner).SetMinSum(ethers.parseEther("10"));
    await bank.connect(owner).Initialized();

    // Deposit exactly 5 ETH for addr1 (less than MinSum of 10)
    await bank.connect(addr1).deposit({ value: ethers.parseEther("5") });

    // Verify balance is 5 ETH
    expect(await bank.balances(addr1.address)).to.equal(ethers.parseEther("5"));

    // Attempt to collect 5 ETH - should revert in original (balance < MinSum)
    // but mutant will allow it (condition replaced with true)
    const tx = bank.connect(addr1).collect(ethers.parseEther("5"));

    // In the original contract, this would revert.
    // The mutant allows it, so we expect the transaction to succeed (killing the mutant)
    await expect(tx).to.not.be.reverted;

    // Verify the balance was incorrectly reduced
    expect(await bank.balances(addr1.address)).to.equal(0);
  });
});