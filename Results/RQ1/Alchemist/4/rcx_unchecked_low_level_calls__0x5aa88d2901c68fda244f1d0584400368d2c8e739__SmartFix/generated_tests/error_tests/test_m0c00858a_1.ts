import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m0c00858a test", function () {
  it("should kill mutant by sending non-zero ether to multiplicate when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const fundAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Verify initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Send non-zero ether to multiplicate - this should revert in the mutant
    // because the require condition becomes (balance + msg.value) == balance,
    // which fails when msg.value > 0
    const sendAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: sendAmount })
    ).to.be.reverted;
  });
});