import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mbfd38045", function () {
  it("should detect mutant that changes > to < in withdrawAll condition", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from user
    const depositAmount = ethers.parseEther("1");
    const depositTx = await instance.connect(user).deposit({ value: depositAmount });
    await depositTx.wait();

    // Check user's credit before withdrawal
    const creditBefore = await instance.credit(user.address);
    expect(creditBefore).to.equal(depositAmount);

    // Attempt withdrawal - in mutant, condition oCredit < 0 is always false for uint
    const withdrawTx = await instance.connect(user).withdrawAll();
    await withdrawTx.wait();

    // After withdrawal in original, credit should be 0 and user gets funds.
    // In mutant, withdrawal does nothing because condition never true.
    // Assert that credit is still > 0 (mutant behavior) to kill mutant
    const creditAfter = await instance.credit(user.address);
    expect(creditAfter).to.equal(depositAmount);

    // Also verify contract balance remains unchanged (mutant didn't transfer)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(depositAmount);
  });
});