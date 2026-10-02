import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mbfd38045", function () {
  it("should detect mutant where > is replaced with < by verifying withdrawal fails silently", async function () {
    const [owner, depositor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit funds from depositor
    const depositTx = await instance.connect(depositor).deposit({ value: depositAmount });
    await depositTx.wait();

    // Check credit before withdrawal
    const creditBefore = await instance.credit(depositor.address);
    expect(creditBefore).to.equal(depositAmount);

    // Attempt withdrawal - on mutant the if (oCredit < 0) condition is always false
    // so the withdrawal logic never executes
    const withdrawTx = await instance.connect(depositor).withdrawAll();
    await withdrawTx.wait();

    // Check that credit was NOT reduced (mutant fails to execute withdrawal)
    const creditAfter = await instance.credit(depositor.address);
    expect(creditAfter).to.equal(depositAmount);

    // Verify balance remained unchanged in the contract
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(depositAmount);
  });
});