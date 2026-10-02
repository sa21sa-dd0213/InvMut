import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant m72f51d85 by detecting balance inconsistency", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check contract's actual ETH balance
    const contractBalanceAfterDeposit = await ethers.provider.getBalance(instance.target);

    // Withdraw all funds for addr1
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Check contract's actual ETH balance after withdrawal
    const contractBalanceAfterWithdrawal = await ethers.provider.getBalance(instance.target);

    // In the original contract, after deposit and full withdrawal, balance should be 0
    // In the mutant, balance variable is inflated by 1 wei but actual ETH is correct
    // This test asserts that the actual ETH balance matches expectations
    expect(contractBalanceAfterWithdrawal).to.equal(0);
  });
});