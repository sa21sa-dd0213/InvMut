import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant kill test", function () {
  it("should revert when calling sendTo with a valid non-zero receiver and positive amount because mutant requires receiver == address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to enable transfers
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to send to a valid non-zero address - should succeed on original but revert on mutant
    const amount = ethers.parseEther("0.1");
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});