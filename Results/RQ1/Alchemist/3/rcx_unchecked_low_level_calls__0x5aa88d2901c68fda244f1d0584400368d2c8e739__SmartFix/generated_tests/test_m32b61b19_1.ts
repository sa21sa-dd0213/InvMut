import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test", function () {
  it("should kill mutant m32b61b19 by verifying contract balance becomes zero after multiplicate call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Call multiplicate with msg.value equal to contract balance
    const callValue = fundAmount;
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: callValue
    });
    await tx.wait();

    // Check that contract balance is exactly zero (original behavior)
    // Mutant would leave 1 wei behind
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(0);
  });
});