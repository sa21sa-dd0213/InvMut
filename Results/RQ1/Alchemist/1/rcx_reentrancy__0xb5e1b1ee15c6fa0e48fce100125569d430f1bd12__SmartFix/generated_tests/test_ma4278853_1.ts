import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant kill test - ma4278853", function () {
  it("should reject deposit when msg.value is exactly equal to MinDeposit (not greater than)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by Private_Bank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log contract address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const minDeposit = await bank.MinDeposit();
    
    // Attempt to deposit exactly the minimum deposit amount (should not be greater than)
    await expect(
      addr1.sendTransaction({
        to: await bank.getAddress(),
        value: minDeposit
      })
    ).to.not.be.reverted;
    
    // Verify that the balance was NOT updated (deposit should not have gone through)
    const balance = await bank.balances(addr1.address);
    expect(balance).to.equal(0);
    
    // Also verify that no deposit message was logged in the Log contract
    const historyLength = await log.History.length;
    expect(historyLength).to.equal(0);
  });
});