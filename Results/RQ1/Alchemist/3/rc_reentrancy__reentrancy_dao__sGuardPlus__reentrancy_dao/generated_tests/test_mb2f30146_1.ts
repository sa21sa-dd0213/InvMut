import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should detect that mutant loses 1 wei per deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Deposit exactly 1 ether from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(addr1.address);
    const gasCost = tx.gasPrice * (await ethers.provider.getTransactionReceipt(tx.hash)).gasUsed;

    // On the original contract, addr1 should get back exactly 1 ether minus gas
    // On the mutant, addr1 gets back 1 wei less, so final balance will be 1 wei lower
    const expectedBalance = initialBalance + depositAmount - gasCost;
    expect(finalBalance).to.equal(expectedBalance);
  });
});