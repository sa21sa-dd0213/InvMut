import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6)", function () {
  it("should detect mutant m9dd7fe1f by sending 0 value when contract balance is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH to satisfy the msg.value >= address(this).balance condition
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now call multiplicate with msg.value equal to contract balance (1 ETH)
    // Original: require(balance + msg.value >= balance) always passes
    // Mutant: require(balance + msg.value - 1 >= balance) => require(1 + 1 - 1 >= 1) => require(1 >= 1) passes
    // But if we call with msg.value = 0 and balance = 0:
    // Original: require(0 + 0 >= 0) passes
    // Mutant: require(0 + 0 - 1 >= 0) => require(-1 >= 0) reverts

    // First drain the contract to make balance = 0
    await instance.connect(owner).withdraw();

    // Now contract balance is 0, call multiplicate with msg.value = 0
    // This should revert on the mutant but pass on the original
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});