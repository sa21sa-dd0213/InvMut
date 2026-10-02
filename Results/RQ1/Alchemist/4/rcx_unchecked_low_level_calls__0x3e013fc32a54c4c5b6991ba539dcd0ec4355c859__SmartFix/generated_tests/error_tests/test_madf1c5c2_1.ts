import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant madf1c5c2", function () {
  it("should revert when calling multiplicate with msg.value=0 while contract has balance (mutant changes + to *)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so balance > 0
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value = 0 (which should NOT revert on original, but WILL revert on mutant)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});