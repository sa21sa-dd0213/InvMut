import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m86c4f43a detection", function () {
  it("should detect mutant that adds extra 1 wei to balance on deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1"); // Minimum deposit (1 ether)
    
    // User deposits exactly 1 ether
    const tx = await bank.connect(user).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check balance after deposit - on mutant it will be depositAmount + 1 wei
    const balanceAfterDeposit = await bank.balances(user.address);
    
    // User tries to cash out exactly the deposited amount
    const cashOutTx = bank.connect(user).CashOut(depositAmount);
    
    // On original: cashOut succeeds and balance becomes 0
    // On mutant: cashOut succeeds but balance becomes 1 wei (not 0)
    await expect(cashOutTx).to.not.be.reverted;
    
    const finalBalance = await bank.balances(user.address);
    
    // On original this assertion passes (finalBalance == 0)
    // On mutant this assertion fails (finalBalance == 1 wei), killing the mutant
    expect(finalBalance).to.equal(0);
  });
});