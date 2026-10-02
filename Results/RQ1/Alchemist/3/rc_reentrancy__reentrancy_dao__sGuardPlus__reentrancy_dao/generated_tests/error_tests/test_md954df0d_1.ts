import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - md954df0d", function () {
  it("should detect mutant where > is replaced with < in withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialUserBalance = await ethers.provider.getBalance(addr1.address);

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check credit after deposit
    const creditAfterDeposit = await instance.credit(addr1.address);
    expect(creditAfterDeposit).to.equal(depositAmount);

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Check credit is reset to 0 after withdrawal
    const creditAfterWithdraw = await instance.credit(addr1.address);
    
    // In the original contract, credit should be 0 after successful withdrawal.
    // In the mutant (with < instead of >), the withdrawal never executes,
    // so credit remains equal to depositAmount. This assertion kills the mutant.
    expect(creditAfterWithdraw).to.equal(0);
    
    // Verify addr1 received the funds
    const finalUserBalance = await ethers.provider.getBalance(addr1.address);
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    
    // Original: contract balance decreases, user balance increases
    // Mutant: contract balance unchanged, user balance unchanged (except gas)
    expect(finalContractBalance).to.equal(initialContractBalance);
    expect(finalUserBalance).to.be.gt(initialUserBalance);
  });
});