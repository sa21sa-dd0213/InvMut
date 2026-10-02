import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 - Kill mutant mc9495329", function () {
  it("should kill the mutant by verifying the correct transfer amount when msg.value equals contract balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Get initial balances
    const recipientBalanceBefore = await ethers.provider.getBalance(addr2.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call multiplicate with msg.value equal to contract balance (1 ether)
    const txValue = ethers.parseEther("1.0");
    await instance.connect(owner).multiplicate(addr2.address, { value: txValue });

    // Calculate expected transfer: original would transfer (balance + msg.value) = 2 ether
    // Mutant would transfer (balance - msg.value) = 0 ether
    const recipientBalanceAfter = await ethers.provider.getBalance(addr2.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original: recipient receives 2 ether, contract becomes empty
    // In the mutant: recipient receives 0 ether, contract keeps 1 ether
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("2.0"));
    expect(contractBalanceAfter).to.equal(0n);
  });
});