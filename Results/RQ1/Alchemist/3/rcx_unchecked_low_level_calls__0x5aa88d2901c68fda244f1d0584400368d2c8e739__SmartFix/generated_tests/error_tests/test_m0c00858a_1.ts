import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m0c00858a by calling multiplicate with non-zero msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Now call multiplicate with a non-zero msg.value
    // This should pass on original (>= check) but revert on mutant (== check)
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});