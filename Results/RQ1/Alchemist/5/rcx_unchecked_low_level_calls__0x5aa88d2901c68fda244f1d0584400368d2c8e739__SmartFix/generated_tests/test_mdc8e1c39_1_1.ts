import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - mdc8e1c39", function () {
  it("should detect the mutant by sending msg.value one wei less than contract balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Send msg.value = contractBalance - 1 wei
    const msgValue = contractBalanceBefore - 1n;

    // Call multiplicate with exactly one wei less than contract balance
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: msgValue });

    // Wait for the transaction to complete
    await tx;

    // Original would NOT transfer (condition false), mutant would transfer (condition true)
    // The test expects no transfer - if mutant transfers, balance changes and test fails
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);
  });
});