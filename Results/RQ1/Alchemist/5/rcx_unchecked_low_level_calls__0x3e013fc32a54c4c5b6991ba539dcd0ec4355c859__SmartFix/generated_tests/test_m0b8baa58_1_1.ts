import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant m0b8baa58 by calling multiplicate with zero value when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value = 0 (should pass on original, fail on mutant)
    // The mutant's require check: (address(this).balance + msg.value) > address(this).balance
    // With msg.value = 0, this becomes: balance > balance, which is false -> revert
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});