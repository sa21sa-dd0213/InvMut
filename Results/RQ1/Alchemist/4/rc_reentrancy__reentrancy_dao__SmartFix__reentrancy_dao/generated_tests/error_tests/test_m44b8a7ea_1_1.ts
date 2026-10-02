import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea", function () {
  it("should detect the mutant by depositing and then verifying balance integrity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit from addr1
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Withdraw all credit for addr1
    const withdrawTx = await instance.connect(addr1).withdrawAll();
    await withdrawTx.wait();

    // Check the contract's remaining balance
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // In the original, the balance should be 0. In the mutant, balance will be 1 wei (from the msg.value+1)
    expect(contractBalance).to.equal(0);
  });
});