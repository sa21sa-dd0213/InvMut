import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m81748591 by depositing exactly 1 wei and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const tx = await instance.connect(addr1).deposit({ value: 1 });
    await tx.wait();

    // Verify the balance was updated correctly
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(1);
  });
});