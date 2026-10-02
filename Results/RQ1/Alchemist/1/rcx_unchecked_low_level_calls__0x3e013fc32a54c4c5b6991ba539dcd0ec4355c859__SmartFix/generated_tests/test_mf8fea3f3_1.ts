import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant mf8fea3f3", function () {
  it("should kill mutant by checking contract balance after multiplicate call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 1 ether
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(instanceAddress);
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value equal to current balance
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // In the original contract, balance should be 0 after transfer
    // In the mutant (with subtraction), balance will be > 0
    const finalBalance = await ethers.provider.getBalance(instanceAddress);
    expect(finalBalance).to.equal(0);
  });
});